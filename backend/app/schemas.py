from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True 

# --- TOKEN SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- ACCOUNT SCHEMAS (PHẦN ĐANG BỊ THIẾU) ---
class AccountBase(BaseModel):
    name: str
    type: str # cash, bank, e_wallet...
    balance: float = 0.0

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    type: str # income (thu) hoặc expense (chi)

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    note: Optional[str] = None
    date: datetime = datetime.now()
    type: str # income, expense, transfer
    category_id: Optional[int] = None
    account_id: int
    to_account_id: Optional[int] = None # Chỉ dùng khi chuyển tiền

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class MonthlyReport(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    
    # Chi tiết theo từng danh mục (để vẽ biểu đồ tròn)
    expense_by_category: dict[str, float]