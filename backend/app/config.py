"""Central configuration for the GigShift backend.

All env-var access lives here. Never read os.getenv outside this file.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_ROOT / "data"


class Config:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")

    ZAI_API_KEY: str | None = os.getenv("ZAI_API_KEY") or None
    ZAI_API_URL: str = os.getenv("ZAI_API_URL", "https://api.z.ai/v1")

    OPENWEATHER_API_KEY: str | None = os.getenv("OPENWEATHER_API_KEY") or None

    DB_PATH: Path = Path(
        os.getenv("GIGSHIFT_DB_PATH") or str(BACKEND_ROOT / "gigshift.db")
    )

    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    DEBUG: bool = os.getenv("FLASK_DEBUG", "1") == "1"

    CITY: str = "Kuala Lumpur"
    COUNTRY_CODE: str = "MY"

    MAX_CONTEXT_TOKENS: int = 6000
    PLAN_TIMEOUT_SECONDS: int = 30
