"""Sentiment analysis service using NewsAPI and TextBlob."""
from datetime import datetime, timedelta
from typing import List, Optional

from newsapi import NewsApiClient
from textblob import TextBlob
import structlog

from app.core.config import settings
from app.schemas.sentiment import NewsItem

log = structlog.get_logger()

class SentimentService:
    """Fetches news and calculates sentiment scores."""

    def __init__(self):
        self.newsapi = None
        if settings.NEWS_API_KEY:
            self.newsapi = NewsApiClient(api_key=settings.NEWS_API_KEY)

    async def get_news_with_sentiment(self, ticker: str) -> List[NewsItem]:
        """Fetch news for a ticker and calculate sentiment for each article."""
        if not self.newsapi:
            log.warning("news_api_key_missing", ticker=ticker)
            return []

        # Calculate date range (last 7 days)
        from_date = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        try:
            # Fetch news (blocking call, run in thread if many requests, but usually fine for simple use)
            # For brevity in this scaffold, we call it directly or could use asyncio.to_thread
            response = self.newsapi.get_everything(
                q=ticker,
                language='en',
                sort_by='relevancy',
                from_param=from_date
            )

            articles = response.get('articles', [])
            news_items = []

            for art in articles[:10]: # Limit to top 10
                text_to_analyze = f"{art.get('title', '')} {art.get('description', '')}"
                analysis = TextBlob(text_to_analyze)
                
                # Polarity is between [-1.0, 1.0]
                sentiment_score = round(analysis.sentiment.polarity, 4)
                
                if sentiment_score > 0.05:
                    label = "positive"
                elif sentiment_score < -0.05:
                    label = "negative"
                else:
                    label = "neutral"

                news_items.append(NewsItem(
                    title=art.get('title'),
                    source=art.get('source', {}).get('name'),
                    url=art.get('url'),
                    published_at=art.get('publishedAt'),
                    sentiment_score=sentiment_score,
                    sentiment_label=label
                ))

            return news_items

        except Exception as e:
            log.error("news_fetch_error", ticker=ticker, error=str(e))
            return []

sentiment_service = SentimentService()
