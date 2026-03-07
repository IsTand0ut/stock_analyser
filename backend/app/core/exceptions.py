from fastapi import Request
from fastapi.responses import JSONResponse


# ---------------------------------------------------------------------------
# Custom exception classes
# ---------------------------------------------------------------------------
class StockNotFoundError(Exception):
    def __init__(self, ticker: str):
        self.ticker = ticker
        super().__init__(f"Ticker '{ticker}' not found or is delisted.")


class ExternalAPIError(Exception):
    def __init__(self, provider: str, detail: str):
        self.provider = provider
        self.detail = detail
        super().__init__(f"External API error ({provider}): {detail}")


class PortfolioNotFoundError(Exception):
    def __init__(self, portfolio_id: int):
        self.portfolio_id = portfolio_id
        super().__init__(f"Portfolio {portfolio_id} not found.")


class UnauthorizedError(Exception):
    pass


# ---------------------------------------------------------------------------
# Exception handlers — register these in main.py
# ---------------------------------------------------------------------------
async def stock_not_found_handler(request: Request, exc: StockNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": "STOCK_NOT_FOUND",
            "message": str(exc),
            "ticker": exc.ticker,
        },
    )


async def external_api_error_handler(request: Request, exc: ExternalAPIError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "error": "EXTERNAL_API_ERROR",
            "provider": exc.provider,
            "message": exc.detail,
        },
    )


async def portfolio_not_found_handler(request: Request, exc: PortfolioNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": "PORTFOLIO_NOT_FOUND",
            "message": str(exc),
        },
    )
