"""User management routes (Administrator only)"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.core.security import hash_password
from app.db.database import get_db
from app.models.models import AuditEvent, User, UserRole
from app.schemas.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    try:
        role_enum = UserRole(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid user role: {body.role}")

    new_user = User(
        email=body.email.lower().strip(),
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=role_enum,
        institution_id=body.institution_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    db.add(AuditEvent(
        user_id=current_user.id,
        event_type="user_created",
        entity_type="user",
        entity_id=new_user.id,
        description=f"User '{new_user.email}' created with role '{new_user.role.value}' by Administrator {current_user.email}.",
    ))
    db.commit()

    return new_user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = []
    if body.full_name is not None:
        user.full_name = body.full_name
        changes.append(f"name: {body.full_name}")
    if body.role is not None:
        try:
            user.role = UserRole(body.role)
            changes.append(f"role: {body.role}")
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid user role: {body.role}")
    if body.is_active is not None:
        user.is_active = body.is_active
        changes.append(f"active: {body.is_active}")

    db.commit()
    db.refresh(user)

    db.add(AuditEvent(
        user_id=current_user.id,
        event_type="user_updated",
        entity_type="user",
        entity_id=user.id,
        description=f"User '{user.email}' updated by {current_user.email}: {', '.join(changes)}",
    ))
    db.commit()

    return user
