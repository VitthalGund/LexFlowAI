import io
import sys
import types
from unittest.mock import AsyncMock

import numpy as np
import pytest
from PIL import Image, ImageDraw

from app.routers.continuum import run_compliance_evaluation
from app.services import lexgraph, policy_engine
from app.services.forensics import (
    _count_pdf_revision_markers,
    check_pdf_integrity,
    run_forensics_gate,
)


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


class FakeHttpClient:
    def __init__(self, response=None, exc=None, captures=None):
        self.response = response
        self.exc = exc
        self.captures = captures if captures is not None else []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, **kwargs):
        self.captures.append({"url": url, **kwargs})
        if self.exc:
            raise self.exc
        return self.response


@pytest.mark.asyncio
async def test_evaluate_policy_returns_unknown_on_opa_connection_error(monkeypatch):
    monkeypatch.setattr(
        policy_engine.httpx,
        "AsyncClient",
        lambda: FakeHttpClient(exc=TimeoutError("offline")),
    )

    compliant, err = await policy_engine.evaluate_policy("MAP-1", {"tls_version": "1.3"})

    assert compliant is None
    assert "OPA offline" in err


@pytest.mark.asyncio
async def test_evaluate_policy_returns_compliant_and_non_compliant(monkeypatch):
    monkeypatch.setattr(
        policy_engine.httpx,
        "AsyncClient",
        lambda: FakeHttpClient(FakeResponse(payload={"result": {"compliant": True}})),
    )
    assert await policy_engine.evaluate_policy("MAP-1", {"tls_version": "1.3"}) == (True, None)

    monkeypatch.setattr(
        policy_engine.httpx,
        "AsyncClient",
        lambda: FakeHttpClient(FakeResponse(payload={"result": {"compliant": False}})),
    )
    assert await policy_engine.evaluate_policy("MAP-1", {"tls_version": "1.2"}) == (False, None)


@pytest.mark.asyncio
async def test_evaluate_policy_malformed_result_is_non_compliant_warning(monkeypatch):
    monkeypatch.setattr(
        policy_engine.httpx,
        "AsyncClient",
        lambda: FakeHttpClient(FakeResponse(payload={"result": {}})),
    )

    compliant, err = await policy_engine.evaluate_policy("MAP-1", {"tls_version": "1.2"})

    assert compliant is False
    assert "missing" in err.lower()


class FakeInsertResult:
    inserted_id = "alert-1"


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length):
        return self.docs[:length]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []
        self.updated = []

    def find(self, query):
        def matches(doc):
            for key, expected in query.items():
                actual = doc.get(key)
                if isinstance(expected, dict) and "$in" in expected:
                    if actual not in expected["$in"]:
                        return False
                elif actual != expected:
                    return False
            return True

        return FakeCursor([doc for doc in self.docs if matches(doc)])

    async def find_one(self, query):
        return next((doc for doc in self.find(query).docs), None)

    async def insert_one(self, doc):
        doc["_id"] = FakeInsertResult.inserted_id
        self.docs.append(doc)
        return FakeInsertResult()

    async def update_many(self, query, update):
        self.updated.append((query, update))
        for doc in self.find(query).docs:
            doc.update(update.get("$set", {}))


class FakeDb:
    def __init__(self):
        self.maps = FakeCollection([
            {
                "_id": "MAP-1",
                "status": "VERIFIED",
                "title": "Update TLS",
                "description": "Require TLS 1.3",
                "target_lgd_codes": ["001"],
            }
        ])
        self.mock_system_state = FakeCollection([
            {"branch_lgd_code": "001", "key": "tls_version", "value": "1.2"}
        ])
        self.compliance_drift_alerts = FakeCollection([
            {"map_id": "MAP-1", "branch_lgd_code": "001", "status": "OPEN"}
        ])


@pytest.mark.asyncio
async def test_continuum_unknown_opa_result_keeps_existing_alert_open(monkeypatch):
    db = FakeDb()
    monkeypatch.setattr("app.services.policy_engine.push_policy", AsyncMock(return_value=True))
    monkeypatch.setattr("app.services.policy_engine.evaluate_policy", AsyncMock(return_value=(None, "OPA offline")))

    created = await run_compliance_evaluation(db)

    assert created == []
    assert db.compliance_drift_alerts.docs[0]["status"] == "OPEN"
    assert db.compliance_drift_alerts.updated == []


@pytest.mark.asyncio
async def test_continuum_resolves_alert_only_on_true_compliance(monkeypatch):
    db = FakeDb()
    monkeypatch.setattr("app.services.policy_engine.push_policy", AsyncMock(return_value=True))
    monkeypatch.setattr("app.services.policy_engine.evaluate_policy", AsyncMock(return_value=(True, None)))

    await run_compliance_evaluation(db)

    assert db.compliance_drift_alerts.docs[0]["status"] == "RESOLVED"


@pytest.mark.asyncio
async def test_continuum_creates_alert_only_on_false_without_error(monkeypatch):
    db = FakeDb()
    db.compliance_drift_alerts.docs = []
    monkeypatch.setattr("app.services.policy_engine.push_policy", AsyncMock(return_value=True))
    monkeypatch.setattr("app.services.policy_engine.evaluate_policy", AsyncMock(return_value=(False, None)))

    created = await run_compliance_evaluation(db)

    assert len(created) == 1
    assert db.compliance_drift_alerts.docs[0]["status"] == "OPEN"


