import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
import hashlib
from app.core.config import settings
from app.core.security import get_password_hash as hash_password

DEMO_BRANCHES = [
    {"lgd_code": "2902001", "branch_name": "MG Road, Bengaluru", "district": "Bengaluru Urban", 
     "state": "Karnataka", "state_code": "29", "classification": "METRO", 
     "language_code": "kn", "lat": 12.9716, "lng": 77.5946},
    {"lgd_code": "2902002", "branch_name": "Mysuru Main Branch", "district": "Mysuru",
     "state": "Karnataka", "state_code": "29", "classification": "URBAN",
     "language_code": "kn", "lat": 12.2958, "lng": 76.6394},
    {"lgd_code": "2902003", "branch_name": "Hubli Branch", "district": "Dharwad",
     "state": "Karnataka", "state_code": "29", "classification": "URBAN",
     "language_code": "kn", "lat": 15.3647, "lng": 75.1240},
    {"lgd_code": "3302001", "branch_name": "Chennai Anna Salai", "district": "Chennai",
     "state": "Tamil Nadu", "state_code": "33", "classification": "METRO",
     "language_code": "ta", "lat": 13.0827, "lng": 80.2707},
    {"lgd_code": "3302002", "branch_name": "Coimbatore Main", "district": "Coimbatore",
     "state": "Tamil Nadu", "state_code": "33", "classification": "URBAN",
     "language_code": "ta", "lat": 11.0168, "lng": 76.9558},
    {"lgd_code": "3202001", "branch_name": "Thrissur Branch", "district": "Thrissur",
     "state": "Kerala", "state_code": "32", "classification": "URBAN",
     "language_code": "ml", "lat": 10.5276, "lng": 76.2144},
    {"lgd_code": "3202002", "branch_name": "Kochi Main Branch", "district": "Ernakulam",
     "state": "Kerala", "state_code": "32", "classification": "METRO",
     "language_code": "ml", "lat": 9.9312, "lng": 76.2673},
    {"lgd_code": "2702001", "branch_name": "Pune Deccan Branch", "district": "Pune",
     "state": "Maharashtra", "state_code": "27", "classification": "METRO",
     "language_code": "hi", "lat": 18.5204, "lng": 73.8567},
]

DEMO_CIRCULAR = {
    "circular_number": "RBI/2023-24/101",
    "title": "Master Direction on Information Technology and Cybersecurity Framework",
    "issuing_authority": "Reserve Bank of India",
    "issued_date": datetime.now(timezone.utc) - timedelta(days=5),
    "status": "PROCESSED",
    "raw_text": """
    RBI/2023-24/101 | Cybersecurity Framework

    1. All regulated entities shall ensure that internet-facing endpoints use TLS 1.3 
    protocol within 30 days of this circular.
    
    2. Multi-factor authentication shall be enabled for all privileged/administrator 
    accounts within 15 days. Evidence to be provided via system-generated access logs.
    
    3. All staff shall complete cybersecurity awareness training within 60 days. 
    Completion certificates to be submitted as evidence.
    
    4. Banks shall implement a formal data classification policy for sensitive customer 
    data within 45 days. Policy document to be uploaded as evidence.
    
    5. Incident response procedures shall be updated to include ransomware response 
    protocols within 30 days of this direction.
    """,
}

