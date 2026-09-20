# backend/app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.db.session import get_db
from app.core.limiter import limiter
from app.routers import auth, user

app = FastAPI(title="AgriTrace - Farmer QuickLog API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(user.router, prefix="/users", tags=["User"])



@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "message": "Backend da ket noi thanh cong voi Database"}


# Cac router se duoc gan vao day khi lam CRUD, vi du:
# from app.routers import farm
# app.include_router(farm.router, prefix="/farms", tags=["Farms"])
