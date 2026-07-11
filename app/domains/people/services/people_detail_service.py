import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.shared_kernel.ports.scrapers import ScraperGatewayPort
from app.shared_kernel.ports.library_port import LibraryPort
from app.shared_kernel.ports.image_service_port import ImageServicePort
from app.shared_kernel.ports.image_download_port import ImageDownloadPort
from app.domains.people.services.filmography_service import FilmographyService
from app.domains.people.services.detail_reader import PerformerDetailReader
from app.domains.people.services.asset_manager import PerformerAssetManager
from app.domains.people.schemas import (
    PeopleSearchResponse,
    PersonDetailResponse,
    PersonFilmographyResponse,
)

logger = logging.getLogger(__name__)

class PeopleDetailService:
    def __init__(
        self,
        db: Session,
        scrapers: ScraperGatewayPort,
        library_port: Optional[LibraryPort] = None,
        image_service: Optional[ImageServicePort] = None,
        image_downloader: Optional[ImageDownloadPort] = None
    ):
        self.db = db
        self.scrapers = scrapers
        
        self.library_port = library_port
        
        if image_service is None:
            from app.domains.media_assets.services.images import image_processing_service
            image_service = image_processing_service
        self.image_service = image_service
        
        self.filmography_service = FilmographyService(db, library_port=library_port, image_service=image_service, scrapers=scrapers)
        
        self.reader = PerformerDetailReader(
            db=db,
            scrapers=scrapers,
            library_port=library_port,
            image_service=image_service,
            filmography_service=self.filmography_service,
            image_downloader=image_downloader
        )
        
        self.asset_manager = PerformerAssetManager(
            db=db,
            library_port=library_port,
            image_service=image_service,
            image_downloader=image_downloader
        )

    def _resolve_img(self, path: Optional[str], subfolder: str, size: str = "w500") -> Optional[str]:
        return self.image_service.resolve_image_url(path, subfolder, size)

    def get_people(
        self,
        search: str = None,
        role: str = None,
        sort_by: str = "library_count",
        include_inactive: bool = False,
        adult_only: bool = False,
        gender: str = "all",
        offset: int = 0,
        limit: int = 20,
    ) -> PeopleSearchResponse:
        return self.reader.get_people(
            search=search,
            role=role,
            sort_by=sort_by,
            include_inactive=include_inactive,
            adult_only=adult_only,
            gender=gender,
            offset=offset,
            limit=limit
        )

    def get_person_detail(self, person_id: Any) -> PersonDetailResponse:
        return self.reader.get_person_detail(person_id)

    def get_person_movies(self, person_id: Any, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False) -> PersonFilmographyResponse:
        return self.reader.get_person_movies(person_id, page=page, page_size=page_size, source=source, local_only=local_only)

    def get_person_tv(self, person_id: Any, page: int = 1, page_size: int = 12, local_only: bool = False) -> PersonFilmographyResponse:
        return self.reader.get_person_tv(person_id, page=page, page_size=page_size, local_only=local_only)

    def get_person_scenes(self, person_id: Any, page: int = 1, page_size: int = 12, source: Optional[str] = None, local_only: bool = False) -> PersonFilmographyResponse:
        return self.reader.get_person_scenes(person_id, page=page, page_size=page_size, source=source, local_only=local_only)

    def get_person_credit_backdrops(self, person_id: Any, tmdb_id: int, media_type: str) -> Dict[str, Any]:
        return self.reader.get_person_credit_backdrops(person_id, tmdb_id=tmdb_id, media_type=media_type)

    def update_person_backdrop(self, person_id: int, backdrop_path: str) -> Dict[str, Any]:
        return self.asset_manager.update_person_backdrop(person_id, backdrop_path)

    def handle_person_backdrop_upload(self, person_id: int, filename: str, file_stream) -> Dict[str, Any]:
        return self.asset_manager.handle_person_backdrop_upload(person_id, filename, file_stream)

    def update_person_profile(self, person_id: int, profile_path: str) -> Dict[str, Any]:
        return self.asset_manager.update_person_profile(person_id, profile_path)

    def handle_person_profile_upload(self, person_id: int, filename: str, file_stream) -> Dict[str, Any]:
        return self.asset_manager.handle_person_profile_upload(person_id, filename, file_stream)

    def search_people_tmdb(self, query: str, language: Optional[str] = None, adult_only: bool = False, page: int = 1, source: str = "all") -> List[Dict[str, Any]]:
        return self.reader.search_people_tmdb(query, language=language, adult_only=adult_only, page=page, source=source)

    def add_person_tmdb(
        self,
        db_id_or_external: str,
        name: Optional[str] = None,
        profile_path: Optional[str] = None,
        gender: Optional[int] = None,
        is_adult: Optional[bool] = None,
        is_active: bool = False
    ) -> Dict[str, Any]:
        return self.reader.add_person_tmdb(
            db_id_or_external=db_id_or_external,
            name=name,
            profile_path=profile_path,
            gender=gender,
            is_adult=is_adult,
            is_active=is_active
        )

    def scrape_healthyceleb(self, person_id: Any, url: Optional[str] = None) -> Dict[str, Any]:
        import re
        import requests
        import unicodedata
        from datetime import datetime
        from html.parser import HTMLParser
        from fastapi import HTTPException
        from app.domains.people.models import Person

        person = self.db.query(Person).filter(Person.id == person_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")

        if not url:
            # Clean name to form the slug
            clean_name = person.name.lower().strip()
            clean_name = "".join(c for c in unicodedata.normalize('NFD', clean_name) if unicodedata.category(c) != 'Mn')
            clean_name = re.sub(r'[^a-z0-9\s-]', '', clean_name)
            clean_name = re.sub(r'[\s-]+', '-', clean_name)
            url = f"https://healthyceleb.com/{clean_name}-height-weight-body-statistics/"

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
        
        try:
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code != 200:
                if "-height-weight-body-statistics" in url:
                    alt_url = url.replace("-height-weight-body-statistics/", "/").replace("-height-weight-body-statistics", "/")
                elif url.endswith("/"):
                    alt_url = url.rstrip("/")
                else:
                    alt_url = url + "/"
                res = requests.get(alt_url, headers=headers, timeout=10)
                if res.status_code != 200:
                    raise HTTPException(status_code=400, detail=f"HealthyCeleb page not found for {person.name} (Tried: {url} and {alt_url})")
                url = alt_url
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail=f"Failed to connect to HealthyCeleb: {str(e)}")

        html_content = res.text

        class HealthyCelebParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.current_h3 = None
                self.in_h3 = False
                self.data_store = {}
                self.capture_next = False
                self.captured_text = []

            def handle_starttag(self, tag, attrs):
                if tag == "h3":
                    self.in_h3 = True
                    self.capture_next = False
                    self.captured_text = []
                elif self.current_h3:
                    self.capture_next = True

            def handle_endtag(self, tag):
                if tag == "h3":
                    self.in_h3 = False
                elif self.capture_next and tag in ("p", "ul", "li", "span", "div", "h3"):
                    self.capture_next = False
                    text_val = " ".join([t for t in self.captured_text if t]).strip()
                    if text_val and self.current_h3:
                        if self.current_h3 not in self.data_store:
                            self.data_store[self.current_h3] = text_val
                        self.current_h3 = None
                    self.captured_text = []

            def handle_data(self, data):
                if self.in_h3:
                    self.current_h3 = (self.current_h3 or "") + data
                elif self.capture_next:
                    self.captured_text.append(data.strip())

        parser = HealthyCelebParser()
        parser.feed(html_content)

        # Map fields
        extracted = {}
        data = {k.strip().lower(): v for k, v in parser.data_store.items()}

        def map_hair_color(val: str) -> Optional[str]:
            val = val.lower().strip()
            if "blonde" in val: return "BLONDE"
            if "brown" in val: return "BRUNETTE"
            if "black" in val: return "BLACK"
            if "red" in val or "ginger" in val: return "RED"
            if "auburn" in val: return "AUBURN"
            if "grey" in val or "gray" in val: return "GREY"
            if "bald" in val: return "BALD"
            if "white" in val: return "WHITE"
            return "OTHER"

        def map_eye_color(val: str) -> Optional[str]:
            val = val.lower().strip()
            if "blue" in val: return "BLUE"
            if "brown" in val: return "BROWN"
            if "grey" in val or "gray" in val: return "GREY"
            if "green" in val: return "GREEN"
            if "hazel" in val: return "HAZEL"
            if "red" in val: return "RED"
            return None

        def map_ethnicity(val: str) -> Optional[str]:
            val = val.lower().strip()
            if "caucasian" in val or "white" in val: return "CAUCASIAN"
            if "black" in val or "african" in val: return "BLACK"
            if "asian" in val: return "ASIAN"
            if "indian" in val: return "INDIAN"
            if "latin" in val or "hispanic" in val or "spanish" in val: return "LATIN"
            if "middle eastern" in val: return "MIDDLE_EASTERN"
            if "mixed" in val: return "MIXED"
            return "OTHER"

        if "height" in data:
            match = re.search(r'(\d+)\s*cm', data["height"])
            if match:
                extracted["height"] = int(match.group(1))

        if "weight" in data:
            match = re.search(r'(\d+)\s*kg', data["weight"])
            if match:
                extracted["weight"] = int(match.group(1))

        if "measurements" in data:
            match = re.search(r'(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)', data["measurements"])
            if match:
                extracted["measurements"] = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
                extracted["waist"] = int(float(match.group(2)))
                extracted["hip"] = int(float(match.group(3)))

        if "bra size" in data:
            val = data["bra size"].replace(" ", "").upper()
            match = re.match(r'(\d+)([A-Z]+)', val)
            if match:
                extracted["band_size"] = int(match.group(1))
                extracted["cup_size"] = match.group(2)

        if "hair color" in data:
            extracted["hair_color"] = map_hair_color(data["hair color"])

        if "eye color" in data:
            extracted["eye_color"] = map_eye_color(data["eye color"])

        if "race / ethnicity" in data:
            extracted["ethnicity"] = map_ethnicity(data["race / ethnicity"])

        if "born place" in data:
            extracted["place_of_birth"] = data["born place"]

        if "date of birth" in data:
            raw_dob = data["date of birth"].strip()
            # Clean up text inside parentheses if any (e.g. "June 1, 1990 (age 30)")
            clean_dob = re.sub(r'\s*\([^)]*\)', '', raw_dob).strip()
            parsed_date = None
            for fmt in ("%B %d, %Y", "%d %B %Y", "%B %d %Y", "%Y-%m-%d"):
                try:
                    parsed_date = datetime.strptime(clean_dob, fmt).date()
                    break
                except ValueError:
                    continue
            if parsed_date:
                extracted["date_of_birth"] = parsed_date

        extracted["source_url"] = url

        return extracted