@pytest.mark.asyncio
async def test_llm_gemini_uses_provider_timeout(monkeypatch):
    captures = []
    monkeypatch.setattr(lexgraph.settings, "LLM_MODE", "online")
    monkeypatch.setattr(lexgraph.settings, "GEMINI_API_KEY", "key")
    monkeypatch.setattr(
        "httpx.AsyncClient",
        lambda: FakeHttpClient(
            FakeResponse(payload={"candidates": [{"content": {"parts": [{"text": "{}"}]}}]}),
            captures=captures,
        ),
    )

    await lexgraph._call_llm_raw("prompt")

    assert captures[0]["timeout"] == 30.0


@pytest.mark.asyncio
async def test_llm_ollama_uses_local_timeout(monkeypatch):
    captures = []
    monkeypatch.setattr(lexgraph.settings, "LLM_MODE", "local")
    monkeypatch.setattr(lexgraph.settings, "USE_LOCAL_LLM", True)
    monkeypatch.setattr(
        "httpx.AsyncClient",
        lambda: FakeHttpClient(
            FakeResponse(payload={"choices": [{"message": {"content": "{}"}}]}),
            captures=captures,
        ),
    )

    await lexgraph._call_llm_raw("prompt")

    assert captures[0]["timeout"] == 90.0


@pytest.mark.asyncio
async def test_extraction_falls_back_to_demo_maps_after_llm_failures(monkeypatch):
    monkeypatch.setattr(lexgraph.settings, "LLM_MODE", "local")
    monkeypatch.setattr(lexgraph.settings, "USE_LOCAL_LLM", True)
    monkeypatch.setattr("httpx.AsyncClient", lambda: FakeHttpClient(exc=TimeoutError("slow")))

    maps = await lexgraph.call_llm_for_extraction("circular")

    assert maps == lexgraph.DEMO_MAPS_EXTRACTION


def _base_state(**overrides):
    state = {
        "circular_id": "C-1",
        "circular_text": "",
        "raw_maps": [],
        "validated_maps": [],
        "validation_errors": [],
        "remediation_payloads": [],
        "iteration_count": 1,
        "status": "red_team_reviewed",
        "decision_log": [],
        "red_team_critique": "issue",
        "red_team_severity": "low",
    }
    state.update(overrides)
    return state


def test_red_team_routing_uses_state_severity():
    assert lexgraph.should_loop_after_red_team(_base_state(red_team_severity="high")) == "extract"
    assert lexgraph.should_loop_after_red_team(_base_state(red_team_severity="low")) == "route"
    assert lexgraph.should_loop_after_red_team(_base_state(red_team_severity="high", iteration_count=3)) == "route"


def test_pdf_revision_marker_helper_detects_multiple_revisions():
    pdf_bytes = b"%PDF-1.4\nstartxref\n1\n%%EOF\nstartxref\n2\n%%EOF\n"

    assert _count_pdf_revision_markers(pdf_bytes) == 2


def test_check_pdf_integrity_emits_incremental_update_signal(monkeypatch):
    class FakePdf:
        docinfo = {}

        def open_metadata(self):
            return self

        def __enter__(self):
            return {}

        def __exit__(self, exc_type, exc, tb):
            return False

        def close(self):
            pass

    monkeypatch.setitem(sys.modules, "pikepdf", types.SimpleNamespace(open=lambda _: FakePdf()))

    penalty, signals = check_pdf_integrity(b"%PDF-1.4\nstartxref\n1\n%%EOF\nstartxref\n2\n%%EOF\n")

    assert penalty >= 0.15
    assert any("incremental updates" in signal for signal in signals)


def _jpeg_bytes(image, quality=92):
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_ela_clean_generated_photo_like_image_is_clean():
    image = Image.new("RGB", (128, 128))
    draw = ImageDraw.Draw(image)
    for x in range(128):
        color = (80 + x // 3, 110 + x // 4, 140 + x // 5)
        draw.line((x, 0, x, 127), fill=color)

    verdict = await run_forensics_gate(_jpeg_bytes(image), "clean.jpg")

    assert verdict.verdict == "CLEAN"


@pytest.mark.asyncio
async def test_ela_repeated_low_quality_resave_is_not_likely_tampered():
    image = Image.new("RGB", (128, 128), "white")
    draw = ImageDraw.Draw(image)
    for i in range(0, 128, 8):
        draw.line((0, i, 127, i), fill=(120, 120, 120))

    data = _jpeg_bytes(image, quality=55)
    for _ in range(3):
        image = Image.open(io.BytesIO(data)).convert("RGB")
        data = _jpeg_bytes(image, quality=55)

    verdict = await run_forensics_gate(data, "forwarded.jpg")

    assert verdict.verdict != "LIKELY_TAMPERED"


@pytest.mark.asyncio
async def test_ela_composited_image_is_at_least_suspicious():
    base = Image.new("RGB", (180, 180), (180, 180, 180))
    base_bytes = _jpeg_bytes(base, quality=65)
    edited = Image.open(io.BytesIO(base_bytes)).convert("RGB")
    rng = np.random.default_rng(1)
    patch = Image.fromarray(rng.integers(0, 256, (160, 160, 3), dtype=np.uint8), "RGB")
    edited.paste(patch, (10, 10))
    edited_bytes = _jpeg_bytes(edited, quality=95)

    verdict = await run_forensics_gate(edited_bytes, "edited.jpg")

    assert verdict.verdict in {"SUSPICIOUS", "LIKELY_TAMPERED"}
