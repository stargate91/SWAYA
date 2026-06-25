from datetime import datetime, timezone

class PlaybackDomainService:
    @staticmethod
    def parse_watched_at(value) -> datetime:
        if not value:
            return datetime.now(timezone.utc)
        if isinstance(value, datetime):
            return value
        try:
            normalized = str(value).strip().replace("Z", "+00:00")
            return datetime.fromisoformat(normalized)
        except Exception as exc:
            raise ValueError("Invalid watched_at datetime format") from exc

    @staticmethod
    def recalculate_watch_state(playback_logs, override) -> None:
        logs = sorted(
            [log for log in (playback_logs or []) if log.watched_at],
            key=lambda x: x.watched_at,
            reverse=True,
        )
            
        override.watch_count = len(logs)
        override.last_watched_at = logs[0].watched_at if logs else None
        override.is_watched = bool(logs)
        if logs:
            override.resume_position = 0
