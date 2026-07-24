import pytest
from unittest.mock import MagicMock
from app.core.enums import Provider
from app.modules.scrapers.providers.porndb import PornDBScraper
from app.modules.metadata.services.search.adult_search_resolver import AdultSearchResolver

def test_porndb_scraper_search_signatures():
    settings_mock = MagicMock()
    scraper = PornDBScraper(settings_mock)
    
    # Verify search_movies accepts page argument
    assert hasattr(scraper, "search_movies")
    try:
        # Mocking client response so network call is avoided
        scraper.client.search_movies = MagicMock(return_value={"data": []})
        result_movies = scraper.search_movies("test", page=1)
        assert isinstance(result_movies, list)
    except TypeError as e:
        pytest.fail(f"search_movies failed with TypeError: {e}")

    # Verify search_performers accepts page argument
    assert hasattr(scraper, "search_performers")
    try:
        scraper.get_setting = MagicMock(return_value="fake_token")
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": []}
        scraper.session.get = MagicMock(return_value=mock_resp)
        
        result_performers = scraper.search_performers("test", page=1)
        assert isinstance(result_performers, list)
    except TypeError as e:
        pytest.fail(f"search_performers failed with TypeError: {e}")

def test_adult_search_resolver_porndb():
    resolver = AdultSearchResolver()
    db_mock = MagicMock()
    scrapers_mock = MagicMock()
    scraper_mock = MagicMock()
    
    scraper_mock.search_movies.return_value = [{
        "id": "123",
        "title": "Test Adult Movie",
        "date": "2024-01-01",
        "description": "Overview"
    }]
    scraper_mock.search_performers.return_value = [{
        "id": "456",
        "name": "Jane Doe",
        "gender": "FEMALE",
        "scene_count": 10
    }]
    
    scrapers_mock.get_scraper.return_value = scraper_mock
    
    # Test movie search
    movies = resolver.search_metadata(
        db=db_mock,
        scrapers=scrapers_mock,
        query="Test",
        item_type="movie",
        year=2024,
        prov_enum=Provider.PORNDB,
        page=1
    )
    assert len(movies) == 1
    assert movies[0]["title"] == "Test Adult Movie"
    assert movies[0]["media_type"] == "movie"
    
    # Test performer search
    performers = resolver.search_performers(
        db=db_mock,
        scrapers=scrapers_mock,
        query="Jane",
        prov_enum=Provider.PORNDB,
        page=1
    )
    assert len(performers) == 1
    assert performers[0]["title"] == "Jane Doe"
    assert performers[0]["media_type"] == "person"
