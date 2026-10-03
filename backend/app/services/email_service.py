from typing import Dict, Any
from app.config import get_settings

settings = get_settings()


class EmailProviderInterface:
    """Modular email provider interface.
    Allows easy extension for Microsoft Graph API or SMTP when administrator approval is enabled.
    """
    def send_notification(
        self,
        sender_email: str,
        recipient_email: str,
        subject: str,
        body: str,
        portal_link: str,
    ) -> Dict[str, Any]:
        raise NotImplementedError


class MicrosoftGraphEmailProvider(EmailProviderInterface):
    """Placeholder provider for future Microsoft Graph API sending.
    Requires Microsoft 365 administrator approval and Graph API credentials.
    """
    def send_notification(
        self,
        sender_email: str,
        recipient_email: str,
        subject: str,
        body: str,
        portal_link: str,
    ) -> Dict[str, Any]:
        raise NotImplementedError("Microsoft 365 Administrator approval is currently unavailable.")


class DemoSimulatedEmailProvider(EmailProviderInterface):
    """Demo provider that generates simulated email notification records.
    Clearly marks records as 'Demo — Not Sent'.
    Does not spoof sender addresses, expose credentials, or claim delivery.
    """
    def send_notification(
        self,
        sender_email: str,
        recipient_email: str,
        subject: str,
        body: str,
        portal_link: str,
    ) -> Dict[str, Any]:
        return {
            "sender_email": sender_email,
            "recipient_email": recipient_email,
            "subject": subject,
            "body": body,
            "portal_link": portal_link,
            "delivery_status": "Demo — Not Sent",
            "is_demo": True,
        }


def get_email_provider() -> EmailProviderInterface:
    if getattr(settings, "EMAIL_BACKEND", "demo") == "msgraph":
        return MicrosoftGraphEmailProvider()
    return DemoSimulatedEmailProvider()
