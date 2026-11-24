# 🧭 CareerCompass AI

**CareerCompass AI** is a full-stack web application that helps tech professionals align their resumes with modern industry demands. Powered by Google's **Gemini 2.5 Flash** model via a **secure serverless backend**, it parses resumes, compares them against target roles or job descriptions, and generates actionable, personalized learning plans.

> [!IMPORTANT]
> The API key is now a **server-side secret only**. It is stored in `GEMINI_API_KEY` (never `VITE_GEMINI_API_KEY`) and is never bundled into the frontend build or visible in the browser's Network tab.

---

## ⚠️ Problem Statement

Job seekers in the modern tech market face significant hurdles in landing interviews:
1. **The Black Box of ATS:** Applicant Tracking Systems filter out up to 75% of resumes automatically.
2. **Rapidly Evolving Tech Stacks:** Candidates struggle to identify critical skill gaps relative to active market demand.
3. **Lack of Actionable Roadmaps:** Knowing a skill is missing is only half the battle.

---

## 🔐 Secure Architecture

All Gemini API calls now flow through **Vercel serverless functions** (`/api`). The frontend never contacts Google's API directly.

```
Browser (React)
     │
     │  POST /api/analyze-resume     (image + role)
     │  POST /api/match-jd           (analysis + JD text)
     │  POST /api/generate-sprint    (analysis)
     │  POST /api/evaluate-interview (question + answer)
     ▼
Vercel Serverless Functions (/api/*.js)
     │  reads GEMINI_API_KEY from server env — never exposed
     ▼
Google Gemini 2.5 Flash API
```

**Security measures in every API route:**
- Server-side `GEMINI_API_KEY` only — no `VITE_` prefix, never in the bundle
- In-memory sliding-window **rate limiting** (30 req/min per IP)
- **Input validation** and size limits on all fields
- **Sanitized error messages** — raw API errors / keys are never forwarded to the client
- Security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Cache-Control: no-store`)
- Method enforcement (all routes accept `POST` only)

---

## 🤖 AI Agent Workflow

| Agent | Serverless Route | Responsibility |
|---|---|---|
| **Agent Core** (Profiling) | `POST /api/analyze-resume` | Parses resume image, scores market alignment |
| **Agent Matcher** (ATS) | `POST /api/match-jd` | Compares profile to a job description |
| **Agent Reviewer** (Coach) | `POST /api/generate-sprint` | Builds 30-60-90 day skill sprint plan |
| **Mock Interviewer** | `POST /api/evaluate-interview` | Evaluates candidate's interview answers |

---

## ✨ Features

- **🔍 AI Resume Audit & Alignment** – Upload resume image → live market score, skill gaps, recruiter feedback
- **📊 30-60-90 Day Sprint Roadmap** – Week-by-week learning plan generated from your skill gaps
- **⚡ Job Description Matcher** – ATS score, keyword analysis, and resume tweak suggestions
- **🎤 Adaptive Mock Interview** – Tailored questions + live AI feedback on your answers
- **💾 Local Persistence** – Analysis, sprint plan, and applied jobs cached in `localStorage`
- **⚠️ Active Audit Protection** – Modal prevents accidental navigation during an active session

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Backend | Vercel Serverless Functions (Node.js) |
| AI Engine | Google Gemini 2.5 Flash (`@google/generative-ai`) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### Installation

```bash
git clone <your-repo-url>
cd capstone
npm install
```

### Environment Variables

Create a `.env` file in the project root (this file is git-ignored):

```env
# Server-only — NEVER prefix with VITE_
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free key from [Google AI Studio](https://aistudio.google.com/).

> [!WARNING]
> **Never** use `VITE_GEMINI_API_KEY`. Anything prefixed `VITE_` is embedded in the client bundle and visible to anyone who opens DevTools.

### Running Locally

The local setup requires **two terminals** running simultaneously:

**Terminal 1 — Vercel dev server** (runs the serverless `/api` functions and reads `.env`):
```bash
vercel dev --listen 3000
```

**Terminal 2 — Vite dev server** (serves the React app, proxies `/api` → `localhost:3000`):
```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

> [!NOTE]
> `vite.config.js` is pre-configured to proxy all `/api/*` requests from port 5173 to port 3000, so the browser never talks to Gemini directly even during development.

---

## 📦 Vercel Deployment

### Step 1 — Link to Vercel
```bash
vercel
```
Follow the prompts to connect your project.

### Step 2 — Set the Environment Variable
In the [Vercel Dashboard](https://vercel.com/dashboard):

1. Open your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your Gemini API key
   - **Environments:** Production, Preview, Development ✓
3. Click **Save**

> [!CAUTION]
> Do **not** add `VITE_GEMINI_API_KEY` to Vercel. Only add `GEMINI_API_KEY` (no VITE prefix). The former would be baked into your public JavaScript bundle.

### Step 3 — Deploy
```bash
vercel --prod
```

Vercel automatically detects the `api/` folder and deploys each `.js` file as an independent serverless function.

---

## 📁 Project Structure

```
capstone/
├── api/                        # ← Vercel serverless functions (server-side only)
│   ├── _utils.js               #   Shared: Gemini client, rate limiter, error handler
│   ├── analyze-resume.js       #   POST /api/analyze-resume
│   ├── match-jd.js             #   POST /api/match-jd
│   ├── generate-sprint.js      #   POST /api/generate-sprint
│   └── evaluate-interview.js   #   POST /api/evaluate-interview
├── src/
│   ├── utils/
│   │   ├── api.js              # ← Frontend HTTP client (calls /api, NO key here)
│   │   └── gemini.js           #   Re-export shim (backward compat)
│   ├── components/
│   │   ├── ResumeUpload.jsx
│   │   └── Navbar.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   └── LandingPage.jsx
│   └── ...
├── .env                        # Local secrets (git-ignored)
├── .env.example                # Template — commit this, not .env
├── vercel.json                 # Vercel project config
└── vite.config.js              # Vite + /api proxy for local dev
```

---

## 🔑 Required Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GEMINI_API_KEY` | Vercel Dashboard + `.env` | Google Gemini API key. **Server-only. Never VITE_ prefix.** |

---

## 🛡️ Security Checklist

- [x] API key is never in `src/` or any file Vite bundles
- [x] No `VITE_GEMINI_API_KEY` anywhere in the codebase
- [x] Direct calls to `generativelanguage.googleapis.com` removed from frontend
- [x] Rate limiting on every endpoint (30 req/min per IP)
- [x] Input validation and size limits on all API routes
- [x] Error messages sanitized — no internal paths or key values forwarded
- [x] `.env` is git-ignored; `.vercel/` is git-ignored

---

## 🛡️ License
This project is open-source and available under the [MIT License](LICENSE).
