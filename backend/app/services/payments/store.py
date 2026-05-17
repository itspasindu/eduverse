"""File-based payment order store (PayHere checkout)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.config import get_settings


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class PaymentOrderStore:
    def __init__(self) -> None:
        root = get_settings().lesson_data_dir.parent / "payments" / "orders"
        root.mkdir(parents=True, exist_ok=True)
        self.root = root

    def _path(self, order_id: str) -> Path:
        return self.root / f"{order_id}.json"

    def create(
        self,
        *,
        user_id: str,
        plan_slug: str,
        plan_name: str,
        amount_cents: int,
        currency: str,
    ) -> dict[str, Any]:
        order_id = str(uuid4())
        row = {
            "id": order_id,
            "user_id": user_id,
            "plan_slug": plan_slug,
            "plan_name": plan_name,
            "amount_cents": amount_cents,
            "currency": currency,
            "status": "pending",
            "payhere_payment_id": None,
            "created_at": _utc_now(),
            "updated_at": _utc_now(),
        }
        self._write(order_id, row)
        return row

    def get(self, order_id: str) -> dict[str, Any] | None:
        path = self._path(order_id)
        if not path.is_file():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    def update(self, order_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        row = self.get(order_id)
        if not row:
            return None
        row.update(patch)
        row["updated_at"] = _utc_now()
        self._write(order_id, row)
        return row

    def mark_paid(
        self,
        order_id: str,
        *,
        payhere_payment_id: str | None = None,
        status_message: str | None = None,
    ) -> dict[str, Any] | None:
        return self.update(
            order_id,
            {
                "status": "paid",
                "payhere_payment_id": payhere_payment_id,
                "status_message": status_message,
            },
        )

    def mark_failed(self, order_id: str, *, status_message: str | None = None) -> dict[str, Any] | None:
        return self.update(
            order_id,
            {"status": "failed", "status_message": status_message},
        )

    def _write(self, order_id: str, row: dict[str, Any]) -> None:
        self._path(order_id).write_text(
            json.dumps(row, indent=2),
            encoding="utf-8",
        )
