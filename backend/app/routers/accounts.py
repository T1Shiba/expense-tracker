from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, crud, models
from ..dependencies import get_current_user # Import hàm bảo vệ vừa tạo

router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"]
)

# 1. Tạo ví mới (Bắt buộc phải đăng nhập)
@router.post("/", response_model=schemas.AccountResponse)
def create_account(
    account: schemas.AccountCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user) 
):
    # Hàm này sẽ tự động lấy ID của user đang đăng nhập gán vào ví
    return crud.create_account(db=db, account=account, user_id=current_user.id)

# 2. Xem danh sách ví của mình
@router.get("/", response_model=List[schemas.AccountResponse])
def read_accounts(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Chỉ lấy ví của user đang đăng nhập
    return crud.get_accounts(db=db, user_id=current_user.id, skip=skip, limit=limit)