from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text # <--- Import thêm cái này để chạy SQL thuần
from .database import engine
from . import models
# Import tất cả các router
from .routers import auth, accounts, categories, transactions, reports

# Tự động tạo bảng khi khởi động (nếu chưa có)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Expense Tracker API",
    description="Hệ thống API quản lý chi tiêu cá nhân",
    version="1.0.0"
)

# --- CẤU HÌNH CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ĐĂNG KÝ ROUTER ---
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {
        "message": "Expense Tracker API is running smoothly!",
        "docs_url": "/docs",
        "status": "live"
    }

# --- API RESET DATABASE (PHIÊN BẢN CASCADE MẠNH MẼ) ---
@app.get("/reset-database-force")
def reset_database_force():
    try:
        # Sử dụng Raw SQL với CASCADE để xóa bất chấp ràng buộc khóa ngoại
        # Liệt kê tất cả tên bảng cần xóa
        drop_query = text("DROP TABLE IF EXISTS budgets, transactions, categories, accounts, users CASCADE;")
        
        with engine.begin() as conn:
            conn.execute(drop_query)
            
        # Tạo lại bảng mới tinh từ đầu
        models.Base.metadata.create_all(bind=engine)
        
        return {"message": "Đã xóa sạch Database (CASCADE) và tạo lại bảng mới thành công!"}
    except Exception as e:
        return {"error": str(e)}