from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models
from .routers import auth, accounts, categories, transactions, reports

# Tạo bảng tự động
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Expense Tracker API")

# --- CẤU HÌNH CORS (SỬA ĐOẠN NÀY) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả mọi nguồn truy cập (Quan trọng nhất)
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các phương thức (GET, POST, PUT...)
    allow_headers=["*"],  # Cho phép tất cả các header
)
# ------------------------------------

# Đăng ký các router
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {"message": "Expense Tracker API is running!"}