import os
import subprocess
import logging
from app.core.database import SWAYA_DB_PATH
from app.modules.library.filesystem.fs_utils import to_win_long_path

logger = logging.getLogger(__name__)

class PreviewService:
    def __init__(self):
        # Resolve target previews directory
        self.previews_dir = os.path.abspath(os.path.join(os.path.dirname(SWAYA_DB_PATH), "previews"))
        os.makedirs(self.previews_dir, exist_ok=True)

    def get_preview_path(self, item_id: str, resolution: int = 720) -> str:
        """Returns the absolute file path for a cached preview."""
        if resolution == 720:
            return os.path.join(self.previews_dir, f"{item_id}.mp4")
        return os.path.join(self.previews_dir, f"{item_id}_{resolution}.mp4")

    def get_video_duration(self, filepath: str) -> float:
        """Executes ffprobe to extract duration in seconds."""
        from app.modules.library.filesystem.fs_utils import get_video_duration
        return get_video_duration(filepath)

    def generate_preview(self, filepath: str, item_id: str, preview_duration: int = 16, resolution: int = 720) -> str:
        """
        Generates a preview video from the original file.
        Slices 4 segments of (preview_duration / 4) seconds each (at 20%, 40%, 60%, 80% marks),
        downscales to the target resolution, strips audio, and concats them.
        """
        output_path = self.get_preview_path(item_id, resolution)
        if os.path.exists(output_path):
            return output_path

        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Source video file not found: {filepath}")

        long_path = to_win_long_path(filepath)
        try:
            duration = self.get_video_duration(filepath)
        except Exception:
            duration = 0.0

        logger.info(f"Generating preview for item {item_id} (duration={duration:.1f}s, preview_duration={preview_duration}s)")

        seg_duration = float(preview_duration) / 4.0

        if duration < (seg_duration * 4.0 + 4.0):
            # For short videos, just copy the first few seconds
            cmd = [
                'ffmpeg', '-y',
                '-i', long_path,
                '-t', f'{preview_duration:.3f}',
                '-vf', f'scale=-2:min(ih\\,{resolution})',
                '-c:v', 'libx264',
                '-preset', 'superfast',
                '-crf', '24',
                '-an',
                output_path
            ]
        else:
            t1 = duration * 0.20
            t2 = duration * 0.40
            t3 = duration * 0.60
            t4 = min(duration * 0.80, duration - (seg_duration + 0.5))  # Ensure we don't seek past end
 
            cmd = [
                'ffmpeg', '-y',
                '-ss', f'{t1:.3f}', '-t', f'{seg_duration:.3f}', '-i', long_path,
                '-ss', f'{t2:.3f}', '-t', f'{seg_duration:.3f}', '-i', long_path,
                '-ss', f'{t3:.3f}', '-t', f'{seg_duration:.3f}', '-i', long_path,
                '-ss', f'{t4:.3f}', '-t', f'{seg_duration:.3f}', '-i', long_path,
                '-filter_complex', f'[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0[v];[v]scale=-2:min(ih\\,{resolution})[outv]',
                '-map', '[outv]',
                '-c:v', 'libx264',
                '-preset', 'superfast',
                '-crf', '24',
                '-an',
                output_path
            ]

        try:
            subprocess.run(cmd, capture_output=True, check=True, timeout=60)
            logger.info(f"Successfully generated preview at {output_path}")
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error generating preview for {item_id}: {e.stderr}")
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except Exception as e:
                    try:
                        logger.debug(f"Swallowed exception: {e}", exc_info=True)
                    except Exception:
                        pass
                    pass
            raise RuntimeError(f"FFmpeg failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Unexpected error generating preview for {item_id}: {e}")
            raise

        return output_path