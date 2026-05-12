from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/constructcrm"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    APP_NAME: str = "ConstructCRM"
    DEBUG: bool = True
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""        # Free — get at console.groq.com
    GEMINI_API_KEY: str = ""      # Free tier — get at aistudio.google.com
    HF_API_KEY: str = ""          # Free — get at huggingface.co/settings/tokens
    HF_SENTENCE_MODEL: str = ""  # After training: set to "your_username/devis-matcher"
    UPLOAD_DIR: str = "uploads"
    OLLAMA_MODEL: str = ""        # Local Ollama model (e.g. "qwen2.5-coder:latest") for offline LLM fallback
    OLLAMA_BASE_URL: str = ""     # Defaults to http://localhost:11434/v1 in ai_reader if blank

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
