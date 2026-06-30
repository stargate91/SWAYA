from typing import Any, Optional
from pathlib import Path
from app.domains.library.services.formatter.models import RenamePreview
from app.shared_kernel.ports.library_port import LibraryPort

class PathTemplateCompiler:
    def __init__(self, library_port: LibraryPort, formatter: Any):
        self.library_port = library_port
        self.formatter = formatter

    def _preview_action(self, preview: RenamePreview) -> str:
        """Normalizes preview actions from config/UI values."""
        return str(getattr(preview, "action", "rename") or "rename").strip().lower()

    def _is_better_replacement(self, source_item: Any, target_path: Path) -> bool:
        target_item = self.library_port.get_item_by_relative_path(str(target_path).replace("\\", "/"))
        if not target_item:
            target_item = self.library_port.get_item_by_absolute_path(str(target_path))

        if not target_item:
            return False

        tolerance = getattr(self.formatter.config, "collision_duration_tolerance_seconds", 10) or 10
        if source_item.duration and target_item.duration:
            if abs(float(source_item.duration) - float(target_item.duration)) > tolerance:
                return False

        return self._quality_score(source_item) > self._quality_score(target_item)

    def _quality_score(self, item: Any):
        return (
            self._resolution_height(item.resolution),
            item.video_bitrate or 0,
            item.size or 0,
        )

    def _resolution_height(self, resolution: str) -> int:
        if not resolution:
            return 0
        text = str(resolution).lower()
        if "x" in text:
            try:
                return int(text.split("x")[-1].strip().rstrip("p"))
            except ValueError:
                return 0
        digits = "".join(ch for ch in text if ch.isdigit())
        return int(digits) if digits else 0
