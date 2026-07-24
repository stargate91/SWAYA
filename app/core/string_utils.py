import re
import unicodedata

def slugify_name(name: str) -> str:
    """
    Cleans and slugifies a name to be URL-friendly by applying
    lowercase conversion, NFD normalization (removing diacritics),
    and regex replacement.
    """
    if not name:
        return ""
    clean_name = name.lower().strip()
    clean_name = "".join(c for c in unicodedata.normalize('NFD', clean_name) if unicodedata.category(c) != 'Mn')
    clean_name = re.sub(r'[^a-z0-9\s-]', '', clean_name)
    clean_name = re.sub(r'[\s-]+', '-', clean_name)
    return clean_name
