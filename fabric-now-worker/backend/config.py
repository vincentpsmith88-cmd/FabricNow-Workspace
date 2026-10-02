"""Shared settings and API clients for the Fabric Now worker."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")  # local dev; in Docker/hosting, real env vars are used

# --- image generation (OpenAI only: the Claude API does not generate images) ---
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2.5-sunburst")
FALLBACK_IMAGE_MODEL = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-image-1.5")
IMAGE_SIZE = os.getenv("OPENAI_IMAGE_SIZE", "1536x1024")
IMAGE_QUALITY = os.getenv("OPENAI_IMAGE_QUALITY", "high")
TILE_SIZE = os.getenv("OPENAI_TILE_SIZE", "1024x1024")

# --- vision (reads photos, plans pieces, reviews sheets, writes listings) ---
# VISION_PROVIDER=anthropic uses Claude first and falls back to OpenAI (and vice versa) when a key exists.
VISION_PROVIDER = os.getenv("VISION_PROVIDER", "anthropic").strip().lower()
OPENAI_VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-4.1")
ANTHROPIC_VISION_MODEL = os.getenv("ANTHROPIC_VISION_MODEL", "claude-sonnet-5-5")
REVIEW_ENABLED = os.getenv("SHEET_REVIEW", "1") not in ("0", "false", "no")

MAX_ATTEMPTS = int(os.getenv("MAX_ATTEMPTS", "2"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
RATE_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", "20"))
RETENTION_H = int(os.getenv("RETENTION_HOURS", "72"))
MAX_BATCH = int(os.getenv("MAX_BATCH", "10"))
INTERNAL_SECRET = os.getenv("FABRIC_NOW_INTERNAL_SECRET", "")
ACCESS_TOKEN = os.getenv("ACCESS_TOKEN", "")
ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:8080").split(",") if o.strip()]
JOBS = Path(os.getenv("DATA_DIR", "./data")) / "jobs"
JOBS.mkdir(parents=True, exist_ok=True)

_openai = None
_anthropic = None


def has_openai() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


def has_anthropic() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def openai_client():
    global _openai
    if _openai is None:
        if not has_openai():
            raise ValueError("The server has no OPENAI_API_KEY configured.")
        import openai
        _openai = openai.OpenAI(timeout=300, max_retries=2)
    return _openai


def anthropic_client():
    global _anthropic
    if _anthropic is None:
        if not has_anthropic():
            raise ValueError("The server has no ANTHROPIC_API_KEY configured.")
        import anthropic
        _anthropic = anthropic.Anthropic(timeout=180, max_retries=2)
    return _anthropic
