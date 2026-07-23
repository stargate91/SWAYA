import logging
import requests
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class JackettClient:
    def __init__(self, base_url: str = "http://127.0.0.1:9117", api_key: str = "swaya_secret_api_key_123456"):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key

    def test_connection(self) -> bool:
        try:
            url = f"{self.base_url}/api/v2.0/indexers"
            response = requests.get(url, params={"apikey": self.api_key}, timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to connect to Jackett: {e}")
            return False

    def list_indexers(self) -> List[Dict[str, Any]]:
        """List all configured indexers in Jackett by reading the config directory."""
        try:
            from app.modules.torrent.services import DATA_ROOT
            indexers_dir = DATA_ROOT / "jackett_config" / "Indexers"
            
            indexers = []
            if indexers_dir.exists():
                for f in indexers_dir.glob("*.json"):
                    indexers.append({
                        "ID": f.stem,
                        "Name": f.stem.capitalize(),
                        "Configured": True
                    })
            return indexers
        except Exception as e:
            logger.error(f"Failed to list Jackett indexers from filesystem: {e}")
            return []

    def _search_indexer(self, indexer_id: str, query: str) -> List[Dict[str, Any]]:
        try:
            url = f"{self.base_url}/api/v2.0/indexers/{indexer_id}/results"
            response = requests.get(
                url,
                params={"apikey": self.api_key, "Query": query},
                headers={"Accept": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("Results", [])
        except Exception as e:
            logger.warning(f"Jackett indexer {indexer_id} search failed or timed out: {e}")
        return []

    def search(self, query: str) -> List[Dict[str, Any]]:
        """Search all configured indexers for a query concurrently."""
        try:
            indexers = self.get_configured_indexers()
            if not indexers:
                logger.warning("No configured Jackett indexers found.")
                return []

            from concurrent.futures import ThreadPoolExecutor, as_completed
            results = []
            
            # Run queries concurrently (max 10 threads)
            with ThreadPoolExecutor(max_workers=min(len(indexers), 10)) as executor:
                futures = {
                    executor.submit(self._search_indexer, idx.get("ID"), query): idx.get("ID")
                    for idx in indexers if idx.get("ID")
                }
                for future in as_completed(futures):
                    results.extend(future.result())
            
            # Sort results by seeders descending
            results.sort(key=lambda x: int(x.get("Seeders", 0)) if x.get("Seeders") is not None else 0, reverse=True)
            return results
        except Exception as e:
            logger.error(f"Failed to search Jackett: {e}")
            return []
            
    def get_configured_indexers(self) -> List[Dict[str, Any]]:
        indexers = self.list_indexers()
        return [idx for idx in indexers if idx.get("Configured", False)]
