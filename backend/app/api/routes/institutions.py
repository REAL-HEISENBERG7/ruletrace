"""Institutions route: list institutions, get institution detail"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import Institution, User
from app.schemas.schemas import InstitutionOut

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("", response_model=List[InstitutionOut])
def list_institutions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Institution)
    if search:
        query = query.filter(
            Institution.name.ilike(f"%{search}%") | 
            Institution.aicte_id.ilike(f"%{search}%") |
            Institution.state.ilike(f"%{search}%")
        )
    return query.offset(skip).limit(limit).all()


@router.get("/{institution_id}", response_model=InstitutionOut)
def get_institution(
    institution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst
