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
            
        def is_log_completed(l):
            duration = l.media_item.duration if (l.media_item and l.media_item.duration) else 0
            if duration > 0:
                return (l.position_seconds or 0) / duration >= 0.90
            return (l.position_seconds or 0) > 0

        completed_count = sum(1 for l in logs if is_log_completed(l))
        override.watch_count = completed_count
        override.last_watched_at = logs[0].watched_at if logs else None
        
        if logs:
            latest_log = logs[0]
            is_latest_completed = is_log_completed(latest_log)
            override.is_watched = is_latest_completed
            if is_latest_completed:
                override.resume_position = 0
            else:
                override.resume_position = latest_log.position_seconds or 0
        else:
            override.is_watched = False
            override.resume_position = 0
