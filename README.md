# AI Budget Tracker

A beginner-friendly full-stack app: upload a receipt image, **Google Gemini** (via `@google/genai`) extracts shop, amount, date, and category, saves everything in **MongoDB**, and shows a short **AI spending summary** at the top.

## Folder structure

```
expensetracker/
├── README.md
├── vercel.json             # Vercel deployment config
├── package.json            # Root deps for serverless API
├── api/
│   └── index.js            # Vercel serverless entry
├── client/                 # React (Vite) frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── api.js
│       └── components/
│           ├── Navbar.jsx
│           ├── SummaryCard.jsx
│           ├── UploadForm.jsx
│           ├── ExpenseList.jsx
│           └── ExpenseCard.jsx
└── server/                 # Express API (local dev + Vercel)
    ├── package.json
    ├── index.js            # Local dev server
    ├── app.js              # Express app
    ├── db.js               # MongoDB connection (cached for serverless)
    ├── models/
    │   └── Expense.js
    └── services/
        └── gemini.js
```

## Prerequisites

- **Node.js 20+** (required by `@google/genai`)
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string
- A **Google AI Studio** API key: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Local development

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` + `GOOGLE_API_KEY`.

2. **Terminal 1 — API:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Terminal 2 — UI:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to `http://localhost:5000`.

### API routes

| Method | Path (local) | Path (Vercel) |
|--------|--------------|---------------|
| `GET` | `/health` | `/api/health` |
| `POST` | `/upload` | `/api/upload` |
| `GET` | `/expenses` | `/api/expenses` |
| `DELETE` | `/expenses/:id` | `/api/expenses/:id` |
| `GET` | `/insights` | `/api/insights` |

## Deploy on Vercel

The repo is configured for a **single Vercel project** (React frontend + Express API as serverless functions).

### 1. Push to GitHub

Commit and push this folder to a GitHub repository.

### 2. Create a Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
2. **Root Directory:** leave as `.` (project root).
3. Vercel reads `vercel.json` automatically — no extra build settings needed.

### 3. Environment variables

**Option A — Import file (easiest)**

1. Open `.env.vercel` in the project root (or copy from `.env.vercel.example`).
2. Replace placeholders with your real **MongoDB Atlas URI** and **Gemini API key**.
3. In Vercel: **Settings → Environment Variables → Import .env**
4. Select `.env.vercel` and apply to **Production**, **Preview**, and **Development**.

**Option B — Manual**

| Name | Value | Required |
|------|--------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `GOOGLE_API_KEY` | Gemini API key from [AI Studio](https://aistudio.google.com/apikey) | Yes |
| `GEMINI_MODEL` | e.g. `gemini-2.5-flash` | No |

**Local development:** copy `.env.local.example` → `server/.env` and fill in the same keys.

Use **MongoDB Atlas** (not local MongoDB) for production. In Atlas → Network Access, allow `0.0.0.0/0` so Vercel can connect.

### 4. Deploy

Click **Deploy**. Your app will be live at `https://your-project.vercel.app`.

- Frontend: `https://your-project.vercel.app`
- API: `https://your-project.vercel.app/api/expenses`, `/api/upload`, etc.

### CLI alternative

```bash
npm i -g vercel
cd expensetracker
vercel
```

Follow prompts, then add env vars in the Vercel dashboard and redeploy.

## How it works (short)

1. **Upload** — `multer` reads the image in memory; the image is saved as a **base64 data URL** in MongoDB (works on Vercel serverless).
2. **Gemini** — The buffer is sent as inline base64 with a prompt for JSON (shop, amount, date, category, summary).
3. **Insights** — `GET /api/insights` sends stored expenses to Gemini for trend text in **SummaryCard**.

## Troubleshooting

- **“Missing API key”** — Add `GOOGLE_API_KEY` in `server/.env` (local) or Vercel Environment Variables (production).
- **Mongo connection errors** — Local: ensure MongoDB is running. Vercel: use Atlas and allow `0.0.0.0/0` in Network Access.
- **Model not found** — Try another model in `GEMINI_MODEL` (e.g. `gemini-2.0-flash`) per [Google’s model list](https://ai.google.dev/gemini-api/docs/models/gemini).
- **CORS** — If the client uses a different origin, set `CLIENT_ORIGIN` on the server.

## Security note

Keep API keys **only on the server**. This project does not use authentication; use it for learning and local demos, not public production without adding auth and hardening.
