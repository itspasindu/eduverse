"""PayHere payment routes (sandbox + live)."""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.core.dependencies import get_current_user_public
from app.models.user import UserPublic
from app.services.payments.payhere import (
    build_checkout_fields,
    payhere_checkout_url,
    verify_notify_payload,
)
from app.services.payments.store import PaymentOrderStore
from app.services.subscriptions.repository import SubscriptionRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions", "payments"])


class CheckoutRequest(BaseModel):
    plan_slug: str = Field(min_length=1, max_length=64)


class CheckoutResponse(BaseModel):
    order_id: str
    checkout_url: str
    fields: dict[str, str]
    amount: str
    currency: str
    plan_name: str


class PaymentStatusResponse(BaseModel):
    order_id: str
    status: str
    plan_slug: str
    subscription_active: bool = False


def _payhere_ready(settings: Settings) -> bool:
    return bool(settings.payhere_merchant_id and settings.payhere_merchant_secret)


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest,
    user: UserPublic = Depends(get_current_user_public),
    settings: Settings = Depends(get_settings),
) -> CheckoutResponse:
    repo = SubscriptionRepository()
    plan = repo.get_plan_by_slug(payload.plan_slug.strip().lower())
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    price_cents = int(plan.get("price_cents") or 0)
    if price_cents <= 0:
        raise HTTPException(
            status_code=400,
            detail="Free plan does not require checkout. Use POST /subscriptions/me instead.",
        )

    if not _payhere_ready(settings):
        raise HTTPException(
            status_code=503,
            detail=(
                "PayHere is not configured. Add PAYHERE_MERCHANT_ID and "
                "PAYHERE_MERCHANT_SECRET to backend/.env, then restart the backend "
                "(stop uvicorn and start again — .env changes are not picked up while running)."
            ),
        )

    currency = settings.payhere_currency.upper()
    order = PaymentOrderStore().create(
        user_id=str(user.id),
        plan_slug=plan["slug"],
        plan_name=plan["name"],
        amount_cents=price_cents,
        currency=currency,
    )

    try:
        repo.select_plan(
            str(user.id),
            plan["slug"],
            assigned_by=str(user.id),
        )
    except RuntimeError as exc:
        logger.warning("Could not save pending subscription before checkout: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=(
                "Subscription database not set up. Run supabase/migrations/009_subscriptions.sql "
                "in your Supabase SQL Editor, then try again."
            ),
        ) from exc

    fields = build_checkout_fields(
        settings=settings,
        order_id=order["id"],
        plan_name=plan["name"],
        amount_cents=price_cents,
        currency=currency,
        user_id=str(user.id),
        plan_slug=plan["slug"],
        email=user.email,
        full_name=user.full_name,
    )

    return CheckoutResponse(
        order_id=order["id"],
        checkout_url=payhere_checkout_url(settings),
        fields=fields,
        amount=fields["amount"],
        currency=currency,
        plan_name=plan["name"],
    )


@router.get("/payment/{order_id}", response_model=PaymentStatusResponse)
def get_payment_status(
    order_id: str,
    user: UserPublic = Depends(get_current_user_public),
) -> PaymentStatusResponse:
    order = PaymentOrderStore().get(order_id)
    if not order or str(order["user_id"]) != str(user.id):
        raise HTTPException(status_code=404, detail="Payment not found")

    sub = SubscriptionRepository().get_user_subscription(str(user.id))
    active = bool(
        sub
        and sub.get("status") == "active"
        and sub.get("plan", {}).get("slug") == order.get("plan_slug")
    )

    return PaymentStatusResponse(
        order_id=order_id,
        status=str(order.get("status", "pending")),
        plan_slug=str(order.get("plan_slug", "")),
        subscription_active=active,
    )


@router.post("/payhere/notify")
async def payhere_notify(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    """PayHere server-to-server notification (public, verified by md5sig)."""
    if not _payhere_ready(settings):
        raise HTTPException(status_code=503, detail="PayHere not configured")

    form = await request.form()
    payload: dict[str, Any] = {k: form.get(k) for k in form.keys()}

    if not verify_notify_payload(payload, settings):
        logger.warning("PayHere notify hash mismatch for order %s", payload.get("order_id"))
        raise HTTPException(status_code=400, detail="Invalid signature")

    order_id = str(payload.get("order_id", ""))
    order = PaymentOrderStore().get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    status_code = str(payload.get("status_code", ""))
    if status_code == "2":
        PaymentOrderStore().mark_paid(
            order_id,
            payhere_payment_id=str(payload.get("payment_id") or ""),
            status_message=str(payload.get("status_message") or "success"),
        )
        SubscriptionRepository().admin_update_subscription(
            str(order["user_id"]),
            plan_slug=str(order["plan_slug"]),
            status="active",
            notes=f"PayHere payment {payload.get('payment_id') or order_id}",
            ends_at=None,
            assigned_by=str(order["user_id"]),
        )
    else:
        PaymentOrderStore().mark_failed(
            order_id,
            status_message=str(payload.get("status_message") or f"status_{status_code}"),
        )

    return {"status": "ok"}


@router.api_route("/payhere/return", methods=["GET", "POST"])
async def payhere_return(
    request: Request,
    settings: Settings = Depends(get_settings),
):
    """User return from PayHere — redirect to frontend success page."""
    params: dict[str, str] = {}
    if request.method == "POST":
        form = await request.form()
        params = {k: str(form.get(k) or "") for k in form.keys()}
    else:
        params = {k: str(v) for k, v in request.query_params.items()}

    order_id = params.get("order_id", "")
    status_code = params.get("status_code", "")

    if order_id and status_code == "2" and _payhere_ready(settings):
        order = PaymentOrderStore().get(order_id)
        verified = bool(
            params.get("md5sig")
            and verify_notify_payload(
                {
                    "merchant_id": params.get("merchant_id", settings.payhere_merchant_id),
                    "order_id": order_id,
                    "payhere_amount": params.get("payhere_amount", ""),
                    "payhere_currency": params.get("payhere_currency", settings.payhere_currency),
                    "status_code": status_code,
                    "md5sig": params.get("md5sig", ""),
                },
                settings,
            )
        )
        sandbox_return = settings.payhere_sandbox and not params.get("md5sig")
        if order and order.get("status") != "paid" and (verified or sandbox_return):
            PaymentOrderStore().mark_paid(order_id, payhere_payment_id=params.get("payment_id"))
            SubscriptionRepository().admin_update_subscription(
                str(order["user_id"]),
                plan_slug=str(order["plan_slug"]),
                status="active",
                notes=f"PayHere return {order_id}",
                ends_at=None,
                assigned_by=str(order["user_id"]),
            )

    frontend = settings.frontend_public_url.rstrip("/")
    query = urlencode({"order_id": order_id} if order_id else {})
    url = f"{frontend}/payment/success"
    if query:
        url = f"{url}?{query}"
    return RedirectResponse(url=url, status_code=302)


@router.api_route("/payhere/cancel", methods=["GET", "POST"])
async def payhere_cancel(
    request: Request,
    settings: Settings = Depends(get_settings),
):
    order_id = request.query_params.get("order_id", "")
    if request.method == "POST":
        form = await request.form()
        order_id = str(form.get("order_id") or order_id)

    frontend = settings.frontend_public_url.rstrip("/")
    query = urlencode({"order_id": order_id} if order_id else {})
    url = f"{frontend}/payment/cancel"
    if query:
        url = f"{url}?{query}"
    return RedirectResponse(url=url, status_code=302)
