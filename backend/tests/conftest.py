"""conftest.py — pytest fixtures for backend tests."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client for the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Register a test user and return Authorization headers."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "username": "tester", "password": "Test1234!"},
    )
    res = await client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "Test1234!"},
    )
    token = res.json().get("access_token", "stub")
    return {"Authorization": f"Bearer {token}"}
