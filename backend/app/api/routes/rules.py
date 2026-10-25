"""Rules and Traceability API routes"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import Rule, RuleSet, User
from app.schemas.schemas import RuleOut, RuleSetOut

router = APIRouter(prefix="/rules", tags=["Rule Intelligence & Traceability"])


@router.get("/sets", response_model=List[RuleSetOut])
def list_rule_sets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(RuleSet).filter(RuleSet.is_active == True).all()


@router.get("", response_model=List[RuleOut])
def list_rules(
    category_id: Optional[str] = None,
    check_type: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Rule)
    if category_id:
        query = query.filter((Rule.category_id == category_id) | (Rule.category_id.is_(None)))
    if check_type:
        query = query.filter(Rule.check_type == check_type)
    if severity:
        query = query.filter(Rule.severity == severity)
    if search:
        query = query.filter(
            Rule.code.ilike(f"%{search}%") |
            Rule.name.ilike(f"%{search}%") |
            Rule.clause.ilike(f"%{search}%") |
            Rule.annexure.ilike(f"%{search}%") |
            Rule.source_excerpt.ilike(f"%{search}%")
        )

    return query.offset(skip).limit(limit).all()


@router.get("/{rule_id}", response_model=RuleOut)
def get_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule
