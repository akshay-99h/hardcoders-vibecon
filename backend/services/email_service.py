from datetime import datetime, timezone
from typing import Dict, Any
import html

import httpx

from config.settings import settings


class EmailService:
    def __init__(self):
        self._api_key = settings.RESEND_API_KEY
        self._from_email = settings.RESEND_FROM_EMAIL
        self._enabled = bool(self._api_key and self._from_email and settings.LOGIN_ALERT_EMAIL_ENABLED)

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def send_login_alert_email(self, user: Dict[str, Any], login_context: Dict[str, Any]) -> bool:
        """Send login security alert email via Resend."""
        if not self.enabled:
            return False

        recipient = (user or {}).get("email")
        if not recipient:
            return False

        safe_name = html.escape((user or {}).get("name") or "there")
        safe_ip = html.escape(login_context.get("ip") or "Unknown")
        safe_device = html.escape(login_context.get("device") or "Unknown device")
        safe_browser = html.escape(login_context.get("browser") or "Unknown browser")
        safe_time = html.escape(login_context.get("time") or datetime.now(timezone.utc).isoformat())
        contact_link = f"{settings.FRONTEND_BASE_URL.rstrip('/')}{settings.CONTACT_US_PATH}"
        safe_contact_link = html.escape(contact_link, quote=True)

        subject = "RakshaAI login alert: new session detected"
        html_body = f"""
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f5f8;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#0f49bd,#1e65f2);color:#ffffff;">
                <div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;opacity:0.9;">RakshaAI Security</div>
                <div style="margin-top:6px;font-size:22px;font-weight:700;line-height:1.2;">New Login Detected</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;">Hi {safe_name},</p>
                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.65;color:#374151;">
                  We noticed a new login to your RakshaAI account. If this was you, no action is needed.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;border-collapse:separate;border-spacing:0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#4b5563;width:35%;">IP Address</td>
                    <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#111827;">{safe_ip}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#4b5563;border-top:1px solid #e5e7eb;">Device</td>
                    <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">{safe_device}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#4b5563;border-top:1px solid #e5e7eb;">Browser</td>
                    <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">{safe_browser}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#4b5563;border-top:1px solid #e5e7eb;">Time (UTC)</td>
                    <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">{safe_time}</td>
                  </tr>
                </table>

                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.65;color:#374151;">
                  If this login looks suspicious, please let us know through the Contact Us page immediately.
                </p>

                <a href="{safe_contact_link}" style="display:inline-block;background:#0f49bd;color:#ffffff;text-decoration:none;border-radius:999px;padding:11px 20px;font-size:14px;font-weight:600;">
                  Report Suspicious Activity
                </a>

                <p style="margin:22px 0 0 0;font-size:12px;color:#6b7280;line-height:1.5;">
                  This is an automated security email from RakshaAI.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
        """.strip()

        payload = {
            "from": self._from_email,
            "to": [recipient],
            "subject": subject,
            "html": html_body,
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
            return True
        except Exception as exc:
            print(f"Login alert email send failed: {exc}")
            return False

