from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from .. import database, schemas, crud, models
from ..dependencies import get_current_user

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

@router.get("/monthly", response_model=schemas.MonthlyReport)
def get_monthly_report(
    month: int = datetime.now().month, # Mặc định là tháng hiện tại
    year: int = datetime.now().year,   # Mặc định là năm hiện tại
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_monthly_report(db=db, user_id=current_user.id, month=month, year=year)