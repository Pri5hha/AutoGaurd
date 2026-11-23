# AutoGuard

Audit Intelligence. Zero Tolerance.

AutoGuard is a full-stack admissions anomaly auditing platform with:
- Rule-based anomaly detection
- ML scoring (Isolation Forest + TensorFlow autoencoder)
- D3 fraud network graph with cluster hulls
- Real-time collaborative audit room (Socket.io): presence, live cursors, comments, verdict voting
- Conversational natural language query layer (rule-based parser)
- Hash-chained, blockchain-style audit trail (stored in MongoDB)
- Document fingerprinting (SHA-256 / MD5) and simulated government verification bridges
- Anonymous whistleblower tip intake
- PDF applicant reports and legal memo generation (Puppeteer)
- Email (SMTP) and SMS (Twilio) critical alerts

## Stack

- Frontend: React 18 + Vite + React Router + Recharts + D3 + Framer Motion + Socket.io client, styled with CSS variables (`client/src/styles/theme.css`)
- Backend: Node.js + Express + MongoDB/Mongoose + Socket.io + Puppeteer + Nodemailer + Twilio
- ML service: Flask + scikit-learn + TensorFlow

## Project Structure

```
AutoGaurd/
├── client/        React + Vite frontend (pages, components, contexts, services/api.js)
├── server/        Express API (routes, controllers, services, models, sockets, scripts)
└── ml-service/    Flask ML scoring service (app.py, models/)
```

## RBAC Roles

- `system-admin`
- `senior-auditor`
- `auditor`
- `analyst`
- `read-only`

Legacy role names (`super-admin`, `chief-auditor`, `field-auditor`, `department-head`, `whistleblower`) are mapped automatically to the roles above.

## Setup

1. From repo root, create the env file:
```powershell
cd "c:\Users\Prishha\OneDrive\Desktop\AutoGaurd"
Copy-Item "server\.env.example" "server\.env" -Force
```

2. Generate JWT secrets and paste them into `server\.env`:
```powershell
node server\scripts\generate-secrets.js
```

3. Install dependencies:
```powershell
npm install
npm --prefix server install
npm --prefix client install
```

4. Python env for ML:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ml-service\requirements.txt
```

5. Ensure MongoDB is running:
- `mongodb://127.0.0.1:27017/autogaurd`

## Environment Variables (`server/.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port (default `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets (use `generate-secrets.js`) |
| `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | Token lifetimes (default `15m` / `7d`) |
| `LOG_GET_REQUESTS` | `true` to also record GET requests in the session audit log |
| `ML_SERVICE_URL` | Flask ML service URL (default `http://127.0.0.1:5001`) |
| `CLIENT_URL` / `CLIENT_URLS` | Allowed CORS origin(s); `CLIENT_URLS` is comma-separated |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ALERT_FROM` | Email alerts (optional; skipped if unset) |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | SMS alerts (optional; skipped if unset) |
| `GEMINI_API_KEY`, `ETH_*` | Reserved for future use; not read by the code yet |

Never commit `server/.env`. Keep real credentials out of `.env.example`.

## Run

Open 3 terminals.

Terminal 1 (ML):
```powershell
cd "c:\Users\Prishha\OneDrive\Desktop\AutoGaurd"
.\.venv\Scripts\Activate.ps1
python ml-service\app.py
```
On first start the service trains on synthetic data and saves models to `ml-service/models/`.

Terminal 2 (Backend):
```powershell
cd "c:\Users\Prishha\OneDrive\Desktop\AutoGaurd"
npm run dev:server
```

Terminal 3 (Frontend):
```powershell
cd "c:\Users\Prishha\OneDrive\Desktop\AutoGaurd"
npm run dev:client
```

Open:
- Frontend: `http://localhost:5173` (Vite proxies `/api` and `/socket.io` to the backend)
- Backend health: `http://localhost:5000/health`
- ML health: `http://127.0.0.1:5001/health`

Other scripts: `npm run start:server` (production start), `npm run build:client` (build frontend to `client/dist`).

## Seed Data (500 applicants)

```powershell
npm run seed
```

Seed includes:
- 500 applicants
- 8-15% anomaly prevalence per category (12% target)
- all rule anomaly types
- 3 seeded fraud clusters (shared device fingerprints and document hashes)
- the default users below

## Default Users

All passwords: `Password@123`

- `admin@autoguard.local` (`system-admin`)
- `senior@autoguard.local` (`senior-auditor`)
- `auditor@autoguard.local` (`auditor`)
- `analyst@autoguard.local` (`analyst`)
- `readonly@autoguard.local` (`read-only`)

## Frontend Pages

`/login`, `/` (Dashboard), `/applicants`, `/applicants/:id`, `/alerts`, `/cases`, `/network`, `/audit-room`, `/reports`, `/audit-logs`, `/blockchain`

`Settings.jsx` and `WhistleblowerPortal.jsx` exist in `client/src/pages/` but are not routed yet.

## API Endpoints

| Group | Endpoints |
| --- | --- |
| Auth `/api/auth` | `POST /login`, `POST /refresh`, `POST /logout`, `GET /me`, `POST /register` (admin only) |
| Applicants `/api/applicants` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /search/conversational` |
| Audits `/api/audits` | `POST /run-all`, `POST /applicant/:id` |
| Alerts `/api/alerts` | `GET /`, `PATCH /:id/read`, `PATCH /mark-all-read`, `POST /send-critical` |
| Cases `/api/cases` | `GET /`, `POST /`, `GET /:id`, `PATCH /:id/assign`, `PATCH /:id/status`, `POST /:id/comments`, `POST /:id/votes` |
| Dashboard `/api/dashboard` | `GET /summary`, `GET /network`, `POST /network/rebuild`, `GET /blockchain`, `GET /blockchain/verify` |
| Documents `/api/documents` | `POST /fingerprint`, `POST /verify/:applicantId`, `GET /report/:applicantId` (PDF), `GET /legal-memo/:applicantId` (PDF) |
| Tips `/api/tips` | `POST /` (anonymous allowed), `GET /` (admin / senior auditor) |
| ML `/api/ml` | `POST /predict`, `POST /retrain` |
| Query logs `/api/query-logs` | `GET /` |

Each route enforces role access; see `server/routes/*.js`.

## Socket.io Events

- Audit room: `join_case`, `presence`, `cursor_move`, `comment_posted`, `vote_cast`
- Notifications: `subscribe_department`, `alert:new`

## Notes

- Auth tokens are set as httpOnly cookies.
- Government verification (DigiLocker / Aadhaar / NAD) and the document pixel-anomaly (deepfake) score are simulated.
- If Puppeteer download is blocked on install, use `PUPPETEER_SKIP_DOWNLOAD=true` during server install.
- `npm --prefix server test` runs Jest, but no test files exist yet.
