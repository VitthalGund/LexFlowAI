from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os
import secrets

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "lexflow_hackathon"
    
    JWT_SECRET_KEY: str = "lexflow-super-secret-key-for-hackathon-min-32-chars-update-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    
    BANK_SECRET_KEY: str = "canara-bank-super-secret-key"
    
    # LLM Settings
    LLM_MODE: str = "auto" # 'online', 'local', 'auto'
    
    GEMINI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    SARVAM_BASE_URL: str = "https://api.sarvam.ai"
    
    OPENAI_API_KEY: str = ""
    USE_OPENAI_FALLBACK: bool = False
    
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gaganyatri/sarvam-2b-v0.5:latest"
    USE_LOCAL_LLM: bool = True
    
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    SEED_DEMO_DATA: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
