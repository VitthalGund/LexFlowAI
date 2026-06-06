from datetime import datetime
from typing import Tuple, List, Dict
import dateutil.parser

def calculate_risk_score(telemetry: Dict) -> Tuple[float, List[str]]:
    """
    Calculate behavioral risk score. Higher = more suspicious.
    Score range: 0.0 (safe) to 1.0 (high risk)
    """
    score = 0.0
    flags = []
    
    # Parse timestamps
    submitted_at_str = telemetry.get("submitted_at")
    if isinstance(submitted_at_str, str):
        submitted_at = dateutil.parser.isoparse(submitted_at_str)
    elif isinstance(submitted_at_str, datetime):
        submitted_at = submitted_at_str
    else:
        submitted_at = datetime.now()
        
    time_on_page = float(telemetry.get("time_on_page_seconds", 0))
    max_scroll = float(telemetry.get("max_scroll_percent", 0))
    word_count = int(telemetry.get("word_count", 0))
    tab_switches = int(telemetry.get("tab_switches", 0))
    
    # === TIME-BASED SIGNALS ===
    hour = submitted_at.hour
    weekday = submitted_at.weekday()  # 0=Monday, 6=Sunday
    
    # Off-hours submission (10 PM to 6 AM)
    if hour < 6 or hour >= 22:
        score += 0.25
        flags.append(f"Submitted at {hour:02d}:00 (off-hours)")
    
    # Weekend submission
    if weekday >= 5:
        score += 0.10
        flags.append("Submitted on weekend")
        
    # === READING BEHAVIOR SIGNALS ===
    if time_on_page < 10:
        score += 0.40
        flags.append(f"Extremely short view: {time_on_page:.1f}s")
    elif time_on_page < 30:
        score += 0.20
        flags.append(f"Short view: {time_on_page:.1f}s")
        
    # Reading speed (words per minute)
    if time_on_page > 0 and word_count > 0:
        wpm = (word_count / time_on_page) * 60
        if wpm > 1000:
            score += 0.30
            flags.append(f"Impossible reading speed: {wpm:.0f} WPM")
        elif wpm > 500:
            score += 0.15
            flags.append(f"Very high reading speed: {wpm:.0f} WPM")
            
    # === SCROLL BEHAVIOR ===
    if max_scroll < 10:
        score += 0.30
        flags.append(f"Did not scroll document (max: {max_scroll:.0f}%)")
    elif max_scroll < 50:
        score += 0.15
        flags.append(f"Minimal scrolling (max: {max_scroll:.0f}%)")
        
    # === ENGAGEMENT SIGNALS ===
    if tab_switches > 5:
        score += 0.05
        flags.append(f"Excessive tab switching: {tab_switches} times")
        
    final_score = min(round(score, 2), 1.0)
    return final_score, flags

def build_quarantine_reason(score: float, flags: List[str]) -> str:
    if not flags:
        return f"High risk score: {score:.2f}."
    return f"High behavioral risk detected (score: {score:.2f}). Flags: {'; '.join(flags)}."
