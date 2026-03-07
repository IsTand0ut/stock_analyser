from pydantic import BaseModel
from typing import Optional

class NewsItem(BaseModel):
    title: Optional[str]
    source: Optional[str]
    url: Optional[str]
    published_at: Optional[str]
    sentiment_score: float
    sentiment_label: str
