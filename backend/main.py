from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.health_check import probe_all
from app.middleware.auth import JWTAuthMiddleware
from app.services.ai.router import router as ai_router
from app.services.auth.router import router as auth_router
from app.services.content import router as content_router
from app.services.admin import router as admin_router
from app.services.dashboard import router as dashboard_router
from app.services.teacher import router as teacher_router

app = FastAPI(
    title="EduVerse AI",
    description="EduVerse AI — social learning SaaS API (Supabase)",
    version="0.3.0",
)

settings = get_settings()

# JWT runs inside CORS so preflight OPTIONS always gets CORS headers.
app.add_middleware(JWTAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(content_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(teacher_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    """Return JSON 500 so CORS middleware can attach headers (avoids browser CORS noise on crashes)."""
    # #region agent log
    from app.debug_log import debug_log

    debug_log(
        "main.py:unhandled_exception_handler",
        "Unhandled exception",
        {"type": type(exc).__name__, "msg": str(exc)[:200]},
        hypothesis_id="H",
    )
    # #endregion
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
def health():
    return {"status": "ok", "database": "supabase"}


@app.get("/health/db")
def health_db():
    """Probe Supabase tables (public, no auth)."""
    return probe_all()
