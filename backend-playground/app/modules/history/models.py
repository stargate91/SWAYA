from datetime import datetime, timezone
from typing import List, Optional, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Enum as SQLEnum, JSON, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import ActionType, ActionStatus

if TYPE_CHECKING:
    from app.modules.users.models import User
    from app.modules.library.models import MediaItem, ExtraFile

class PlaybackLog(Base):
    __tablename__ = "playback_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), default=1, index=True)
    media_item_id: Mapped[int] = mapped_column(ForeignKey("media_items.id", ondelete="CASCADE"), index=True)
    watched_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    position_seconds: Mapped[int] = mapped_column(Integer, default=0)
    session_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    completion_rate: Mapped[float] = mapped_column(Float, default=0.0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    watched_ranges: Mapped[Optional[List[Any]]] = mapped_column(JSON, nullable=True) # e.g. [[0, 120], [300, 600]]
    seek_events: Mapped[Optional[List[Any]]] = mapped_column(JSON, nullable=True) # e.g. [{"from": 120, "to": 300}]
    
    user: Mapped["User"] = relationship("User", back_populates="playback_logs")
    media_item: Mapped["MediaItem"] = relationship("MediaItem", back_populates="playback_logs")

class PlaybackPeakLog(Base):
    __tablename__ = "playback_peak_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), default=1, index=True)
    media_item_id: Mapped[int] = mapped_column(ForeignKey("media_items.id", ondelete="CASCADE"), index=True)
    peak_type: Mapped[str] = mapped_column(String, default="peak", index=True) # "peak" (O-count), "bookmark", "highlight", "chapter"
    video_position: Mapped[int] = mapped_column(Integer, index=True) # Start position in seconds
    end_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # Optional end position for time ranges
    label: Mapped[Optional[str]] = mapped_column(String, nullable=True) # e.g. "Voldemort returns" or "favorite scene"
    snapshot_path: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class ActionBatch(Base):
    __tablename__ = "action_batches"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), default=1, index=True)
    name: Mapped[Optional[str]] = mapped_column(String)
    is_reversible: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    logs: Mapped[List["ActionLog"]] = relationship(back_populates="batch", cascade="all, delete-orphan")

class ActionLog(Base):
    __tablename__ = "action_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("action_batches.id", ondelete="CASCADE"), index=True)
    media_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_items.id", ondelete="SET NULL"), nullable=True, index=True)
    extra_file_id: Mapped[Optional[int]] = mapped_column(ForeignKey("extra_files.id", ondelete="SET NULL"), nullable=True, index=True)
    
    action_type: Mapped[ActionType] = mapped_column(SQLEnum(ActionType), index=True)
    status: Mapped[ActionStatus] = mapped_column(SQLEnum(ActionStatus), default=ActionStatus.SUCCESS, index=True)
    is_reversible: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    
    old_value: Mapped[Optional[str]] = mapped_column(String)
    new_value: Mapped[Optional[str]] = mapped_column(String)
    snapshot_data: Mapped[Optional[dict]] = mapped_column(JSON)
    error_message: Mapped[Optional[str]] = mapped_column(String)
    details: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    batch: Mapped["ActionBatch"] = relationship(back_populates="logs")
    media_item: Mapped[Optional["MediaItem"]] = relationship("MediaItem")
    extra_file: Mapped[Optional["ExtraFile"]] = relationship("ExtraFile")
