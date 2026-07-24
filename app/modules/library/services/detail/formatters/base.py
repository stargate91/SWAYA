from typing import Any


class MovieDetailFormatter:
    def format(self, item_id: Any, db: Any, scrapers: Any, current_uid: Any) -> Any:
        raise NotImplementedError()


class BaseCreditsFormatter:
    def format_member(
        self,
        member: dict,
        local_profiles: dict,
        release_date: Any,
        resolve_img_fn: Any,
        job: Any = None,
        include_popularity: bool = False
    ) -> dict:
        from app.core.date_utils import calculate_age_at_release
        m_id = member.get("id")
        resolved = local_profiles.get(m_id) if m_id else None
        resolved_img = resolved.get("profile_path") if resolved else None
        birthday_str = resolved.get("birthday") if resolved else None

        character = member.get("character")
        if not character and "roles" in member:
            roles = member.get("roles", [])
            if roles:
                character = ", ".join(filter(None, [r.get("character") for r in roles]))

        res = {
            "id": f"tmdb:{m_id}" if m_id else None,
            "name": member.get("name"),
            "character": character,
            "gender": member.get("gender"),
            "profile_path": resolve_img_fn(resolved_img or member.get("profile_path"), "people"),
            "age_at_release": calculate_age_at_release(birthday_str, release_date)
        }
        
        final_job = job or member.get("job")
        if final_job:
            res["job"] = final_job
            
        if include_popularity:
            res["popularity"] = member.get("popularity", 0)
            
        return res
