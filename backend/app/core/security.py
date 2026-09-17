from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import user as crud_user
from dotenv import load_dotenv

from app.crud import token_blacklist as crud_blacklist

import os
load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHM = os.getenv('ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 240))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(user_id: UUID, role: str, org_id: Optional[UUID], team_id: Optional[UUID]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "org_id": str(org_id) if org_id else None,
        "team_id": str(team_id) if team_id else None,
        "jti": str(uuid.uuid4()), #dung de blacklist
        "iat": datetime.now(timezone.utc),
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token khong hop le hoac da het han",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        jti = payload.get("jti")
        if user_id is None or jti is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    #Kiem tra token da bi logout/thu hoi chua o day
    if crud_blacklist.is_blacklisted(db, jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token da bi thu hoi, vui long dang nhap lai",
        )

    user = crud_user.get_user(db, user_id)
    if user is None or user["status"] != "active":
        raise credentials_exception
    return user # dict, cac router sau chi can Depends(get_current_user) la lay duoc role/org_id/team_id  