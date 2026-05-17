"""PayHere Checkout API helpers (hash generation & verification)."""

from __future__ import annotations

import hashlib
from typing import Any
from urllib.parse import urlencode

from app.config import Settings


def _md5_upper(value: str) -> str:
    return hashlib.md5(value.encode("utf-8")).hexdigest().upper()


def _secret_digest(merchant_secret: str) -> str:
    return _md5_upper(merchant_secret)


def checkout_hash(
    *,
    merchant_id: str,
    order_id: str,
    amount: str,
    currency: str,
    merchant_secret: str,
) -> str:
    """Hash for initiating checkout (generated server-side only)."""
    inner = _secret_digest(merchant_secret)
    raw = f"{merchant_id}{order_id}{amount}{currency}{inner}"
    return _md5_upper(raw)


def notify_hash(
    *,
    merchant_id: str,
    order_id: str,
    amount: str,
    currency: str,
    status_code: str,
    merchant_secret: str,
) -> str:
    """Hash PayHere sends on payment notification — verify before activating."""
    inner = _secret_digest(merchant_secret)
    raw = f"{merchant_id}{order_id}{amount}{currency}{status_code}{inner}"
    return _md5_upper(raw)


def payhere_checkout_url(settings: Settings) -> str:
    if settings.payhere_sandbox:
        return "https://sandbox.payhere.lk/pay/checkout"
    return "https://www.payhere.lk/pay/checkout"


def format_amount(price_cents: int) -> str:
    return f"{price_cents / 100:.2f}"


def build_checkout_fields(
    *,
    settings: Settings,
    order_id: str,
    plan_name: str,
    amount_cents: int,
    currency: str,
    user_id: str,
    plan_slug: str,
    email: str,
    full_name: str | None,
) -> dict[str, str]:
    amount = format_amount(amount_cents)
    merchant_id = settings.payhere_merchant_id
    secret = settings.payhere_merchant_secret

    fields: dict[str, str] = {
        "merchant_id": merchant_id,
        "return_url": f"{settings.api_public_url.rstrip('/')}/subscriptions/payhere/return",
        "cancel_url": f"{settings.api_public_url.rstrip('/')}/subscriptions/payhere/cancel",
        "notify_url": f"{settings.api_public_url.rstrip('/')}/subscriptions/payhere/notify",
        "order_id": order_id,
        "items": f"EduVerse {plan_name} subscription",
        "currency": currency,
        "amount": amount,
        "first_name": (full_name or "EduVerse").split()[0][:50],
        "last_name": " ".join((full_name or "User").split()[1:])[:50] or "User",
        "email": email[:100],
        "phone": "0770000000",
        "address": "Colombo",
        "city": "Colombo",
        "country": "Sri Lanka",
        "custom_1": user_id,
        "custom_2": plan_slug,
        "hash": checkout_hash(
            merchant_id=merchant_id,
            order_id=order_id,
            amount=amount,
            currency=currency,
            merchant_secret=secret,
        ),
    }
    return fields


def verify_notify_payload(payload: dict[str, Any], settings: Settings) -> bool:
    received = str(payload.get("md5sig") or payload.get("hash") or "").upper()
    if not received:
        return False
    expected = notify_hash(
        merchant_id=str(payload.get("merchant_id", "")),
        order_id=str(payload.get("order_id", "")),
        amount=str(payload.get("payhere_amount", "")),
        currency=str(payload.get("payhere_currency", "")),
        status_code=str(payload.get("status_code", "")),
        merchant_secret=settings.payhere_merchant_secret,
    )
    return received == expected


def checkout_form_html(fields: dict[str, str], action_url: str) -> str:
    inputs = "".join(
        f'<input type="hidden" name="{k}" value="{v}" />'
        for k, v in fields.items()
    )
    return (
        f'<form id="payhere_form" method="post" action="{action_url}">{inputs}</form>'
        f'<script>document.getElementById("payhere_form").submit();</script>'
    )
