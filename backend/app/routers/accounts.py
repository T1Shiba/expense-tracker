from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, crud, models
from ..dependencies import get_current_user

router = APIRouter(prefix="/accounts", tags=["Accounts"])

SUPPORTED_BANKS = [
    "Vietcombank", "Techcombank", "MBBank", "VPBank", "BIDV", 
    "VietinBank", "ACB", "TPBank", "Sacombank", "Momo", "ZaloPay", "ViettelMoney"
]

@router.get("/banks-list")
def get_supported_banks():
    return SUPPORTED_BANKS

@router.post("/", response_model=schemas.AccountResponse)
def create_account(account: schemas.AccountCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_account(db=db, account=account, user_id=current_user.id)

@router.get("/", response_model=List[schemas.AccountResponse])
def read_accounts(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_accounts(db=db, user_id=current_user.id, skip=skip, limit=limit)