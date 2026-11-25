# Python API

## Local setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API documentation: `http://localhost:8000/docs`

Use `backend/.env.example` as the local configuration template.
