# backend/app/main.py
from pathlib import Path
import os

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.db.session import get_db
from app.core.limiter import limiter
from app.routers import auth, user, organization, crop, plot, team, season, farming_log, log_note, tasks, havest_batches, batch_seasons

app = FastAPI(
    title="AgriTrace - Farmer QuickLog API",
    description="Hệ thống quản lý sản xuất nông nghiệp kỹ thuật số: Nông trại, Nhân sự, Mùa vụ, Nhiệm vụ, Lô thu hoạch và Truy xuất nguồn gốc.",
    version="1.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Đăng ký các router nghiệp vụ
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(password_recovery.router, prefix="/auth", tags=["Auth"])
app.include_router(user.router, prefix="/users", tags=["User"])
app.include_router(organization.router, prefix="/organizations", tags=["Organization"])
app.include_router(crop.router, prefix="/crops", tags=["CropCatalog"])
app.include_router(plot.router, prefix="/plots", tags=["Plot"])
app.include_router(team.router, prefix="/teams", tags=["Team"])
app.include_router(season.router, prefix="/seasons", tags=["Season"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(havest_batches.router, prefix="/harvest-batches", tags=["HarvestBatches"])
app.include_router(batch_seasons.router, prefix="/batch-seasons", tags=["BatchSeasons"])
app.include_router(farming_log.router, prefix="/farming-logs", tags=["FarmingLog"])
app.include_router(log_note.router, prefix="/log-notes", tags=["LogNote"])


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "message": "Backend da ket noi thanh cong voi Database"}


# Cac router se duoc gan vao day khi lam CRUD, vi du:
# from app.routers import farm
# app.include_router(farm.router, prefix="/farms", tags=["Farms"])