from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import Settings, get_settings
from app.core.security import extract_bearer_token
from app.core.supabase_auth import claims_to_user_fields, validate_supabase_token


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """Validate Supabase JWT on protected routes."""

    def __init__(self, app, settings: Settings | None = None):
        super().__init__(app)
        self.settings = settings or get_settings()

    def _is_public(self, path: str) -> bool:
        return any(
            path == public or path.startswith(f"{public}/")
            for public in self.settings.public_paths
        )

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS" or self._is_public(request.url.path):
            return await call_next(request)

        token = extract_bearer_token(request.headers.get("Authorization"))
        if not token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing authentication token"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            claims = validate_supabase_token(token)
            fields = claims_to_user_fields(claims)
        except ValueError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        request.state.user_id = fields["id"]
        request.state.user_role = fields["role"]
        request.state.supabase_claims = claims

        return await call_next(request)
