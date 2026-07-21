import pytest
from pathlib import Path
from app.modules.media_assets.services.images.image_url_resolver import resolve_image_url

def test_resolve_image_url_prioritizes_local_cache(tmp_path):
    # Setup test image structure
    orig_posters = tmp_path / "original" / "posters"
    orig_posters.mkdir(parents=True, exist_ok=True)
    
    cached_file = orig_posters / "tmdb_123_abc123.jpg"
    cached_file.write_bytes(b"dummy image data exceeding min byte limit" * 50)
    
    # Passing remote TMDB URL when file exists on disk
    remote_url = "https://image.tmdb.org/t/p/w500/abc123.jpg"
    resolved = resolve_image_url(remote_url, "posters", tmp_path, size="original")
    
    # Should resolve to local media path instead of returning remote URL
    assert resolved == "/media/images/original/posters/tmdb_123_abc123.jpg"

def test_resolve_image_url_falls_back_to_remote_when_not_cached(tmp_path):
    remote_url = "https://image.tmdb.org/t/p/w500/uncached_poster.jpg"
    resolved = resolve_image_url(remote_url, "posters", tmp_path, size="w500")
    
    # Should fall back to remote URL when file is not on disk
    assert resolved == "https://image.tmdb.org/t/p/w500/uncached_poster.jpg"
