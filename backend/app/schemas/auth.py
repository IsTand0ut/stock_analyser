"""Pydantic schemas for authentication."""
from pydantic import BaseModel, EmailStr, constr


class RegisterRequest(BaseModel):
    email: EmailStr
    username: constr(strip_whitespace=True, min_length=3, max_length=32)
    password: constr(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=1, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