DEMO_MAPS = [
    {
        "title": "Update TLS to v1.3",
        "description": "All internet-facing endpoints must be configured to use TLS 1.3 protocol. This includes web banking portals, API gateways, and mobile app backends.",
        "kpi": "100% of internet-facing endpoints pass TLS 1.3 compliance scan with zero TLS 1.0/1.1 endpoints remaining",
        "deadline_days": 30,
        "department": "IT",
        "evidence_type": "LOG_FILE",
        "geographic_scope": "NATIONAL",
        "translations": {
            "kn": "ಎಲ್ಲಾ ಇಂಟರ್ನೆಟ್-ಫೇಸಿಂಗ್ ಎಂಡ್‌ಪಾಯಿಂಟ್‌ಗಳು TLS 1.3 ಅನ್ನು ಬಳಸಬೇಕು. ಇದರಲ್ಲಿ ವೆಬ್ ಬ್ಯಾಂಕಿಂಗ್ ಪೋರ್ಟಲ್‌ಗಳು, API ಗೇಟ್‌ವೇಗಳು ಮತ್ತು ಮೊಬೈಲ್ ಅಪ್ಲಿಕೇಶನ್ ಬ್ಯಾಕೆಂಡ್‌ಗಳು ಸೇರಿವೆ.",
            "ta": "அனைத்து இணையம் எதிர்கொள்ளும் முனைப்புள்ளிகளும் TLS 1.3 பயன்படுத்த வேண்டும். இதில் இணைய வங்கி இணையதளங்கள், API நுழைவாயில்கள் மற்றும் மொபைல் ஆப் பின்தளங்கள் அடங்கும்.",
            "ml": "എല്ലാ ഇന്റർനെറ്റ്-ഫേസിങ് എൻഡ്‌പോയിന്റുകളും TLS 1.3 ഉപയോഗിക്കണം. ഇതിൽ വെബ് ബാങ്കിംഗ് പോർട്ടലുകൾ, API ഗേറ്റ്‌വേകൾ, മൊബൈൽ ആപ്പ് ബാക്കെൻഡുകൾ എന്നിവ ഉൾപ്പെടുന്നു.",
            "hi": "सभी इंटरनेट-फेसिंग एंडपॉइंट्स पर TLS 1.3 का उपयोग करना आवश्यक है। इसमें वेब बैंकिंग पोर्टल, एपीआई गेटवे और मोबाइल ऐप बैकएंड शामिल हैं।"
        }
    },
    {
        "title": "Enable MFA for Admin Accounts",
        "description": "Multi-factor authentication must be enabled for all privileged and administrator accounts across all banking systems.",
        "kpi": "Zero admin accounts without MFA as verified by access management system audit log",
        "deadline_days": 15,
        "department": "IT",
        "evidence_type": "SCREENSHOT",
        "geographic_scope": "NATIONAL",
        "translations": {
            "kn": "ಎಲ್ಲಾ ನಿರ್ವಾಹಕ ಖಾತೆಗಳಿಗೆ MFA ಸಕ್ರಿಯಗೊಳಿಸಿ. ಸಿಸ್ಟಮ್ ಪ್ರವೇಶ ಲಾಗ್‌ಗಳ ಮೂಲಕ ಸಾಕ್ಷ್ಯವನ್ನು ಒದಗಿಸಬೇಕು.",
            "ta": "அனைத்து நிர்வாகி கணக்குகளுக்கும் MFA இயக்கவும். கணினி அணுகல் பதிவுகள் மூலம் சான்றுகள் வழங்கப்பட வேண்டும்.",
            "ml": "എല്ലാ അഡ്മിൻ അക്കൗണ്ടുകൾക്കും MFA പ്രാപ്തമാക്കുക. സിസ്റ്റം ആക്സസ് ലോഗുകൾ വഴി തെളിവ് നൽകണം.",
            "hi": "सभी व्यवस्थापक खातों के लिए MFA सक्षम करें। एक्सेस लॉग के माध्यम से साक्ष्य प्रदान किया जाना चाहिए।"
        }
    },
    {
        "title": "Cybersecurity Awareness Training",
        "description": "All bank staff must complete mandatory cybersecurity awareness training.",
        "kpi": "100% staff training completion rate as shown in LMS completion report",
        "deadline_days": 60,
        "department": "HR",
        "evidence_type": "CERTIFICATE",
        "geographic_scope": "NATIONAL",
        "translations": {
            "kn": "ಎಲ್ಲಾ ಸಿಬ್ಬಂದಿ ಕಡ್ಡಾಯ ಸೈಬರ್ ಭದ್ರತಾ ತರಬೇತಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಬೇಕು.",
            "ta": "அனைத்து ஊழியர்களும் இணைய பாதுகாப்பு விழிப்புணர்வு பயிற்சியை முடிக்க வேண்டும்.",
            "ml": "എല്ലാ ജീവനക്കാരും നിർബന്ധിത സൈബർ സുരക്ഷാ പരിശീലനം പൂർത്തിയാക്കണം.",
            "hi": "सभी बैंक कर्मचारियों को साइबर सुरक्षा जागरूकता प्रशिक्षण पूरा करना होगा।"
        }
    },
]

