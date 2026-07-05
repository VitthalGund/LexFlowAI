"""
ContinuumGuard Policy Engine — Open Policy Agent (OPA) Integration.
Generates Rego policy code from MAP KPIs, pushes it to OPA,
and evaluates branch telemetry states against active policies.
"""
import httpx
import re
from typing import Optional, Tuple
from app.core.config import settings

def clean_policy_id(map_id: str) -> str:
    """Format map_id to be a valid Rego package segment (no hyphens/spaces)."""
    return re.sub(r"[^a-zA-Z0-9_]", "_", map_id)


def generate_rego_policy(map_id: str, kpi_key: str, operator: str, threshold: str) -> str:
    """
    Generate Rego code for the specified MAP compliance parameters.
    Supports operators: ==, !=, >, <, >=, <=
    """
    clean_id = clean_policy_id(map_id)
    
    # Clean operator input
    if operator not in ("==", "!=", ">", "<", ">=", "<="):
        operator = "=="

    # Determine if threshold is numeric for mathematical operators
    is_numeric = False
    try:
        float(threshold)
        is_numeric = True
    except ValueError:
        pass

    threshold_val = threshold if is_numeric else f'"{threshold}"'
    input_val = f"to_number(input.{kpi_key})" if (is_numeric and kpi_key != "mfa_enabled") else f"input.{kpi_key}"

    rego = f"""package compliance.policy_{clean_id}

default compliant = false

compliant {{
    # Ensure key exists
    input.{kpi_key}
    
    # Check compliance condition
    {input_val} {operator} {threshold_val}
}}
"""
    return rego


async def push_policy(policy_id: str, rego_source: str) -> bool:
    """Push Rego policy text to OPA REST API."""
    clean_id = clean_policy_id(policy_id)
    url = f"{settings.OPA_BASE_URL.rstrip('/')}/v1/policies/policy_{clean_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                url,
                content=rego_source,
                headers={"Content-Type": "text/plain"},
                timeout=5.0
            )
            if response.status_code == 200:
                print(f"[ContinuumGuard] Policy policy_{clean_id} successfully pushed to OPA.")
                return True
            else:
                print(f"[ContinuumGuard] OPA returned error pushing policy: {response.text}")
                return False
    except Exception as e:
        print(f"[ContinuumGuard] Failed to connect to OPA at {url}: {e}")
        return False


async def evaluate_policy(policy_id: str, input_state: dict) -> Tuple[Optional[bool], Optional[str]]:
    """
    Evaluate current system state input against policy in OPA.
    Returns (compliant, error_message). compliant=None means OPA did not
    produce an authoritative result, so callers must not create or resolve alerts.
    """
    clean_id = clean_policy_id(policy_id)
    url = f"{settings.OPA_BASE_URL.rstrip('/')}/v1/data/compliance/policy_{clean_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={"input": input_state},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                result = data.get("result", {})
                
                # If OPA returns empty dict/None, it means the policy is not loaded or default was not hit.
                # Treat as non-compliant/warning.
                if result is None or "compliant" not in result:
                    return False, "Policy rule result missing in OPA response (policy might not be loaded)."
                
                return bool(result["compliant"]), None
            else:
                return None, f"OPA evaluation returned status code {response.status_code}: {response.text}"
    except Exception as e:
        # OPA is down or unreachable: keep existing alert state unchanged.
        print(f"[ContinuumGuard] OPA evaluation connection error to {url}: {e}")
        return None, f"OPA offline: {str(e)}"
