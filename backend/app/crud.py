from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas, security
from sqlalchemy import extract

# --- USER CRUD ---
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    
    db_user = models.User(
        email=user.email, 
        username=user.username, 
        full_name=user.full_name,
        password_hash=hashed_password,
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- ACCOUNT CRUD ---
def create_account(db: Session, account: schemas.AccountCreate, user_id: int):
    db_account = models.Account(**account.dict(), user_id=user_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

def get_accounts(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Account).filter(models.Account.user_id == user_id).offset(skip).limit(limit).all()

def create_category(db: Session, category: schemas.CategoryCreate, user_id: int):
    db_category = models.Category(**category.dict(), user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_categories(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Category).filter(models.Category.user_id == user_id).offset(skip).limit(limit).all()

def create_transaction(db: Session, transaction: schemas.TransactionCreate, user_id: int):
    # 1. Lưu giao dịch
    db_transaction = models.Transaction(**transaction.dict(), user_id=user_id)
    db.add(db_transaction)
    
    # 2. Cập nhật số dư ví (Logic tự động)
    account = db.query(models.Account).filter(models.Account.id == transaction.account_id).first()
    
    if account:
        if transaction.type == "expense":
            account.balance -= transaction.amount # Chi tiêu thì trừ tiền
        elif transaction.type == "income":
            account.balance += transaction.amount # Thu nhập thì cộng tiền
        elif transaction.type == "transfer" and transaction.to_account_id:
            # Trừ tiền ví nguồn
            account.balance -= transaction.amount
            # Cộng tiền ví đích
            to_account = db.query(models.Account).filter(models.Account.id == transaction.to_account_id).first()
            if to_account:
                to_account.balance += transaction.amount

    # 3. Commit thay đổi (Lưu cả giao dịch và số dư mới)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Transaction).filter(models.Transaction.user_id == user_id).offset(skip).limit(limit).all()

def get_monthly_report(db: Session, user_id: int, month: int, year: int):
    # 1. Lấy tất cả giao dịch trong tháng đó
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).all()

    # 2. Tính toán
    total_income = 0
    total_expense = 0
    expense_by_category = {}

    for t in transactions:
        if t.type == "income":
            total_income += t.amount
        elif t.type == "expense":
            total_expense += t.amount
            
            # Cộng dồn theo danh mục (nếu có danh mục)
            cat_name = t.category.name if t.category else "Khác"
            if cat_name in expense_by_category:
                expense_by_category[cat_name] += t.amount
            else:
                expense_by_category[cat_name] = t.amount

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "expense_by_category": expense_by_category
    }