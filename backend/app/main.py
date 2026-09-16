from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.routers import auth

app = FastAPI(title="AgriTrace - Farmer QuickLog API")

app.include_router(auth.router, prefix="/auth", tags=["Auth"])


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Deliverable tuan 1-3: API Hello World + ket noi thanh cong Database."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "message": "Backend da ket noi thanh cong voi Database"}


# Cac router se duoc gan vao day khi lam CRUD, vi du:
# from app.routers import farm
# app.include_router(farm.router, prefix="/farms", tags=["Farms"])
