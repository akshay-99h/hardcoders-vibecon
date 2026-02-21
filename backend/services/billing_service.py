from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import stripe
from pymongo import ReturnDocument

from config.settings import settings


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _current_period_key() -> str:
    now = _utc_now()
    return f"{now.year:04d}-{now.month:02d}"


_UNSET = object()


def _to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class BillingService:
    def __init__(self, db):
        self.db = db
        self._stripe_enabled = bool(settings.STRIPE_SECRET_KEY)
        if self._stripe_enabled:
            stripe.api_key = settings.STRIPE_SECRET_KEY

    def plan_catalog(self) -> Dict[str, Dict[str, Any]]:
        return {
            "free": {
                "label": "Free",
                "price_inr_monthly": 0,
                "seats_included": 1,
                "limits": {
                    "chat_messages": 150,
                    "stt_requests": 30,
                    "document_analysis": 5,
                    "pdf_exports": 3,
                    "automation_runs": 0,
                },
            },
            "plus": {
                "label": "Plus",
                "price_inr_monthly": 599,
                "seats_included": 1,
                "limits": {
                    "chat_messages": 2000,
                    "stt_requests": 300,
                    "document_analysis": 40,
                    "pdf_exports": 25,
                    "automation_runs": 30,
                },
            },
            "pro": {
                "label": "Pro",
                "price_inr_monthly": 1799,
                "seats_included": 3,
                "limits": {
                    "chat_messages": 10000,
                    "stt_requests": 1200,
                    "document_analysis": 200,
                    "pdf_exports": 150,
                    "automation_runs": 200,
                },
            },
            "business": {
                "label": "Business",
                "price_inr_monthly": 5999,
                "seats_included": 10,
                "limits": {
                    "chat_messages": 50000,
                    "stt_requests": 4000,
                    "document_analysis": 800,
                    "pdf_exports": 800,
                    "automation_runs": 1000,
                },
            },
        }

    def _price_id_for_plan(self, plan_key: str) -> Optional[str]:
        return {
            "plus": settings.STRIPE_PRICE_PLUS_MONTHLY,
            "pro": settings.STRIPE_PRICE_PRO_MONTHLY,
            "business": settings.STRIPE_PRICE_BUSINESS_MONTHLY,
        }.get(plan_key)

    def _plan_for_price_id(self, price_id: Optional[str]) -> str:
        mapping = {
            settings.STRIPE_PRICE_PLUS_MONTHLY: "plus",
            settings.STRIPE_PRICE_PRO_MONTHLY: "pro",
            settings.STRIPE_PRICE_BUSINESS_MONTHLY: "business",
        }
        return mapping.get(price_id, "free")

    def _seat_limit_for_plan(self, plan_key: str) -> int:
        plan = self.plan_catalog().get(plan_key, self.plan_catalog()["free"])
        return max(_to_int(plan.get("seats_included"), 1), 1)

    def _seat_values_for_plan(self, plan_key: str, profile: Optional[Dict[str, Any]] = None) -> Tuple[int, int]:
        plan_min_seats = self._seat_limit_for_plan(plan_key)
        existing_limit = _to_int((profile or {}).get("seat_limit"), plan_min_seats)
        seat_limit = max(plan_min_seats, existing_limit)

        default_used = 1 if seat_limit > 0 else 0
        seat_used = _to_int((profile or {}).get("seat_used"), default_used)
        seat_used = max(0, min(seat_used, seat_limit))
        return seat_limit, seat_used

    async def _sync_profile_plan(
        self,
        profile_filter: Dict[str, Any],
        plan_key: str,
        subscription_status: Any = _UNSET,
        stripe_subscription_id: Any = _UNSET,
        current_period_start: Any = _UNSET,
        current_period_end: Any = _UNSET,
    ) -> Optional[Dict[str, Any]]:
        profile = await self.db.billing_profiles.find_one(profile_filter, {"_id": 0})
        if not profile:
            return None

        seat_limit, seat_used = self._seat_values_for_plan(plan_key, profile=profile)
        now = _utc_now()

        updates = {
            "plan_key": plan_key,
            "seat_limit": seat_limit,
            "seat_used": seat_used,
            "updated_at": now,
        }
        if subscription_status is not _UNSET:
            updates["subscription_status"] = subscription_status
        if stripe_subscription_id is not _UNSET:
            updates["stripe_subscription_id"] = stripe_subscription_id
        if current_period_start is not _UNSET:
            updates["current_period_start"] = current_period_start
        if current_period_end is not _UNSET:
            updates["current_period_end"] = current_period_end

        await self.db.billing_profiles.update_one(profile_filter, {"$set": updates})
        return updates

    async def sync_profile_plan_for_user(
        self,
        user_id: str,
        plan_key: str,
        subscription_status: Any = _UNSET,
        stripe_subscription_id: Any = _UNSET,
        current_period_start: Any = _UNSET,
        current_period_end: Any = _UNSET,
    ) -> Optional[Dict[str, Any]]:
        return await self._sync_profile_plan(
            {"user_id": user_id},
            plan_key=plan_key,
            subscription_status=subscription_status,
            stripe_subscription_id=stripe_subscription_id,
            current_period_start=current_period_start,
            current_period_end=current_period_end,
        )

    async def sync_profile_plan_for_customer(
        self,
        stripe_customer_id: str,
        plan_key: str,
        subscription_status: Any = _UNSET,
        stripe_subscription_id: Any = _UNSET,
        current_period_start: Any = _UNSET,
        current_period_end: Any = _UNSET,
    ) -> Optional[Dict[str, Any]]:
        return await self._sync_profile_plan(
            {"stripe_customer_id": stripe_customer_id},
            plan_key=plan_key,
            subscription_status=subscription_status,
            stripe_subscription_id=stripe_subscription_id,
            current_period_start=current_period_start,
            current_period_end=current_period_end,
        )

    async def update_user_seats(self, user_id: str, seat_limit: int, seat_used: Optional[int] = None) -> Dict[str, Any]:
        if seat_limit < 1:
            raise ValueError("seat_limit must be at least 1")

        profile = await self.db.billing_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if not profile:
            raise ValueError("Billing profile not found")

        current_used = _to_int(profile.get("seat_used"), 1)
        next_used = current_used if seat_used is None else seat_used

        if next_used < 0:
            raise ValueError("seat_used cannot be negative")
        if next_used > seat_limit:
            raise ValueError("seat_used cannot exceed seat_limit")

        now = _utc_now()
        await self.db.billing_profiles.update_one(
            {"user_id": user_id},
            {"$set": {"seat_limit": seat_limit, "seat_used": next_used, "updated_at": now}},
        )

        return {"user_id": user_id, "seat_limit": seat_limit, "seat_used": next_used}

    async def ensure_customer(self, user: Dict[str, Any]) -> Dict[str, Any]:
        profile = await self.db.billing_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        if profile:
            updates = {}
            seat_limit, seat_used = self._seat_values_for_plan(profile.get("plan_key", "free"), profile=profile)
            if profile.get("seat_limit") != seat_limit:
                updates["seat_limit"] = seat_limit
            if profile.get("seat_used") != seat_used:
                updates["seat_used"] = seat_used
            if updates:
                updates["updated_at"] = _utc_now()
                await self.db.billing_profiles.update_one({"user_id": user["user_id"]}, {"$set": updates})
                profile.update(updates)
            return profile

        now = _utc_now()
        seat_limit, seat_used = self._seat_values_for_plan("free")
        profile = {
            "user_id": user["user_id"],
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role", "user"),
            "stripe_customer_id": None,
            "plan_key": "free",
            "subscription_status": "inactive",
            "stripe_subscription_id": None,
            "current_period_start": None,
            "current_period_end": None,
            "seat_limit": seat_limit,
            "seat_used": seat_used,
            "created_at": now,
            "updated_at": now,
        }

        if self._stripe_enabled:
            customer = stripe.Customer.create(
                email=user.get("email"),
                name=user.get("name"),
                metadata={"user_id": user["user_id"]},
            )
            profile["stripe_customer_id"] = customer["id"]

        await self.db.billing_profiles.insert_one(profile)
        return profile

    async def get_profile(self, user_id: str) -> Dict[str, Any]:
        profile = await self.db.billing_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if profile:
            return profile
        # Minimal fallback if profile is missing; caller should use ensure_customer when user object is available.
        return {
            "user_id": user_id,
            "plan_key": "free",
            "subscription_status": "inactive",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "current_period_start": None,
            "current_period_end": None,
            "seat_limit": self._seat_limit_for_plan("free"),
            "seat_used": 1,
        }

    async def get_usage_snapshot(self, user_id: str) -> Dict[str, Any]:
        profile = await self.get_profile(user_id)
        plan_key = profile.get("plan_key", "free")
        catalog = self.plan_catalog()
        plan = catalog.get(plan_key, catalog["free"])
        period_key = _current_period_key()

        counters = await self.db.usage_counters.find(
            {"user_id": user_id, "period_key": period_key},
            {"_id": 0, "metric": 1, "used": 1},
        ).to_list(length=200)

        usage_map = {entry["metric"]: int(entry.get("used", 0)) for entry in counters}
        limits = plan["limits"]

        metrics = {}
        for metric, limit in limits.items():
            used = usage_map.get(metric, 0)
            metrics[metric] = {
                "used": used,
                "limit": limit,
                "remaining": max(limit - used, 0),
                "exhausted": used >= limit,
            }

        return {
            "plan_key": plan_key,
            "plan": plan,
            "period_key": period_key,
            "metrics": metrics,
            "subscription_status": profile.get("subscription_status", "inactive"),
            "current_period_start": profile.get("current_period_start"),
            "current_period_end": profile.get("current_period_end"),
            "seat_limit": _to_int(profile.get("seat_limit"), self._seat_limit_for_plan(plan_key)),
            "seat_used": _to_int(profile.get("seat_used"), 1),
            "seats_remaining": max(
                _to_int(profile.get("seat_limit"), self._seat_limit_for_plan(plan_key))
                - _to_int(profile.get("seat_used"), 1),
                0,
            ),
        }

    async def check_and_consume(
        self, user_id: str, metric: str, units: int = 1, consume: bool = True
    ) -> Tuple[bool, Dict[str, Any]]:
        if units <= 0:
            units = 1

        usage = await self.get_usage_snapshot(user_id)
        metric_usage = usage["metrics"].get(metric)
        if metric_usage is None:
            # Unknown metric is treated as allowed.
            return True, {
                "metric": metric,
                "used": 0,
                "limit": None,
                "remaining": None,
                "plan_key": usage["plan_key"],
            }

        next_used = metric_usage["used"] + units
        if next_used > metric_usage["limit"]:
            return (
                False,
                {
                    "metric": metric,
                    "used": metric_usage["used"],
                    "limit": metric_usage["limit"],
                    "remaining": metric_usage["remaining"],
                    "plan_key": usage["plan_key"],
                },
            )

        if consume:
            now = _utc_now()
            period_key = usage["period_key"]
            await self.db.usage_counters.find_one_and_update(
                {"user_id": user_id, "period_key": period_key, "metric": metric},
                {
                    "$setOnInsert": {
                        "user_id": user_id,
                        "period_key": period_key,
                        "metric": metric,
                        "created_at": now,
                    },
                    "$set": {"updated_at": now},
                    "$inc": {"used": units},
                },
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            await self.db.usage_events.insert_one(
                {
                    "user_id": user_id,
                    "period_key": period_key,
                    "metric": metric,
                    "units": units,
                    "created_at": now,
                }
            )

        return (
            True,
            {
                "metric": metric,
                "used": metric_usage["used"] + units,
                "limit": metric_usage["limit"],
                "remaining": max(metric_usage["limit"] - (metric_usage["used"] + units), 0),
                "plan_key": usage["plan_key"],
            },
        )

    async def create_checkout_session(self, user: Dict[str, Any], plan_key: str) -> Dict[str, Any]:
        if not self._stripe_enabled:
            raise RuntimeError("Stripe is not configured. Set STRIPE_SECRET_KEY for test mode.")
        if plan_key not in {"plus", "pro", "business"}:
            raise ValueError("Invalid plan key")

        profile = await self.ensure_customer(user)
        price_id = self._price_id_for_plan(plan_key)
        if not price_id:
            raise ValueError(f"Missing Stripe price id for plan '{plan_key}'")

        checkout = stripe.checkout.Session.create(
            mode="subscription",
            customer=profile.get("stripe_customer_id"),
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=settings.STRIPE_CHECKOUT_SUCCESS_URL,
            cancel_url=settings.STRIPE_CHECKOUT_CANCEL_URL,
            metadata={"user_id": user["user_id"], "plan_key": plan_key},
            allow_promotion_codes=True,
        )
        return {"id": checkout["id"], "url": checkout["url"]}

    async def create_billing_portal_session(self, user: Dict[str, Any]) -> Dict[str, Any]:
        if not self._stripe_enabled:
            raise RuntimeError("Stripe is not configured. Set STRIPE_SECRET_KEY for test mode.")

        profile = await self.ensure_customer(user)
        if not profile.get("stripe_customer_id"):
            raise ValueError("No Stripe customer found for user")

        portal = stripe.billing_portal.Session.create(
            customer=profile["stripe_customer_id"],
            return_url=settings.STRIPE_BILLING_RETURN_URL,
        )
        return {"url": portal["url"]}

    async def handle_webhook(self, payload: bytes, signature: Optional[str]) -> Dict[str, Any]:
        if not self._stripe_enabled:
            raise RuntimeError("Stripe is not configured. Set STRIPE_SECRET_KEY for test mode.")
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise RuntimeError("Missing STRIPE_WEBHOOK_SECRET")

        event = stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)
        event_type = event["type"]
        data = event["data"]["object"]
        now = _utc_now()

        if event_type in {"customer.subscription.created", "customer.subscription.updated"}:
            customer_id = data.get("customer")
            subscription_id = data.get("id")
            status = data.get("status", "inactive")
            period_start = datetime.fromtimestamp(data.get("current_period_start"), tz=timezone.utc)
            period_end = datetime.fromtimestamp(data.get("current_period_end"), tz=timezone.utc)
            price_id = None

            items = data.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id")

            plan_key = self._plan_for_price_id(price_id)
            await self.sync_profile_plan_for_customer(
                stripe_customer_id=customer_id,
                plan_key=plan_key,
                subscription_status=status,
                stripe_subscription_id=subscription_id,
                current_period_start=period_start,
                current_period_end=period_end,
            )

        elif event_type == "customer.subscription.deleted":
            customer_id = data.get("customer")
            await self.sync_profile_plan_for_customer(
                stripe_customer_id=customer_id,
                plan_key="free",
                subscription_status="canceled",
                stripe_subscription_id=None,
                current_period_start=None,
                current_period_end=None,
            )

        elif event_type == "checkout.session.completed":
            customer_id = data.get("customer")
            metadata = data.get("metadata", {})
            plan_key = metadata.get("plan_key")
            if customer_id and plan_key in {"plus", "pro", "business"}:
                await self.sync_profile_plan_for_customer(
                    stripe_customer_id=customer_id,
                    plan_key=plan_key,
                )

        await self.db.billing_events.insert_one(
            {
                "event_id": event.get("id"),
                "event_type": event_type,
                "created_at": now,
            }
        )
        return {"received": True, "event_type": event_type}

    async def admin_billing_overview(self) -> Dict[str, Any]:
        total_users = await self.db.users.count_documents({})
        total_profiles = await self.db.billing_profiles.count_documents({})
        active_subscriptions = await self.db.billing_profiles.count_documents(
            {"plan_key": {"$in": ["plus", "pro", "business"]}, "subscription_status": {"$nin": ["canceled", "inactive"]}}
        )
        plan_breakdown = {}
        for plan_key in ["free", "plus", "pro", "business"]:
            plan_breakdown[plan_key] = await self.db.billing_profiles.count_documents({"plan_key": plan_key})

        seat_aggregate = await self.db.billing_profiles.aggregate(
            [
                {
                    "$group": {
                        "_id": None,
                        "seat_limit_total": {"$sum": {"$ifNull": ["$seat_limit", 0]}},
                        "seat_used_total": {"$sum": {"$ifNull": ["$seat_used", 0]}},
                    }
                }
            ]
        ).to_list(length=1)
        seat_limit_total = _to_int((seat_aggregate[0] if seat_aggregate else {}).get("seat_limit_total"), 0)
        seat_used_total = _to_int((seat_aggregate[0] if seat_aggregate else {}).get("seat_used_total"), 0)

        return {
            "total_users": total_users,
            "total_billing_profiles": total_profiles,
            "active_subscriptions": active_subscriptions,
            "plan_breakdown": plan_breakdown,
            "stripe_test_mode": bool(self._stripe_enabled),
            "stripe_publishable_key_configured": bool(settings.STRIPE_PUBLISHABLE_KEY),
            "seat_limit_total": seat_limit_total,
            "seat_used_total": seat_used_total,
            "seat_available_total": max(seat_limit_total - seat_used_total, 0),
        }

    async def admin_recent_events(self, limit: int = 100) -> Dict[str, Any]:
        events = await self.db.billing_events.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        return {"events": events, "count": len(events)}

    async def admin_subscriptions(self, limit: int = 200) -> Dict[str, Any]:
        subscriptions = await self.db.billing_profiles.find(
            {"plan_key": {"$in": ["plus", "pro", "business"]}},
            {
                "_id": 0,
                "user_id": 1,
                "email": 1,
                "name": 1,
                "plan_key": 1,
                "subscription_status": 1,
                "stripe_customer_id": 1,
                "stripe_subscription_id": 1,
                "current_period_start": 1,
                "current_period_end": 1,
                "seat_limit": 1,
                "seat_used": 1,
                "updated_at": 1,
            },
        ).sort("updated_at", -1).limit(limit).to_list(length=limit)
        return {"subscriptions": subscriptions, "count": len(subscriptions)}

    async def admin_seat_overview(self, limit: int = 200) -> Dict[str, Any]:
        rows = await self.db.billing_profiles.find(
            {},
            {
                "_id": 0,
                "user_id": 1,
                "email": 1,
                "name": 1,
                "plan_key": 1,
                "subscription_status": 1,
                "seat_limit": 1,
                "seat_used": 1,
                "updated_at": 1,
            },
        ).sort("updated_at", -1).limit(limit).to_list(length=limit)

        seat_limit_total = sum(_to_int(row.get("seat_limit"), 0) for row in rows)
        seat_used_total = sum(_to_int(row.get("seat_used"), 0) for row in rows)
        return {
            "seats": rows,
            "count": len(rows),
            "seat_limit_total": seat_limit_total,
            "seat_used_total": seat_used_total,
            "seat_available_total": max(seat_limit_total - seat_used_total, 0),
        }
