"""Options chain service stub."""


class OptionsService:
    """Fetches options chain and computes Greeks for nearest expiry."""

    async def get_chain(self, ticker: str) -> dict:
        # TODO: implement with yfinance options API
        raise NotImplementedError("OptionsService.get_chain not yet implemented")


options_service = OptionsService()
