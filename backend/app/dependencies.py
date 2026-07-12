from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EntityStatus, UserAccount, UserRole
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserAccount:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
    except InvalidTokenError as exc:
        raise credentials_error from exc

    if not user_id:
        raise credentials_error

    user = db.get(UserAccount, user_id)
    if user is None or user.status != EntityStatus.active:
        raise credentials_error
    return user


def require_roles(*roles: UserRole) -> Callable:
    def guard(current_user: UserAccount = Depends(get_current_user)) -> UserAccount:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
        return current_user

    return guard
