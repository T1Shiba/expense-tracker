from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime
from . import models, schemas, security

# USER
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email, username=user.username, full_name=user.full_name,
        password_hash=hashed_password, is_active=True, created_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ACCOUNT
def create_account(db: Session, account: schemas.AccountCreate, user_id: int):
    db_account = models.Account(**account.dict(), user_id=user_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

def get_accounts(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Account).filter(models.Account.user_id == user_id).offset(skip).limit(limit).all()

# CATEGORY
def create_category(db: Session, category: schemas.CategoryCreate, user_id: int):
    db_category = models.Category(**category.dict(), user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_categories(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Category).filter(models.Category.user_id == user_id).offset(skip).limit(limit).all()

# TRANSACTION (LOGIC CHUYỂN TIỀN Ở ĐÂY)
def create_transaction(db: Session, transaction: schemas.TransactionCreate, user_id: int):
    db_transaction = models.Transaction(**transaction.dict(), user_id=user_id)
    db.add(db_transaction)
    
    # Cập nhật số dư
    account = db.query(models.Account).filter(models.Account.id == transaction.account_id).first()
    if account:
        if transaction.type == "expense":
            account.balance -= transaction.amount
        elif transaction.type == "income":
            account.balance += transaction.amount
        elif transaction.type == "transfer" and transaction.to_account_id:
            # Trừ ví nguồn
            account.balance -= transaction.amount
            # Cộng ví đích
            to_account = db.query(models.Account).filter(models.Account.id == transaction.to_account_id).first()
            if to_account:
                to_account.balance += transaction.amount

    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

def delete_transaction(db: Session, transaction_id: int, user_id: int):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
    if transaction:
        # Hoàn tiền khi xóa
        account = db.query(models.Account).filter(models.Account.id == transaction.account_id).first()
        if account:
            if transaction.type == "expense":
                account.balance += transaction.amount
            elif transaction.type == "income":
                account.balance -= transaction.amount
            elif transaction.type == "transfer" and transaction.to_account_id:
                account.balance += transaction.amount
                to_account = db.query(models.Account).filter(models.Account.id == transaction.to_account_id).first()
                if to_account:
                    to_account.balance -= transaction.amount
        
        db.delete(transaction)
        db.commit()
        return True
    return False

# REPORT
def get_monthly_report(db: Session, user_id: int, month: int, year: int):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).all()

    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    
    expense_by_category = {}
    for t in transactions:
        if t.type == "expense":
            cat_name = t.category.name if t.category else "Khác"
            expense_by_category[cat_name] = expense_by_category.get(cat_name, 0) + t.amount

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "expense_by_category": expense_by_category
    }