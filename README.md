# Zefinity Student LMS MVP

This repository contains a complete MVP implementation for a single-center Student Learning Management System based on `STUDENT_LMS_MVP_PLAN.md`.

## What Is Included

- `frontend`: React, TypeScript, Tailwind CSS, React Hook Form, Zod, TanStack Query, Recharts, lucide-react.
- `backend`: Python FastAPI source with SQLAlchemy models, JWT auth, role-based authorization, SQLite demo defaults, and PostgreSQL-ready configuration.
- `docs/MVP_SPEC.md`: product requirements, workflows, schema, API design, testing checklist, deployment plan, and roadmap.

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The frontend uses local seeded data and lets you switch between Admin, Tutor, Student, and Parent demo workspaces.

## Backend

Python 3.11+ is recommended.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9000
```

Swagger is available at `http://127.0.0.1:9000/docs`.

Seeded demo logins use:

- `admin@zenith.test`
- `arjun@zenith.test`
- `anika@zenith.test`
- `rhea@zenith.test`

Password for all seeded users: `Password123!`

## PostgreSQL

By default, the API uses SQLite at `backend/student_lms.db`. To use PostgreSQL, set:

```powershell
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/student_lms"
uvicorn app.main:app --reload
```

For production migrations, add Alembic and run migrations against PostgreSQL during deployment.

## Storage

The MVP stores resource, worksheet, and submission URLs. For production, upload files to AWS S3 from a signed upload endpoint and persist the S3 object URL/key in `Resource.Url` or `Assignment.SubmissionUrl`.

## Docker / EC2

This repo includes a production-oriented Docker Compose stack for EC2:

```bash
cp .env.example .env
docker compose up -d --build
```

The stack runs PostgreSQL, FastAPI, and an Nginx-served frontend. See `docs/EC2_DOCKER_DEPLOYMENT.md` for EC2 setup, environment variables, operations, and backup commands.
