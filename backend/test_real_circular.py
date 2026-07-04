import asyncio
import httpx
import json

async def test():
    async with httpx.AsyncClient() as client:
        # Login
        login_res = await client.post("http://localhost:8000/api/v1/auth/login", json={
            "email": "arjun@canarabank.com",
            "password": "demo123"
        })
        print(login_res.json())
        token = login_res.json()["access_token"]
        
        payload = {
            "circular_number": "RBI/2026-27/123",
            "title": "Master Direction - Know Your Customer (KYC) Direction",
            "issued_date": "2026-07-01T00:00:00.000Z",
            "raw_text": """
RBI Master Direction - KYC (Update July 2026)
1. All banks must perform a Video-based Customer Identification Process (V-CIP) for all new accounts within 7 days of opening.
2. The IT department must ensure V-CIP logs are retained for 5 years in encrypted format (AES-256) within 30 days.
3. Branch managers are instructed to submit physical verification certificates for all medium-risk accounts every 3 months.
            """
        }
        
        try:
            response = await client.post(
                "http://localhost:8000/api/v1/circulars/ingest", 
                json=payload, 
                headers={"Authorization": f"Bearer {token}"},
                timeout=120.0
            )
            print(f"Status Code: {response.status_code}")
            print(json.dumps(response.json(), indent=2))
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
