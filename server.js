const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 8000);
const root = __dirname;
const dataDirectory = path.join(root, "data");
const submissionsFile = path.join(dataDirectory, "submissions.json");
const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";
const databaseUrl = process.env.DATABASE_URL;
let pool;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

const sendJson = (response, statusCode, data) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
};

const readLocalSubmissions = () => {
  try {
    return JSON.parse(fs.readFileSync(submissionsFile, "utf8"));
  } catch (error) {
    return [];
  }
};

const writeLocalSubmissions = (submissions) => {
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));
};

const initializeStorage = async () => {
  if (!databaseUrl) return;
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ,
      details JSONB NOT NULL
    )
  `);
};

const readSubmissions = async () => {
  if (!pool) return readLocalSubmissions();
  const result = await pool.query("SELECT id, type, created_at, updated_at, details FROM submissions ORDER BY created_at DESC");
  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    ...row.details,
  }));
};

const createSubmission = async (record) => {
  if (!pool) {
    const submissions = readLocalSubmissions();
    submissions.unshift(record);
    writeLocalSubmissions(submissions);
    return;
  }
  const { id, type, createdAt, ...details } = record;
  await pool.query(
    "INSERT INTO submissions (id, type, created_at, details) VALUES ($1, $2, $3, $4)",
    [id, type, createdAt, details],
  );
};

const updateSubmission = async (id, details) => {
  if (!pool) {
    const submissions = readLocalSubmissions();
    const index = submissions.findIndex((submission) => submission.id === id);
    if (index === -1) return false;
    submissions[index] = { ...submissions[index], ...details, updatedAt: new Date().toISOString() };
    writeLocalSubmissions(submissions);
    return true;
  }
  const result = await pool.query(
    "UPDATE submissions SET details = details || $1::jsonb, updated_at = NOW() WHERE id = $2",
    [JSON.stringify(details), id],
  );
  return result.rowCount !== 0;
};

const deleteSubmission = async (id) => {
  if (!pool) {
    const submissions = readLocalSubmissions();
    const remaining = submissions.filter((submission) => submission.id !== id);
    if (remaining.length === submissions.length) return false;
    writeLocalSubmissions(remaining);
    return true;
  }
  const result = await pool.query("DELETE FROM submissions WHERE id = $1", [id]);
  return result.rowCount !== 0;
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) request.destroy();
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

const cleanValue = (value) => String(value || "").trim().slice(0, 300);
const requiredFields = {
  student: ["name", "phone", "locality", "studentClass", "board", "subject"],
  teacher: ["name", "phone", "locality", "qualification", "experience", "classes", "subjects"],
};
const hasAdminAccess = (request) => request.headers["x-admin-password"] === adminPassword;

initializeStorage()
  .then(() => http
  .createServer(async (request, response) => {
    if (request.url === "/api/submissions" && request.method === "POST") {
      try {
        const submission = await readJsonBody(request);
        const type = submission.type === "teacher" ? "teacher" : "student";
        const fields = requiredFields[type];
        const details = Object.fromEntries(fields.map((field) => [field, cleanValue(submission[field])]));
        if (fields.some((field) => !details[field])) {
          sendJson(response, 400, { error: "Please complete all required fields." });
          return;
        }

        const record = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          createdAt: new Date().toISOString(),
          ...details,
        };
        await createSubmission(record);
        sendJson(response, 201, { message: "Submission saved.", id: record.id });
      } catch (error) {
        sendJson(response, 400, { error: "Unable to save submission." });
      }
      return;
    }

    if (request.url === "/api/submissions" && request.method === "GET") {
      if (!hasAdminAccess(request)) {
        sendJson(response, 401, { error: "Incorrect admin password." });
        return;
      }
      sendJson(response, 200, { submissions: await readSubmissions() });
      return;
    }

    const submissionMatch = request.url.match(/^\/api\/submissions\/([a-zA-Z0-9-]+)$/);
    if (submissionMatch && request.method === "PUT") {
      if (!hasAdminAccess(request)) {
        sendJson(response, 401, { error: "Incorrect admin password." });
        return;
      }
      try {
        const updates = await readJsonBody(request);
        const submissions = await readSubmissions();
        const index = submissions.findIndex((submission) => submission.id === submissionMatch[1]);
        if (index === -1) {
          sendJson(response, 404, { error: "Submission not found." });
          return;
        }
        const current = submissions[index];
        const fields = requiredFields[current.type];
        const details = Object.fromEntries(fields.map((field) => [field, cleanValue(updates[field])]));
        if (fields.some((field) => !details[field])) {
          sendJson(response, 400, { error: "Please complete all required fields." });
          return;
        }
        await updateSubmission(current.id, details);
        sendJson(response, 200, { message: "Submission updated." });
      } catch (error) {
        sendJson(response, 400, { error: "Unable to update submission." });
      }
      return;
    }

    if (submissionMatch && request.method === "DELETE") {
      if (!hasAdminAccess(request)) {
        sendJson(response, 401, { error: "Incorrect admin password." });
        return;
      }
      if (!(await deleteSubmission(submissionMatch[1]))) {
        sendJson(response, 404, { error: "Submission not found." });
        return;
      }
      sendJson(response, 200, { message: "Submission deleted." });
      return;
    }

    const requestedPath = request.url === "/" ? "index.html" : request.url.split("?")[0].slice(1);
    const filePath = path.join(root, requestedPath);

    if (!filePath.startsWith(root) || filePath.startsWith(dataDirectory)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      });
      response.end(content);
    });
  })
  .listen(port, () => {
    console.log(`Union Tuition Bureau preview: http://localhost:${port}`);
    console.log(`Admin dashboard: http://localhost:${port}/admin.html`);
  }))
  .catch((error) => {
    console.error("Unable to initialize storage:", error.message);
    process.exit(1);
  });
