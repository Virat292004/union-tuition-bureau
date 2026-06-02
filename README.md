# Union Tuition Bureau Website

Responsive single-page website for a home tuition service in Varanasi.

## Add contact details

Open `script.js` and update the first lines:

```js
const BUSINESS = {
  phone: "+91XXXXXXXXXX",
  email: "yourname@example.com",
  whatsapp: "91XXXXXXXXXX",
};
```

Use the country code for WhatsApp without spaces. For example: `919876543210`.

## Preview locally

Run the website server:

```powershell
$env:ADMIN_PASSWORD="choose-a-private-password"
node server.js
```

Then visit `http://localhost:8000`.

## Admin dashboard

Visit `http://localhost:8000/admin.html` and enter the password used when starting the server.

Student enquiries and teacher applications are stored locally in `data/submissions.json`.

The admin can view, edit, and delete saved submissions.

## Deploy on Render

The included `render.yaml` Blueprint creates:

- A Node.js web service
- A managed Render Postgres database
- A generated `ADMIN_PASSWORD`
- A private `DATABASE_URL` connection between the website and database

Create a Git repository, push it to GitHub, and create a new Render Blueprint from that repository.
Render provides the public `onrender.com` URL after deployment.

Render's free Postgres database expires after 30 days. Select a paid database plan for a permanent business website.
