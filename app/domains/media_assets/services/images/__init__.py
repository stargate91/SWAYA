# Images services subpackage
# Re-export from the sibling images.py module to maintain backward compatibility
# Note: This package (images/) shadows images.py, so we must bridge the imports here.

import importlib.util
import sys
from pathlib import Path

# Manually load the sibling images.py file since this package shadows it
_images_module_path = Path(__file__).parent.parent / "images.py"
_spec = importlib.util.spec_from_file_location(
    "app.domains.media_assets.services._images_module", str(_images_module_path)
)

# Avoid circular re-import: only load if not already loaded
_mod_name = "app.domains.media_assets.services._images_module"
if _mod_name not in sys.modules:
    _module = importlib.util.module_from_spec(_spec)
    sys.modules[_mod_name] = _module
    _spec.loader.exec_module(_module)
else:
    _module = sys.modules[_mod_name]

ImageProcessingService = _module.ImageProcessingService
image_processing_service = _module.image_processing_service
