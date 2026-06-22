from typing import Optional
from app.domains.media_assets.services.images import image_processing_service

class DetailFormatter:
    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return image_processing_service.resolve_image_url(path, subfolder, size)

