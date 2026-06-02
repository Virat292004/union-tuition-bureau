const loginCard = document.querySelector("#login-card");
const dashboard = document.querySelector("#dashboard");
const loginNote = document.querySelector("#login-note");
const tableHead = document.querySelector("#table-head");
const tableBody = document.querySelector("#table-body");
const emptyState = document.querySelector("#empty-state");
const editModal = document.querySelector("#edit-modal");
const editFields = document.querySelector("#edit-fields");
const editNote = document.querySelector("#edit-note");
let password = "";
let submissions = [];
let selectedFilter = "all";
let editingId = "";

const studentColumns = [
  ["Date", "createdAt"], ["Name", "name"], ["Phone", "phone"], ["Locality", "locality"],
  ["Class", "studentClass"], ["Board", "board"], ["Subject", "subject"],
];
const teacherColumns = [
  ["Date", "createdAt"], ["Name", "name"], ["Phone", "phone"], ["Locality", "locality"],
  ["Qualification", "qualification"], ["Experience", "experience"], ["Classes", "classes"], ["Subjects", "subjects"],
];

const formatValue = (key, value) => key === "createdAt" ? new Date(value).toLocaleString() : value;
const appendCell = (row, value, className = "") => {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (className) cell.className = className;
  row.append(cell);
};

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { "x-admin-password": password, ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to complete the request.");
  return result;
};

const createActionButton = (label, className, onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action ${className}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
};

const openEditModal = (submission) => {
  editingId = submission.id;
  editNote.textContent = "";
  editFields.innerHTML = "";
  const columns = submission.type === "teacher" ? teacherColumns : studentColumns;
  columns.filter(([, key]) => key !== "createdAt").forEach(([label, key]) => {
    const fieldLabel = document.createElement("label");
    fieldLabel.textContent = label;
    const input = document.createElement("input");
    input.name = key;
    input.value = submission[key] || "";
    input.required = true;
    fieldLabel.append(input);
    editFields.append(fieldLabel);
  });
  editModal.classList.remove("hidden");
};

const deleteSubmission = async (submission) => {
  if (!window.confirm(`Delete ${submission.name}'s ${submission.type} submission?`)) return;
  await apiRequest(`/api/submissions/${submission.id}`, { method: "DELETE" });
  await loadSubmissions();
};

const render = () => {
  const filtered = submissions.filter((item) => selectedFilter === "all" || item.type === selectedFilter);
  const columns = selectedFilter === "teacher" ? teacherColumns : selectedFilter === "student" ? studentColumns : [
    ["Date", "createdAt"], ["Type", "type"], ["Name", "name"], ["Phone", "phone"], ["Locality", "locality"], ["Details", "details"],
  ];
  columns.push(["Actions", "actions"]);
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  const headerRow = document.createElement("tr");
  columns.forEach(([label]) => {
    const header = document.createElement("th");
    header.textContent = label;
    headerRow.append(header);
  });
  tableHead.append(headerRow);

  filtered.forEach((submission) => {
    const row = document.createElement("tr");
    columns.forEach(([, key]) => {
      if (key === "actions") {
        const cell = document.createElement("td");
        cell.className = "actions";
        cell.append(
          createActionButton("Edit", "", () => openEditModal(submission)),
          createActionButton("Delete", "delete-action", () => deleteSubmission(submission).catch(window.alert)),
        );
        row.append(cell);
      } else if (key === "details") {
        appendCell(row, submission.type === "teacher"
          ? `${submission.qualification}; ${submission.experience}; ${submission.classes}; ${submission.subjects}`
          : `${submission.studentClass}; ${submission.board}; ${submission.subject}`);
      } else {
        appendCell(row, formatValue(key, submission[key]), key === "type" ? `type ${submission.type}` : "");
      }
    });
    tableBody.append(row);
  });
  emptyState.classList.toggle("hidden", filtered.length !== 0);
  document.querySelector("#total-count").textContent = submissions.length;
  document.querySelector("#student-count").textContent = submissions.filter((item) => item.type === "student").length;
  document.querySelector("#teacher-count").textContent = submissions.filter((item) => item.type === "teacher").length;
};

const loadSubmissions = async () => {
  submissions = (await apiRequest("/api/submissions")).submissions;
  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  render();
};

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  password = document.querySelector("#admin-password").value;
  loginNote.textContent = "Checking password...";
  try {
    await loadSubmissions();
    loginNote.textContent = "";
  } catch (error) {
    loginNote.textContent = error.message;
  }
});

document.querySelector("#refresh-button").addEventListener("click", loadSubmissions);
document.querySelector("#close-modal").addEventListener("click", () => editModal.classList.add("hidden"));
document.querySelector("#edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  editNote.textContent = "Saving changes...";
  try {
    await apiRequest(`/api/submissions/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    editModal.classList.add("hidden");
    await loadSubmissions();
  } catch (error) {
    editNote.textContent = error.message;
  }
});
document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    selectedFilter = button.dataset.filter;
    render();
  });
});
