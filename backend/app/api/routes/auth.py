"""Auth routes: login, me"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import User, AuditEvent
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower().strip(), User.is_active == True).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    token = create_access_token(subject=user.id, role=user.role.value)

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)

    db.add(AuditEvent(
        user_id=user.id,
        event_type="user_login",
        entity_type="user",
        entity_id=user.id,
        description=f"User '{user.email}' logged in.",
    ))
    db.commit()

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
