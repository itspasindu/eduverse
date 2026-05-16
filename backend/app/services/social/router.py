from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field

from app.core.dependencies import require_active_user
from app.core.errors import raise_service_error
from app.core.moderation.service import enforce_clean_text
from app.core.supabase_auth import claims_to_user_fields, validate_supabase_token
from app.models.social import CommentCreate, CommentPublic, LikeToggleResult
from app.models.user import UserPublic
from app.realtime.feed_manager import feed_realtime
from app.services.reports.repository import ReportRepository
from app.services.social.service import SocialService

router = APIRouter(tags=["social"])


def get_social_service() -> SocialService:
    return SocialService()


class ReportCreate(BaseModel):
    target_type: str = Field(pattern="^(post|comment)$")
    target_id: str
    reason: str | None = Field(default=None, max_length=500)


@router.post(
    "/posts/{post_id}/like",
    response_model=LikeToggleResult,
)
async def toggle_like(
    post_id: str,
    user: UserPublic = Depends(require_active_user),
    social: SocialService = Depends(get_social_service),
) -> LikeToggleResult:
    user_id = str(user.id)
    try:
        return await social.toggle_like(user_id, post_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise_service_error(exc, operation="Like")


@router.get(
    "/posts/{post_id}/comments",
    response_model=list[CommentPublic],
)
def list_comments(
    post_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    social: SocialService = Depends(get_social_service),
) -> list[CommentPublic]:
    return social.list_comments(post_id, limit=limit, offset=offset)


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentPublic,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    post_id: str,
    payload: CommentCreate,
    user: UserPublic = Depends(require_active_user),
    social: SocialService = Depends(get_social_service),
) -> CommentPublic:
    enforce_clean_text(str(user.id), payload.body)
    return await social.add_comment(str(user.id), post_id, payload)


@router.post("/reports", status_code=status.HTTP_201_CREATED)
def report_content(
    payload: ReportCreate,
    user: UserPublic = Depends(require_active_user),
) -> dict:
    row = ReportRepository().create(
        reporter_id=str(user.id),
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Reporting is not available yet. Run migration 009.",
        )
    return {"id": row["id"], "status": row["status"]}


@router.websocket("/ws/feed")
async def feed_websocket(websocket: WebSocket, token: str = Query(...)) -> None:
    """Real-time feed updates. Pass Supabase access token as ?token=."""
    try:
        claims = validate_supabase_token(token)
        claims_to_user_fields(claims)
    except ValueError:
        await websocket.close(code=4401, reason="Invalid token")
        return

    await feed_realtime.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data.strip().lower() == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await feed_realtime.disconnect(websocket)
