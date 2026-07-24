from typing import Optional

def merge_images(existing: Optional[list[str]], new_images: list[str]) -> list[str]:
    if not existing:
        existing = []
    seen = set()
    res_list = []

    def normalize_key(img: str) -> str:
        if img.startswith(("http://", "https://")):
            return img.split("?")[0].lower()
        return img.split("/")[-1].split("?")[0].lower()

    for img in existing:
        if not img:
            continue
        norm = normalize_key(img)
        if norm not in seen:
            seen.add(norm)
            res_list.append(img)
    for img in new_images:
        if not img:
            continue
        norm = normalize_key(img)
        if norm not in seen:
            seen.add(norm)
            res_list.append(img)
    return res_list
