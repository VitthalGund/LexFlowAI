from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/continuum", tags=["Continuous Compliance"])


@router.get("/drift-alerts", response_model=List[dict])
async def list_drift_alerts(
    status: Optional[str] = None,
    map_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List compliance drift alerts."""
    query = {}
    if status:
        query["status"] = status
    if map_id:
        query["map_id"] = map_id

    alerts = await db.compliance_drift_alerts.find(query).sort("detected_at", -1).to_list(length=100)
    for a in alerts:
        a["id"] = str(a["_id"])
        del a["_id"]
    return alerts


@router.post("/drift-alerts/{alert_id}/acknowledge", response_model=dict)
async def acknowledge_drift_alert(
    alert_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Acknowledge an active drift alert."""
    if current_user.get("role") not in ("COMPLIANCE_OFFICER", "REGIONAL_HEAD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only compliance officers can acknowledge compliance drift alerts."
        )

    try:
        alert = await db.compliance_drift_alerts.find_one({"_id": ObjectId(alert_id)})
    except Exception:
        alert = None

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drift alert {alert_id} not found"
        )

    await db.compliance_drift_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {
            "status": "ACKNOWLEDGED",
            "resolved_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Compliance drift alert acknowledged."}


@router.get("/system-state", response_model=List[dict])
async def list_system_state(
    branch_lgd_code: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List current mock system states."""
    query = {}
    if branch_lgd_code:
        query["branch_lgd_code"] = branch_lgd_code

    states = await db.mock_system_state.find(query).to_list(length=100)
    for s in states:
        s["id"] = str(s["_id"])
        del s["_id"]
    return states


@router.post("/simulate-drift", response_model=dict)
async def simulate_drift(
    branch_lgd_code: str,
    key: str,
    value: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Demo endpoint: Toggle/simulate system state values to trigger compliance drift.
    Example: Change 'tls_version' from '1.3' to '1.2' to trigger a drift alert.
    """
    if current_user.get("role") not in ("COMPLIANCE_OFFICER", "IT_ENGINEER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only IT engineers or compliance officers can simulate drift."
        )

    # Upsert the system state
    await db.mock_system_state.update_one(
        {"branch_lgd_code": branch_lgd_code, "key": key},
        {"$set": {
            "value": value,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    # Trigger policy evaluation immediately for demo responsiveness
    # Let's find any MAP linked to this key to test compliance
    # E.g. KPI key matches or department is IT
    # If the simulated state violates a policy, we will create a drift alert.
    
    # We find all MAPs where the title/description mentions this key or department is IT/RISK
    # For a real implementation, we would match policies.
    # For simplicity, we just trigger the evaluation cycle.
    
    # Run the continuous compliance check function (defined in scheduler or as service helper)
    # We'll import it here to execute it synchronously.
    try:
        from app.routers.continuum import run_compliance_evaluation
        alerts_created = await run_compliance_evaluation(db)
        return {
            "message": f"System state updated. Simulated state: {key}={value}.",
            "alerts_created": len(alerts_created)
        }
    except Exception as e:
        print(f"[ContinuumGuard] Immediate compliance evaluation failed: {e}")
        return {
            "message": f"System state updated. Simulated state: {key}={value}.",
            "evaluation_status": f"Evaluation ran asynchronously or failed: {e}"
        }


async def run_compliance_evaluation(db: AsyncIOMotorDatabase) -> List[dict]:
    """
    Core continuous compliance evaluation routine.
    Loads active policies/MAPs, checks mock system state against them,
    and inserts ComplianceDriftAlerts.
    """
    from app.services.policy_engine import evaluate_policy, generate_rego_policy, push_policy

    # Find verified MAPs that are subject to Policy-as-Code
    # In a real setup, we would check if a policy is defined/pushed.
    # For demo purposes, we automatically map:
    # - MAPs with "tls" in title/desc to check key="tls_version", operator="==", threshold="1.3"
    # - MAPs with "mfa" in title/desc to check key="mfa_enabled", operator="==", threshold="true"
    # - MAPs with "password" in title/desc to check key="password_rotation_days", operator="<=", threshold="90"
    
    maps = await db.maps.find({"status": "VERIFIED"}).to_list(length=100)
    alerts_created = []

    for m in maps:
        map_id = str(m["_id"])
        title = m.get("title", "").lower()
        desc = m.get("description", "").lower()
        combined = title + " " + desc

        kpi_key = None
        operator = "=="
        threshold = ""

        if "tls" in combined:
            kpi_key = "tls_version"
            operator = "=="
            threshold = "1.3"
        elif "mfa" in combined or "multi-factor" in combined:
            kpi_key = "mfa_enabled"
            operator = "=="
            threshold = "true"
        elif "password" in combined:
            kpi_key = "password_rotation_days"
            operator = "<="
            threshold = "90"

        if not kpi_key:
            continue

        # Generate and push policy to OPA
        rego_code = generate_rego_policy(map_id, kpi_key, operator, threshold)
        await push_policy(map_id, rego_code)

        # Evaluate for each branch assigned to this MAP
        # If the MAP is national or has target_lgd_codes, check those
        target_branches = m.get("target_lgd_codes", [])
        if not target_branches:
            # Fallback to checking all mock branch states
            cursor = db.mock_system_state.find({"key": kpi_key})
            mock_states = await cursor.to_list(length=100)
        else:
            mock_states = await db.mock_system_state.find({
                "branch_lgd_code": {"$in": target_branches},
                "key": kpi_key
            }).to_list(length=100)

        for state in mock_states:
            branch_lgd = state["branch_lgd_code"]
            curr_val = state["value"]

            # Evaluate policy in OPA
            compliant, err = await evaluate_policy(map_id, {kpi_key: curr_val})
            if err:
                print(f"[ContinuumGuard] Policy evaluation warning for MAP {map_id}: {err}")
                # OPA offline or error, skip creating alert to prevent false alerts
                if compliant is None:
                    continue

            if compliant is False and not err:
                # Compliance drift detected! Check if an open alert already exists
                existing_alert = await db.compliance_drift_alerts.find_one({
                    "map_id": map_id,
                    "branch_lgd_code": branch_lgd,
                    "status": "OPEN"
                })

                if not existing_alert:
                    alert_doc = {
                        "map_id": map_id,
                        "policy_id": f"policy_{map_id.replace('-', '_')}",
                        "branch_lgd_code": branch_lgd,
                        "detected_at": datetime.now(timezone.utc),
                        "previous_value": threshold if operator == "==" else "Compliant",
                        "current_value": curr_val,
                        "threshold": f"{kpi_key} {operator} {threshold}",
                        "status": "OPEN",
                        "resolved_at": None
                    }
                    await db.compliance_drift_alerts.insert_one(alert_doc)
                    alert_doc["id"] = str(alert_doc["_id"])
                    del alert_doc["_id"]
                    alerts_created.append(alert_doc)
                    print(f"[ContinuumGuard] Compliance DRIFT alert created for MAP {map_id} at branch {branch_lgd}!")
            
            elif compliant is True:
                # If currently compliant, resolve any open alerts
                await db.compliance_drift_alerts.update_many(
                    {"map_id": map_id, "branch_lgd_code": branch_lgd, "status": "OPEN"},
                    {"$set": {
                        "status": "RESOLVED",
                        "resolved_at": datetime.now(timezone.utc)
                    }}
                )

    return alerts_created
