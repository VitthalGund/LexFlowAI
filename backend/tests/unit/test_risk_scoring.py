from datetime import datetime
from app.services.behavior import calculate_risk_score

def test_risk_scoring_legitimate():
    """Verify that a normal, patient reading behavior results in a low risk score."""
    # Submitted during active business hours (10:00 AM on Monday)
    telemetry = {
      "time_on_page_seconds": 450.0,  # 7.5 minutes
      "max_scroll_percent": 95.0,
      "word_count": 800,              # ~100 WPM (legitimate reading pace)
      "tab_switches": 0,
      "submitted_at": "2026-06-08T10:00:00Z" # Monday morning
    }
    
    score, flags = calculate_risk_score(telemetry)
    assert score < 0.3
    assert len(flags) == 0

def test_risk_scoring_box_ticking_fraud():
    """Verify that an extremely fast submit results in quarantine threshold trigger (>= 0.6)."""
    # Submitted at off-hours (11:47 PM on Sunday)
    telemetry = {
      "time_on_page_seconds": 4.2,    # 4.2 seconds
      "max_scroll_percent": 3.0,      # Glanced only
      "word_count": 1200,             # Reading speed > 17000 WPM
      "tab_switches": 2,
      "submitted_at": "2026-06-07T23:47:00Z" # Sunday night
    }
    
    score, flags = calculate_risk_score(telemetry)
    assert score >= 0.6
    assert "off-hours" in "".join(flags)
    assert "short view" in "".join(flags)
    assert "Impossible reading speed" in "".join(flags)
    assert "scroll" in "".join(flags)

def test_risk_scoring_off_hours_only():
    """Verify that only submitting at off-hours/weekends is flagged but below quarantine."""
    telemetry = {
      "time_on_page_seconds": 300.0,
      "max_scroll_percent": 85.0,
      "word_count": 500,
      "tab_switches": 0,
      "submitted_at": "2026-06-07T23:30:00Z" # Sunday off-hours
    }
    
    score, flags = calculate_risk_score(telemetry)
    # 0.25 (off-hours) + 0.10 (weekend) = 0.35
    assert score == 0.35
    assert len(flags) == 2
