from contextlib import asynccontextmanager

from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from app.config import get_settings
from app.logging import setup_logging
from app.routers import ai, analytics, auth, calendar, goals, todos

settings = get_settings()
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Goal Tracker API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(goals.router)
app.include_router(todos.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(calendar.router)


@app.get("/health")
def health():
    return {"status": "ok"}
