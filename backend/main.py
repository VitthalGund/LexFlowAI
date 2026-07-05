from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, db_connection
from app.routers import circulars, maps, evidence, telemetry, branches, dashboard, auth, remediation, risk_review, monitoring, horizon, continuum
from app.core.scheduler import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    print("Connected to MongoDB database successfully!")

    if settings.SEED_DEMO_DATA:
        print("SEED_DEMO_DATA is True. Seeding database...")
        from app.utils.demo_data import seed_demo_data
        await seed_demo_data()

    # Seed regulatory sources if not already present
    from app.utils.demo_data import seed_regulatory_sources
    await seed_regulatory_sources()

    # Seed penalty precedents if not already present
    from app.utils.penalty_precedents_seed import seed_penalty_precedents
    await seed_penalty_precedents()

    # Start RegulatorWatcher scheduler
    start_scheduler()

    yield

    # Shutdown
    shutdown_scheduler()
    await close_mongo_connection()
    print("Closed MongoDB connection.")

app = FastAPI(
    title="LexFlow AI API",
    description="Autonomous Regulatory Compliance Enforcement Platform Backend",
    version="1.0.0",
    lifespan=lifespan
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
app.include_router(remediation.router)
app.include_router(risk_review.router)
app.include_router(monitoring.router)
app.include_router(horizon.router)
app.include_router(continuum.router)

@app.get("/health")
async def health():
    db_status = "ok" if db_connection.client is not None else "disconnected"
    return {
        "status": "ok", 
        "service": "LexFlow AI Backend", 
        "environment": settings.APP_ENV,
        "database": db_status
    }
