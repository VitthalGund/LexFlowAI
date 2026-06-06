from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.routers import circulars, maps, evidence, telemetry, branches, dashboard, auth

app = FastAPI(
    title="LexFlow AI API",
    description="Autonomous Regulatory Compliance Enforcement Platform Backend",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(circulars.router)
app.include_router(maps.router)
app.include_router(evidence.router)
app.include_router(telemetry.router)
app.include_router(branches.router)
app.include_router(dashboard.router)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    print("Connected to MongoDB database successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    print("Closed MongoDB connection.")

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "service": "LexFlow AI Backend", 
        "environment": settings.APP_ENV
    }
