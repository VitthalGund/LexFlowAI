"""
WhatsApp Notification Stub.
Prints a well-structured notification message to stdout (log).
No live WhatsApp provider integration — this is a stub that demonstrates
the message content and routing. Replace the print() with a real API call
to WhatsApp Business API, Twilio, or MSG91 when ready.
"""
from datetime import datetime
from typing import Optional


async def notify_branch_manager(
    map_id: str,
    branch_lgd_code: str,
    language: str,
    message: str,
    phone_number: Optional[str] = None
) -> dict:
    """
    Send a notification to a branch manager about a MAP action.

    Args:
        map_id: The MAP identifier (e.g. MAP-ABC123-1)
        branch_lgd_code: The branch LGD code for routing
        language: Language code for the notification (kn, ta, ml, hi, en)
        message: The notification message body
        phone_number: Optional E.164 format phone number (e.g. +919876543210)

    Returns:
        {"status": "queued", "channel": "whatsapp_stub", "map_id": map_id}
    """
    # Format the full notification payload
    payload = {
        "to": phone_number or f"+91-{branch_lgd_code}-PLACEHOLDER",
        "type": "text",
        "text": {
            "body": (
                f"🏦 LexFlow AI — Compliance Alert\n"
                f"MAP: {map_id}\n"
                f"Branch: {branch_lgd_code}\n"
                f"Language: {language.upper()}\n"
                f"Message: {message}\n"
                f"Time: {datetime.utcnow().isoformat()}Z"
            )
        }
    }

    # STUB: Log instead of sending
    print(f"[WhatsApp Stub] Would send notification:")
    print(f"  To     : {payload['to']}")
    print(f"  MAP    : {map_id}")
    print(f"  Branch : {branch_lgd_code}")
    print(f"  Lang   : {language}")
    print(f"  Body   : {payload['text']['body'][:100]}...")

    # TODO: Replace with real API call, e.g.:
    # async with httpx.AsyncClient() as client:
    #     await client.post(
    #         "https://api.whatsapp.com/v1/messages",
    #         headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
    #         json=payload,
    #         timeout=10.0
    #     )

    return {"status": "queued", "channel": "whatsapp_stub", "map_id": map_id}


async def notify_compliance_officer(
    event: str,
    circular_title: str,
    detail: str,
    phone_number: Optional[str] = None
) -> dict:
    """
    Notify the compliance officer about a regulatory event (new circular auto-ingested, etc.).
    """
    payload = (
        f"🚨 LexFlow AI — Regulatory Alert\n"
        f"Event: {event}\n"
        f"Circular: {circular_title[:60]}\n"
        f"Detail: {detail}\n"
        f"Time: {datetime.utcnow().isoformat()}Z"
    )
    print(f"[WhatsApp Stub] Officer notification: {payload[:120]}...")
    return {"status": "queued", "channel": "whatsapp_stub", "event": event}
