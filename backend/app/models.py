from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base

# Định nghĩa các loại Enum
class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"

class AccountType(str, enum.Enum):
    CASH = "cash"
    BANK = "bank"
    E_WALLET = "e_wallet"
    CREDIT = "credit"

# 1. Bảng Người dùng (Đã thêm is_active)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)  # <--- DÒNG NÀY QUAN TRỌNG
    created_at = Column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="owner")
    categories = relationship("Category", back_populates="owner")
    transactions = relationship("Transaction", back_populates="owner")
    budgets = relationship("Budget", back_populates="owner")

# 2. Bảng Tài khoản/Ví
class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String, default=AccountType.CASH)
    balance = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", foreign_keys="[Transaction.account_id]", back_populates="account")

# 3. Bảng Danh mục
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String) # income hoặc expense
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")

# 4. Bảng Giao dịch
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    note = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    type = Column(String)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)

    owner = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    account = relationship("Account", foreign_keys=[account_id], back_populates="transactions")

# 5. Bảng Ngân sách
class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    month = Column(Integer)
    year = Column(Integer)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))

    owner = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")