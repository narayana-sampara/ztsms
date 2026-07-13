from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EntityStatus, UserAccount
from app.schemas import AuthRequest, AuthResponse
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(request: AuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    identifier = request.identifier.strip()
    if identifier.isdigit() and len(identifier) == 10:
        user = db.query(UserAccount).filter(UserAccount.phone == identifier).one_or_none()
    else:
        user = db.query(UserAccount).filter(UserAccount.email == identifier.lower()).one_or_none()

    if user is None or user.status != EntityStatus.active or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email/phone or password.")
    return create_access_token(user)
