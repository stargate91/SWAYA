from typing import Optional
from app.shared_kernel.ports.image_service_port import ImageServiceRegistry

class DetailFormatter:
    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return ImageServiceRegistry.get().resolve_image_url(path, subfolder, size)

