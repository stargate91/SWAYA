from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import String, Integer, Enum as SQLEnum, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import CacheBase
from app.core.enums import Provider, MediaType, CacheStatus

class APICache(CacheBase):
    __tablename__ = "api_caches"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    cache_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    external_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    media_type: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSON)
    status_code: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[CacheStatus] = mapped_column(SQLEnum(CacheStatus), default=CacheStatus.VALID, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
