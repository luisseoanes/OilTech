from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

# Default to local file, but allow override via environment variable for Railway Volumes
# Railway Volume Mount Path usually needs to be absolute
VOLUME_PATH = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", ".")
DB_NAME = "oiltech.db"

# Construct the full path.
DB_URL_PATH = os.path.abspath(os.path.join(VOLUME_PATH, DB_NAME))

# Ensure slashes are forward slashes for SQLite URL (especially on Windows)
normalized_path = DB_URL_PATH.replace("\\", "/")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{normalized_path}"

print(f"Using Database at: {SQLALCHEMY_DATABASE_URL}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
