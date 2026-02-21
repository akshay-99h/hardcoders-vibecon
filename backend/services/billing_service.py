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

    async def ensure_customer(self, user: Dict[str, Any]) -> Dict[str, Any]:
        profile = await self.db.billing_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        if profile:
            return profile

        now = _utc_now()
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
            await self.db.billing_profiles.update_one(
                {"stripe_customer_id": customer_id},
                {
                    "$set": {
                        "plan_key": plan_key,
                        "subscription_status": status,
                        "stripe_subscription_id": subscription_id,
                        "current_period_start": period_start,
                        "current_period_end": period_end,
                        "updated_at": now,
                    }
                },
            )

        elif event_type == "customer.subscription.deleted":
            customer_id = data.get("customer")
            await self.db.billing_profiles.update_one(
                {"stripe_customer_id": customer_id},
                {
                    "$set": {
                        "plan_key": "free",
                        "subscription_status": "canceled",
                        "stripe_subscription_id": None,
                        "current_period_start": None,
                        "current_period_end": None,
                        "updated_at": now,
                    }
                },
            )

        elif event_type == "checkout.session.completed":
            customer_id = data.get("customer")
            metadata = data.get("metadata", {})
            plan_key = metadata.get("plan_key")
            if customer_id and plan_key in {"plus", "pro", "business"}:
                await self.db.billing_profiles.update_one(
                    {"stripe_customer_id": customer_id},
                    {"$set": {"plan_key": plan_key, "updated_at": now}},
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

        return {
            "total_users": total_users,
            "total_billing_profiles": total_profiles,
            "active_subscriptions": active_subscriptions,
            "plan_breakdown": plan_breakdown,
            "stripe_test_mode": bool(self._stripe_enabled),
        }
