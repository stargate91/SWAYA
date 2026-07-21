import pytest
from app.modules.media_assets.services.image_selectors import pick_poster_path

def test_pick_poster_path_ranks_by_language_and_votes():
    raw_data = {
        "poster_path": "/default_poster.jpg",
        "original_language": "en",
        "images": {
            "posters": [
                {"file_path": "/en_poster.jpg", "iso_639_1": "en", "vote_average": 6.0, "vote_count": 10, "width": 1000},
                {"file_path": "/hu_poster.jpg", "iso_639_1": "hu", "vote_average": 5.0, "vote_count": 2, "width": 1000},
                {"file_path": "/null_poster.jpg", "iso_639_1": None, "vote_average": 8.0, "vote_count": 50, "width": 1000},
            ]
        }
    }
    
    # Should pick Hungarian poster if preferred_language='hu'
    assert pick_poster_path(raw_data, preferred_language="hu") == "/hu_poster.jpg"
    
    # Should pick English poster if preferred_language='en'
    assert pick_poster_path(raw_data, preferred_language="en") == "/en_poster.jpg"
