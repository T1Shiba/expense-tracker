from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models
from .routers import auth, accounts, categories, transactions, reports

# Tạo bảng trong database tự động
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Expense Tracker API")

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(reports.router)
# Cấu hình CORS (để sau này Frontend gọi được)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello Bro! API Expense Tracker đã chạy ngon lành!"}