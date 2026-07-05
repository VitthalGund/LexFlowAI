"""
Triage service: classifies whether an RSS notification is actionable
for a commercial bank. Uses keyword pre-filter + LLM call (same
Gemini → Ollama → fail-open pattern as lexgraph.py).
"""
import httpx
from app.core.config import settings

BANKING_KEYWORDS = [
    "bank", "banks", "commercial bank", "scheduled bank", "co-operative bank",
    "nbfc", "kyc", "cyber", "it framework", "customer", "deposit", "credit",
    "prudential", "master direction", "regulated entity", "regulated entities",
    "lending", "interest rate", "fraud", "aml", "anti-money laundering"
]


async def classify_relevance(title: str, text: str) -> dict:
    """
    Returns {"is_actionable": bool, "confidence": float, "reason": str}

    Strategy:
      1. Cheap keyword pre-filter — avoids LLM cost for obvious non-banking items.
      2. LLM triage (Gemini then Ollama) for anything that passes the keyword filter.
      3. On LLM failure: fail-OPEN to manual review (confidence=0.3), never to
         silent auto-ingestion.
    """
    combined = (title + " " + text).lower()

    # Step 1: keyword pre-filter
    has_banking_keyword = any(kw in combined for kw in BANKING_KEYWORDS)
    if not has_banking_keyword:
        return {
            "is_actionable": False,
            "confidence": 0.95,
            "reason": "No banking-relevance keywords matched — likely informational or non-banking entity."
        }

    # Step 2: LLM triage
    prompt = (
        "You are a compliance triage assistant for an Indian scheduled commercial bank.\n"
        "Decide if the following RBI notification requires operational action from the bank "
        "(as opposed to being informational-only, addressed to a different entity type, "
        "or a sanctions-list update with no direct bank action).\n"
        "Return ONLY valid JSON with no markdown: "
        "{\"is_actionable\": bool, \"confidence\": 0.0-1.0, \"reason\": \"one sentence\"}\n\n"
        f"TITLE: {title}\n\nTEXT (first 1500 chars):\n{text[:1500]}"
    )

    # Gemini
    if settings.LLM_MODE in ("auto", "online") and settings.GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={settings.GEMINI_API_KEY}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}
                    },
                    timeout=20.0
                )
                if response.status_code == 200:
                    data = response.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    import json
                    return json.loads(content.strip())
        except Exception as e:
            print(f"[Triage] Gemini call failed: {e}")

    # Ollama fallback
    if settings.LLM_MODE in ("auto", "local") and settings.USE_LOCAL_LLM:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/v1/chat/completions",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.0,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=60.0
                )
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    import json
                    return json.loads(content.strip())
        except Exception as e:
            print(f"[Triage] Ollama call failed: {e}")

    # Both failed — fail-open to human review (safe default)
    return {
        "is_actionable": True,
        "confidence": 0.3,
        "reason": "Triage LLM unavailable — routed to manual review as a safe default."
    }
