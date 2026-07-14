# Smart Attendance System

Face-recognition attendance application with role-based student, teacher, and
administrator portals.

## Stack

- Backend: FastAPI, PostgreSQL, pgvector, OpenCV YuNet/SFace
- Frontend: React, Vite, Chakra UI, Ant Design
- Storage: local uploads by default, optional S3-compatible object storage

## Features

- Student and teacher registration with biometric enrollment
- Department- and semester-scoped attendance windows
- Liveness and face-similarity checks
- Session-specific roster snapshots and live check-ins
- Day, month, and year attendance archives
- Teacher-scoped reports and CSV/XLSX exports
- Administrator management and analytics

## Repository Layout

```text
backend/
  data/                 ONNX face detection and recognition models
  database.py           PostgreSQL schema, migrations, and connection pool
  main.py               FastAPI application
  storage.py            Local/S3-compatible profile photo storage
  requirements.txt      Runtime Python dependencies
  requirements-dev.txt  Test dependencies
frontend/
  public/               Static browser assets
  src/                  React application
  vite.config.js        Development server and API proxy
```

## Backend Setup

Requirements:

- Python 3.10+
- PostgreSQL with the `vector` extension available

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set at minimum:

- `DATABASE_URL`
- `JWT_SECRET` to a random value of at least 32 characters
- `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters when
  initializing an empty database

Initialize or migrate the database:

```powershell
python database.py
```

Start the API:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API documentation is available at `http://localhost:8000/docs`.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

The application opens at `http://localhost:5173`. Vite proxies `/api` to
`http://localhost:8000` by default. Copy `frontend/.env.example` to
`frontend/.env.local` to use another backend address.

## Validation

```powershell
cd frontend
npm run build

cd ..\backend
pip install -r requirements-dev.txt
pytest
python -m py_compile main.py database.py storage.py
```

## Security Notes

- Never commit `backend/.env`, database credentials, JWT secrets, or S3 keys.
- Teachers can view only students in their department and only their own
  attendance sessions.
- Student biometric enrollment is restricted to the authenticated student or
  an administrator.
- Attendance is unique per student and classroom session, allowing multiple
  subjects on the same day without overwriting records.

## Render deployment notes

- Frontend service (Static Site) settings on Render:
  - Type: Static Site
  - Root Directory: stu-att-sys-main/frontend
  - Build Command: `npm ci && npm run build`
  - Publish Directory: `dist`
  - Set `VITE_API_BASE_URL` in Render Environment Variables to your backend URL, for example `https://your-backend.onrender.com/api`.

- Backend deployment and secrets:
  - Do NOT commit `.env` or secrets. Rotate/revoke any values accidentally committed immediately.
  - Use Render Environment Variables for `DATABASE_URL`, `JWT_SECRET`, and Cloudflare R2 keys.
  - If the repository previously used a git submodule for `backend/`, either add a proper `.gitmodules` entry or convert `backend/` to a normal directory in the repo. Render cannot fetch a submodule if `.gitmodules` is missing.

- Files added to assist:
  - `.env.example` (root) and `backend/.env.example` — templates for required env keys.
  - `render.yaml` — a template showing recommended frontend and backend services.

- Recommended cleanup steps (run locally and push):
  1. Rotate and revoke exposed credentials now (database, R2, JWT, etc.).
  2. Add `.env` to `.gitignore` (already added at repository root).
  3. Remove the committed `.env` and `__pycache__` from history (use `git rm --cached .env`, then commit; for full history removal use `git filter-repo` or BFG and force-push).
  4. If `backend/` is a submodule pointer, either add `.gitmodules` with the correct URL or import the backend into the repo so Render can deploy it.

