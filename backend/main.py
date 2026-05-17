from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.health_check import probe_all
from app.middleware.auth import JWTAuthMiddleware
from app.middleware.body_limit import BodyLimitMiddleware
from app.services.ai.router import router as ai_router
from app.services.auth.router import router as auth_router
from app.services.content import router as content_router
from app.services.content.materials_router import router as materials_router
from app.services.characters import router as characters_router
from app.services.admin import router as admin_router
from app.services.dashboard import router as dashboard_router
from app.services.social import router as social_router
from app.services.teacher import router as teacher_router
from app.services.subscriptions import router as subscriptions_router
from app.services.payments import router as payments_router

settings = get_settings()
<<<<<<< HEAD
settings.validate_production_secrets()
=======
>>>>>>> 140e298 (Save local progress)

app = FastAPI(
    title="EduVerse AI",
    description="EduVerse AI — social learning SaaS API (Supabase)",
    version="0.4.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

<<<<<<< HEAD
app.add_middleware(BodyLimitMiddleware)
=======
# JWT runs inside CORS so preflight OPTIONS always gets CORS headers.
>>>>>>> 140e298 (Save local progress)
app.add_middleware(JWTAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=None if settings.is_production else settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(content_router)
app.include_router(materials_router)
app.include_router(characters_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(teacher_router)
<<<<<<< HEAD
app.include_router(social_router)
=======
app.include_router(subscriptions_router)
app.include_router(payments_router)
>>>>>>> 44a09b9 (Added new files)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    from app.debug_log import debug_log

    debug_log(
        "main.py:unhandled_exception_handler",
        "Unhandled exception",
        {"type": type(exc).__name__, "msg": str(exc)[:200]},
        hypothesis_id="H",
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
def health():
    return {"status": "ok", "database": "supabase"}


@app.get("/health/db")
def health_db(x_health_token: str | None = Header(default=None, alias="X-Health-Token")):
    """Probe Supabase tables. In production requires X-Health-Token header."""
    if settings.is_production:
        if not settings.health_db_token or x_health_token != settings.health_db_token:
            raise HTTPException(status_code=404, detail="Not found")
    data = probe_all()
    if settings.is_production:
        return {"status": data.get("status", "unknown")}
    return data
