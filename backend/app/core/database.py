from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import asyncio

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_connection = Database()

async def connect_to_mongo():
    retries = 3
    for attempt in range(retries):
        try:
            db_connection.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000
            )
            # Force connection check
            await db_connection.client.admin.command('ping')
            db_connection.db = db_connection.client[settings.MONGODB_DB_NAME]
            print("Successfully connected to MongoDB")
            return
        except Exception as e:
            print(f"MongoDB connection failed (attempt {attempt + 1}/{retries}): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2)
            else:
                print("Failed to connect to MongoDB after multiple attempts. Is it running?")
                # Don't raise, just let it fail gracefully or let dependent routes fail

async def close_mongo_connection():
    if db_connection.client:
        db_connection.client.close()

async def get_db():
    if db_connection.db is None:
        raise Exception("Database connection not initialized")
    return db_connection.db
