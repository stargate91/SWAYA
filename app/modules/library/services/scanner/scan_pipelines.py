import logging
from dataclasses import dataclass
from typing import Callable, Optional, Any


from sqlalchemy.orm import Session

from app.core.enums import ScanMode
from app.modules.library.models import Library
from app.modules.library.services.scanner.collector import Collector
from app.modules.library.services.scanner.scan_collector import ScanCollector

logger = logging.getLogger(__name__)


class BaseScanPipeline:
    def __init__(self, mode: ScanMode):
        self.mode = mode

    def build_collector_phase(
        self,
        db: Session,
        library: Library,
        *,
        prober,
        categorizer,
        linker,
        min_size_mb: float,
        min_duration_minutes: float,
        progress_callback: Optional[Callable],
        provider: Optional[str] = None,
        fs: Optional[Any] = None,
        settings: Optional[Any] = None,
    ) -> ScanCollector:
        collector = Collector(min_size_mb)
        return ScanCollector(
            db=db,
            library=library,
            prober=prober,
            collector=collector,
            categorizer=categorizer,
            linker=linker,
            mode=self.mode,
            min_video_duration_minutes=min_duration_minutes,
            progress_callback=progress_callback,
            provider=provider,
            fs=fs,
            settings=settings,
        )


def get_scan_pipeline(mode: ScanMode) -> BaseScanPipeline:
    return BaseScanPipeline(mode)
