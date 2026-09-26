import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "aurelius-dev-key-change-in-production")
    DATABASE = os.path.join(BASE_DIR, "database", "airline.db")
    JSON_SORT_KEYS = False
