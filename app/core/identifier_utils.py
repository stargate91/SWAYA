from dataclasses import dataclass
from typing import Optional

@dataclass
class ParsedIdentifier:
    provider: str
    external_id: str
    season: Optional[int] = None
    episode: Optional[int] = None

def parse_identifier(identifier: str) -> Optional[ParsedIdentifier]:
    """
    Safely parses a compound identifier (e.g. tmdb_12345, tmdb:12345, or tmdb_12345_1_2) 
    into a ParsedIdentifier object containing provider, external_id, season, and episode.
    """
    if not identifier or not isinstance(identifier, str):
        return None
        
    separator = ":" if ":" in identifier else "_"
    parts = identifier.split(separator)
    if len(parts) < 2:
        return None
        
    provider = parts[0].lower()
    known_providers = {"tmdb", "stashdb", "fansdb", "porndb", "tvdb", "imdb", "healthyceleb", "celebrityinside"}
    if provider not in known_providers:
        return None
        
    if provider == "tmdb" and separator == "_" and len(parts) >= 4:
        # TV Episode format: tmdb_{tv_id}_{season}_{episode}
        tv_id = parts[1]
        try:
            season = int(parts[2])
            episode = int(parts[3])
            return ParsedIdentifier(provider=provider, external_id=tv_id, season=season, episode=episode)
        except ValueError:
            pass
            
    # Default format: provider_{external_id} where external_id can contain separators
    external_id = separator.join(parts[1:])
    return ParsedIdentifier(provider=provider, external_id=external_id)
