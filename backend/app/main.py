from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models
# Import tất cả các router (API) đã xây dựng
from .routers import auth, accounts, categories, transactions, reports

# Lệnh này tự động tạo bảng trong DB nếu chưa có (quan trọng khi chạy lần đầu)
models.Base.metadata.create_all(bind=engine)

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="Expense Tracker API",
    description="Hệ thống API quản lý chi tiêu cá nhân (Bài tập lớn)",
    version="1.0.0"
)

# --- CẤU HÌNH CORS (QUAN TRỌNG) ---
# Cho phép Frontend (Localhost hoặc Vercel) gọi được API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả các nguồn
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các phương thức (GET, POST, DELETE...)
    allow_headers=["*"],  # Cho phép tất cả các header
)

# --- ĐĂNG KÝ CÁC ROUTER VÀO APP ---
app.include_router(auth.router)          # API Đăng ký/Đăng nhập
app.include_router(accounts.router)      # API Ví tiền
app.include_router(categories.router)    # API Danh mục
app.include_router(transactions.router)  # API Giao dịch (Thu/Chi)
app.include_router(reports.router)       # API Báo cáo thống kê

# --- ROOT ENDPOINT (Trang chủ API) ---
@app.get("/")
def read_root():
    return {
        "message": "Expense Tracker API is running smoothly!",
        "docs_url": "/docs",
        "status": "live"
    }

# --- (TIỆN ÍCH) API RESET DATABASE ---
# Dùng để xóa sạch dữ liệu và tạo lại bảng khi cấu trúc thay đổi (Fix lỗi trên Render)
@app.get("/reset-database-force")
def reset_database_force():
    try:
        # Xóa toàn bộ bảng cũ
        models.Base.metadata.drop_all(bind=engine)
        # Tạo lại bảng mới theo code models.py hiện tại
        models.Base.metadata.create_all(bind=engine)
        return {"message": "Database has been reset successfully! All data cleared."}
    except Exception as e:
        return {"error": str(e)}