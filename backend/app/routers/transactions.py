from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, crud, models
from ..dependencies import get_current_user

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)

@router.post("/", response_model=schemas.TransactionResponse)
def create_transaction(
    transaction: schemas.TransactionCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Kiểm tra ví có thuộc về user này không (Bảo mật)
    account = db.query(models.Account).filter(models.Account.id == transaction.account_id, models.Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or not owned by user")

    return crud.create_transaction(db=db, transaction=transaction, user_id=current_user.id)

@router.get("/", response_model=List[schemas.TransactionResponse])
def read_transactions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_transactions(db=db, user_id=current_user.id, skip=skip, limit=limit)