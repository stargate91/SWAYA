from typing import Optional, Any


class MovieDetailFormatter:
    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return ImageServiceRegistry.get().resolve_image_url(path, subfolder, size)

    def format(self, item_id: Any, db: Any, scrapers: Any, current_uid: Any) -> Any:
        raise NotImplementedError()
