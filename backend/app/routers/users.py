from fastapi import APIRouter, Depends
from app.schemas.user import UserRead
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user information."""
    return current_user
