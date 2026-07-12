# FastAPI Backend

FastAPI backend for the Zefinity Student LMS MVP.

## Run Locally

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs:

- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

Seeded users all use password `Password123!`:

- `admin@zenith.test`
- `arjun@zenith.test`
- `anika@zenith.test`
- `rhea@zenith.test`

## Database

Default: SQLite at `backend/student_lms.db`.

PostgreSQL example:

```powershell
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/student_lms"
uvicorn app.main:app --reload
```
