import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Secret key for Flask sessions
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "change-this-secret-key-in-vercel"
    )

    # Session security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Session lifetime: 30 minutes
    PERMANENT_SESSION_LIFETIME = 1800
