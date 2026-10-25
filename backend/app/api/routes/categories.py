"""Categories and Checklists routes"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import ApplicationCategory, ChecklistTemplate, User
from app.schemas.schemas import CategoryOut, ChecklistItemOut

router = APIRouter(prefix="/categories", tags=["Application Categories"])


@router.get("", response_model=List[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ApplicationCategory).filter(ApplicationCategory.is_active == True).all()


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = db.query(ApplicationCategory).filter(ApplicationCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.get("/{category_id}/checklist", response_model=List[ChecklistItemOut])
def get_category_checklist(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(ChecklistTemplate)
        .filter(ChecklistTemplate.category_id == category_id, ChecklistTemplate.is_active == True)
        .order_by(ChecklistTemplate.sort_order.asc())
        .all()
    )
    return items