async def seed_demo_data():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    
    # Clear existing demo data
    await db.branches.delete_many({})
    await db.circulars.delete_many({})
    await db.maps.delete_many({})
    await db.users.delete_many({})
    await db.evidence_vault.delete_many({})
    await db.horizon_signals.delete_many({})
    
    # Seed branches
    await db.branches.insert_many(DEMO_BRANCHES)
    print(f"✓ Seeded {len(DEMO_BRANCHES)} branches")
    
    # Seed circular
    circular = {**DEMO_CIRCULAR, "maps_count": len(DEMO_MAPS)}
    result = await db.circulars.insert_one(circular)
    circular_id = str(result.inserted_id)
    print(f"✓ Seeded circular: {circular_id}")
    
    # Seed MAPs
    maps_with_ids = []
    for idx, m in enumerate(DEMO_MAPS):
        m["_id"] = f"MAP-2024-00{idx+1}"
        m["circular_id"] = circular_id
        m["status"] = "PENDING"
        m["target_lgd_codes"] = [b["lgd_code"] for b in DEMO_BRANCHES]
        m["deadline"] = datetime.now(timezone.utc) + timedelta(days=m["deadline_days"])
        m["behavioral_risk_score"] = 0.0
        m["evidence_hash"] = None
        maps_with_ids.append(m)
    
    await db.maps.insert_many(maps_with_ids)
    print(f"✓ Seeded {len(DEMO_MAPS)} MAPs")
    
    # Seed demo users
    users = [
        {"email": "arjun@canarabank.com", "name": "Arjun Mehta", 
         "role": "COMPLIANCE_OFFICER", "password_hash": hash_password("demo123")},
        {"email": "priya@canarabank.com", "name": "Priya Nair",
         "role": "BRANCH_MANAGER", "branch_lgd_code": "3202001",
         "language": "ml", "password_hash": hash_password("demo123")},
        {"email": "ravi@canarabank.com", "name": "Ravi Kumar",  # The compliance villain
         "role": "BRANCH_MANAGER", "branch_lgd_code": "2902002",
         "language": "kn", "password_hash": hash_password("demo123")},
        {"email": "inspector@rbi.org.in", "name": "RBI Inspector",
         "role": "AUDITOR", "password_hash": hash_password("demo123")},
        {"email": "it_eng@canarabank.com", "name": "Karan Johar",
         "role": "IT_ENGINEER", "password_hash": hash_password("demo123")},
    ]
    await db.users.insert_many(users)
    print(f"✓ Seeded {len(users)} users")
    
    # Seed pre-built evidence scenarios
    # Scenario 1: Legitimate submission (Priya Nair)
    legitimate_content = b"TLS 1.3 Security Scan Report - Branch KL-001\nScan Date: 2024-06-10\nAll endpoints: PASS\nTLS 1.0: NONE\nTLS 1.1: NONE\nTLS 1.3: 47/47 endpoints COMPLIANT"
    legitimate_hash = hashlib.sha256(legitimate_content).hexdigest()
    
    await db.evidence_vault.insert_one({
        "map_id": "MAP-2024-001",
        "circular_id": circular_id,
        "branch_lgd_code": "3202001",
        "uploader_id": "temp_priya_id",
        "uploader_name": "Priya Nair",
        "file_name": "tls_scan_thrissur.pdf",
        "file_size_bytes": len(legitimate_content),
        "sha256_hash": legitimate_hash,
        "uploaded_at": datetime.now(timezone.utc) - timedelta(hours=2),
        "behavioral_risk_score": 0.12,
        "vault_status": "ACCEPTED",
        "quarantine_reason": None,
        "telemetry_snapshot": {
            "time_on_page_seconds": 487.0,
            "max_scroll_percent": 94.0,
            "word_count": 1200,
            "submitted_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        }
    })
    
    # Update Map status in DB
    await db.maps.update_one(
        {"_id": "MAP-2024-001"},
        {"$set": {"status": "VERIFIED", "evidence_hash": legitimate_hash}}
    )
    
    # Scenario 2: Quarantined submission (Ravi Kumar - the villain)
    dummy_content = b"dummy"
    quarantine_hash = hashlib.sha256(dummy_content).hexdigest()
    
    await db.evidence_vault.insert_one({
        "map_id": "MAP-2024-002",
        "circular_id": circular_id,
        "branch_lgd_code": "2902002",
        "uploader_id": "temp_ravi_id",
        "uploader_name": "Ravi Kumar",
        "file_name": "mfa_report.pdf",
        "file_size_bytes": 5,
        "sha256_hash": quarantine_hash,
        "uploaded_at": datetime.now(timezone.utc) - timedelta(hours=1),
        "behavioral_risk_score": 0.87,
        "vault_status": "QUARANTINED",
        "quarantine_reason": "High behavioral risk (0.87). Flags: Submitted at off-hours; Extremely short view: 4.2s; Did not scroll document (max: 3%); Impossible reading speed: 1714 WPM.",
        "telemetry_snapshot": {
            "time_on_page_seconds": 4.2,
            "max_scroll_percent": 3.0,
            "word_count": 1200,
            "submitted_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        }
    })
    
    await db.maps.update_one(
        {"_id": "MAP-2024-002"},
        {"$set": {"status": "QUARANTINED", "behavioral_risk_score": 0.87}}
    )
    
    # Seed mock_system_state for ContinuumGuard
    await db.mock_system_state.delete_many({})
    now = datetime.now(timezone.utc)

    mock_states = [
        {"branch_lgd_code": "2902001", "key": "tls_version", "value": "1.3", "updated_at": now},
        {"branch_lgd_code": "2902002", "key": "tls_version", "value": "1.2", "updated_at": now}, # Drifted!
        {"branch_lgd_code": "2902001", "key": "mfa_enabled", "value": "true", "updated_at": now},
        {"branch_lgd_code": "2902002", "key": "mfa_enabled", "value": "false", "updated_at": now}, # Drifted!
        {"branch_lgd_code": "2902001", "key": "password_rotation_days", "value": "90", "updated_at": now},
        {"branch_lgd_code": "2902002", "key": "password_rotation_days", "value": "120", "updated_at": now}, # Drifted!
    ]
    await db.mock_system_state.insert_many(mock_states)
    print("✓ Seeded mock system states for ContinuumGuard")

    # Seed mock horizon signals for LexFlow Horizon
    mock_signals = [
        {
            "title": "Governor's Address on Digital Lending and Customer Data Safety",
            "theme": "Digital Lending",
            "link": "https://www.rbi.org.in/speeches/speech_digital_lending_safety.html",
            "detected_at": now - timedelta(days=1),
            "confidence": 0.88,
            "rationale": "The RBI Governor explicitly warned that digital lending platforms must strengthen data residency audits or face enforcement actions within the next 3 to 6 months.",
            "estimated_action_window_days": 90,
            "status": "DETECTED",
            "prep_map_id": None
        },
        {
            "title": "Deputy Governor Speech: Cybersecurity Resilience of PSU Banks",
            "theme": "Cybersecurity",
            "link": "https://www.rbi.org.in/speeches/speech_cybersec_resilience.html",
            "detected_at": now - timedelta(days=2),
            "confidence": 0.76,
            "rationale": "Indicated that RBI is drafting a revised master direction on cloud security architectures and third-party IT risk management.",
            "estimated_action_window_days": 120,
            "status": "DETECTED",
            "prep_map_id": None
        }
    ]
    
    await db.horizon_signals.insert_many(mock_signals)
    print("✓ Seeded mock horizon signals for LexFlow Horizon")
    
    # Create the third signal with linked MAP
    from bson import ObjectId
    sig3_id = ObjectId()
    map_id = f"MAP-HORIZON-{str(sig3_id)[-8:]}"
    
    sig3 = {
        "_id": sig3_id,
        "title": "Master Circular Preview: Tokenisation of Card Transactions",
        "theme": "Tokenisation",
        "link": "https://www.rbi.org.in/speeches/tokenisation_preview.html",
        "detected_at": now - timedelta(days=4),
        "confidence": 0.95,
        "rationale": "Draft tokenisation guidelines released, indicating upcoming mandatory token-only database rules for recurring payments.",
        "estimated_action_window_days": 60,
        "status": "PREP_STARTED",
        "prep_map_id": map_id
    }
    
    await db.horizon_signals.insert_one(sig3)
    
    # Seed the corresponding anticipatory MAP for the tokenisation signal
    await db.maps.insert_one({
        "_id": map_id,
        "circular_id": f"HORIZON-{str(sig3_id)[-8:]}",
        "title": f"[Anticipatory] {sig3['title']}",
        "description": f"Preparatory actions for upcoming regulatory changes regarding {sig3['theme']}.\nRationale: {sig3['rationale']}\nSource link: {sig3['link']}",
        "kpi": "Draft compliance blueprint, risk analysis, and department policy gap report completed.",
        "deadline_days": 60,
        "deadline": now + timedelta(days=60),
        "department": "RISK",
        "evidence_type": "POLICY_DOC",
        "geographic_scope": "NATIONAL",
        "target_lgd_codes": [],
        "translations": {},
        "status": "PENDING",
        "behavioral_risk_score": 0.0,
        "evidence_hash": None,
        "remediation_payload": None,
        "is_anticipatory": True,
        "horizon_signal_id": str(sig3_id)
    })
    print("✓ Seeded active anticipatory blueprint map")
    
    print("\n🎉 Demo data seed complete!")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())


async def seed_regulatory_sources():
    """
    Idempotent seed: inserts the RBI notifications RSS feed as a regulatory source
    if the regulatory_sources collection is empty.
    Uses the db_connection singleton (not a new Motor client).
    """
    from app.core.database import db_connection
    db = db_connection.db
    if db is None:
        return

    count = await db.regulatory_sources.count_documents({})
    if count > 0:
        return

    sources = [
        {
            "name": "RBI Notifications & Circulars",
            "url": "https://www.rbi.org.in/notifications_rss.xml",
            "feed_type": "NOTIFICATIONS",
            "poll_interval_minutes": 15,
            "is_active": True,
            "last_polled_at": None,
            "last_success_at": None,
            "consecutive_failures": 0
        },
        {
            "name": "RBI Press Releases (Enforcement Actions)",
            "url": "https://www.rbi.org.in/pressreleases_rss.xml",
            "feed_type": "PRESS_RELEASES",
            "poll_interval_minutes": 60,
            "is_active": True,
            "last_polled_at": None,
            "last_success_at": None,
            "consecutive_failures": 0
        },
        {
            "name": "RBI Speeches — LexFlow Horizon",
            "url": "https://www.rbi.org.in/speeches_rss.xml",
            "feed_type": "SPEECHES",
            "poll_interval_minutes": 60,
            "is_active": True,
            "last_polled_at": None,
            "last_success_at": None,
            "consecutive_failures": 0
        },
        {
            "name": "RBI Publications — LexFlow Horizon",
            "url": "https://www.rbi.org.in/Publication_rss.xml",
            "feed_type": "PUBLICATIONS",
            "poll_interval_minutes": 120,
            "is_active": True,
            "last_polled_at": None,
            "last_success_at": None,
            "consecutive_failures": 0
        }
    ]
    await db.regulatory_sources.insert_many(sources)
    print(f"✓ Seeded {len(sources)} regulatory sources")

