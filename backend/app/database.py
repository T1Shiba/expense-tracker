import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

# Lấy đường dẫn DB từ file .env (để bảo mật password)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Nếu không tìm thấy biến môi trường, báo lỗi
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("Chưa cấu hình DATABASE_URL trong file .env")

# Tạo engine kết nối với Postgres
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()