from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.catalog import router as catalog_router
from app.admin import router as admin_router
from app.seed import seed_catalog

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sushi Cafe API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(',')],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(catalog_router)
app.include_router(admin_router)
uploads_dir = Path(__file__).resolve().parents[2] / 'public' / 'uploads'
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=str(uploads_dir)), name='uploads')


@app.on_event('startup')
def seed_database():
    db = SessionLocal()
    try:
        seed_catalog(db)
    finally:
        db.close()


@app.get('/api/health')
def health():
    return {'status': 'ok'}
