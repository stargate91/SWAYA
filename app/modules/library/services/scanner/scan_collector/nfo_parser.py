import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class NFOParser:
    """
    Parser for .nfo files to discover external IDs like IMDb ID.
    Used for accurate metadata matching when online search is ambiguous.
    """
    
    # IMDb ID pattern: 'tt' followed by 7 or more digits
    IMDB_PATTERN = re.compile(r'tt\d{7,}')

    def get_imdb_id(self, media_path: Path) -> Optional[str]:
        """
        Attempts to locate and extract an IMDb ID from associated .nfo files.
        Checks for <filename>.nfo first, then falls back to movie.nfo.
        """
        # Attempt 1: <filename>.nfo
        nfo_path = media_path.with_suffix('.nfo')
        if nfo_path.exists():
            return self._parse_file(nfo_path)
            
        # Attempt 2: movie.nfo in the same directory
        movie_nfo = media_path.parent / "movie.nfo"
        if movie_nfo.exists():
            return self._parse_file(movie_nfo)
            
        return None

    def _parse_file(self, nfo_path: Path) -> Optional[str]:
        """Reads and searches a file for the IMDb ID pattern."""
        try:
            content = nfo_path.read_text(encoding='utf-8', errors='ignore')
            match = self.IMDB_PATTERN.search(content)
            if match:
                return match.group(0)
        except Exception as e:
            logger.debug(f"Swallowed exception in app/modules/library/services/scanner/scan_collector/nfo_parser.py:38: {e}", exc_info=True)
        return None
