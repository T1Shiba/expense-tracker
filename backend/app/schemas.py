from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# USER
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
    class Config: from_attributes = True 

# TOKEN
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ACCOUNT
class AccountBase(BaseModel):
    name: str
    type: str
    balance: float = 0.0
    bank_name: Optional[str] = None # Thêm trường này

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    user_id: int
    class Config: from_attributes = True

# CATEGORY
class CategoryBase(BaseModel):
    name: str
    type: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    user_id: int
    class Config: from_attributes = True

# TRANSACTION
class TransactionBase(BaseModel):
    amount: float
    note: Optional[str] = None
    date: datetime = datetime.now()
    type: str
    category_id: Optional[int] = None
    account_id: int
    to_account_id: Optional[int] = None # Thêm trường này

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    class Config: from_attributes = True

# REPORT
class MonthlyReport(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    expense_by_category: dict[str, float]