from sqlalchemy import create_engine # type: ignore
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker # type: ignore

from app.config import get_settings

settings = get_settings()

_connect_args = {}
if settings.database_url.startswith("postgresql"):
    _connect_args["prepare_threshold"] = None

engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


