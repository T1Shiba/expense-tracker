from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, crud, models
from ..dependencies import get_current_user

router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)

@router.post("/", response_model=schemas.CategoryResponse)
def create_category(
    category: schemas.CategoryCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_category(db=db, category=category, user_id=current_user.id)

@router.get("/", response_model=List[schemas.CategoryResponse])
def read_categories(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_categories(db=db, user_id=current_user.id, skip=skip, limit=limit)