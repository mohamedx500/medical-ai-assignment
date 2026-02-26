import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import gemini, clips, chat, stats
from routers.auth_router import router as auth_router, seed_admin
from database import init_db, SessionLocal

load_dotenv()
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and seed admin on startup."""
    init_db()
    logging.info("[Startup] Database tables created/verified.")
    # Seed admin user
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Medical AI Expert System API",
    description="AI-powered medical diagnostic system combining Google Gemini AI and CLIPS expert system.",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route Registration ──
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(gemini.router, prefix="/api/gemini", tags=["Gemini AI"])
app.include_router(clips.router, prefix="/api/clips", tags=["CLIPS Expert System"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])


@app.get("/")
async def root():
    return {"status": "ok", "message": "Medical AI Expert System API v3.0 is running."}


@app.get("/api/health")
async def health_check():
    from services.gemini_service import MODELS

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status": "healthy",
        "version": "3.0.0",
        "engines": {
            "gemini": {
                "status": "configured" if gemini_key else "missing_key",
                "fallback_chain": MODELS,
            },
            "clips": {"status": "available"},
        },
    }
