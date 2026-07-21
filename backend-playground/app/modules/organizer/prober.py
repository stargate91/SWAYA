import os
import json
import struct
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

def map_resolution(width: int, height: int) -> str:
    """Standardizes video width/height into clean resolution labels (4K, 1080p, 720p, 480p)."""
    if width >= 3800 or height >= 2100:
        return "4K"
    if width >= 2500 or height >= 1400:
        return "1440p"
    if width >= 1800 or height >= 1000:
        return "1080p"
    if width >= 1200 or height >= 700:
        return "720p"
    if width >= 800 or height >= 500:
        return "576p"
    if width >= 600 or height >= 400:
        return "480p"
    return f"{width}x{height}" if width and height else "SD"

class TechnicalProber:
    """
    FFprobe Technical Prober & File Hashing Service (Part of Organizer Module).
    Extracts video specs (resolution, codecs, streams, HDR) + computes OpenSubtitles OSHash.
    """

    @classmethod
    def calculate_oshash(cls, file_path: Path) -> Optional[str]:
        """
        Calculates OpenSubtitles OSHash (64KB head + 64KB tail + filesize sum).
        Fast 64-bit binary checksum used across video databases.
        """
        try:
            file_size = file_path.stat().st_size
            if file_size < 131072: # 128 KB minimum
                return None

            with open(file_path, "rb") as f:
                # Read first 64KB
                head = f.read(65536)
                # Read last 64KB
                f.seek(max(0, file_size - 65536), os.SEEK_SET)
                tail = f.read(65536)

            file_hash = file_size
            
            # Unpack 64-bit unsigned integers
            for i in range(0, len(head), 8):
                if i + 8 <= len(head):
                    (val,) = struct.unpack("<Q", head[i:i+8])
                    file_hash = (file_hash + val) & 0xFFFFFFFFFFFFFFFF

            for i in range(0, len(tail), 8):
                if i + 8 <= len(tail):
                    (val,) = struct.unpack("<Q", tail[i:i+8])
                    file_hash = (file_hash + val) & 0xFFFFFFFFFFFFFFFF

            return f"{file_hash:016x}"
        except Exception as e:
            logger.debug(f"Failed to calculate OSHash for {file_path}: {e}")
            return None

    @classmethod
    def probe_file(cls, file_path: Path) -> Dict[str, Any]:
        """
        Runs ffprobe on a video file and returns structured technical metadata.
        Falls back gracefully if ffprobe binary is not installed on system.
        """
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-probesize", "5000000",
            "-analyzeduration", "5000000",
            "-show_format",
            "-show_streams",
            str(file_path)
        ]

        raw_data = {}
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=10)
            if res.returncode == 0 and res.stdout:
                raw_data = json.loads(res.stdout)
        except Exception as e:
            logger.debug(f"ffprobe execution bypassed or failed for {file_path}: {e}")

        info = {
            "duration": None,
            "size": file_path.stat().st_size if file_path.exists() else None,
            "resolution": None,
            "video_codec": None,
            "video_bitrate": None,
            "audio_codec": None,
            "audio_channels": None,
            "audio_bitrate": None,
            "framerate": None,
            "bit_depth": None,
            "hdr_type": None,
            "internal_title": None,
            "hash_oshash": cls.calculate_oshash(file_path),
            "audio_streams": [],
            "subtitle_streams": []
        }

        if not raw_data:
            return info

        fmt = raw_data.get("format", {})
        if fmt.get("duration"):
            try:
                info["duration"] = round(float(fmt["duration"]), 2)
            except ValueError:
                pass

        info["internal_title"] = fmt.get("tags", {}).get("title")

        for stream in raw_data.get("streams", []):
            stype = stream.get("codec_type")

            if stype == "video" and not info["resolution"]:
                info["video_codec"] = stream.get("codec_name")
                w = stream.get("width")
                h = stream.get("height")
                if w and h:
                    info["resolution"] = map_resolution(w, h)

                if stream.get("bit_rate"):
                    try:
                        info["video_bitrate"] = int(stream["bit_rate"])
                    except ValueError:
                        pass

                rfr = stream.get("r_frame_rate")
                if rfr and "/" in rfr:
                    try:
                        num, den = rfr.split("/")
                        if int(den) > 0:
                            info["framerate"] = str(round(int(num) / int(den), 2))
                    except Exception:
                        pass

                # HDR detection
                color_transfer = stream.get("color_transfer", "").lower()
                if "smpte2084" in color_transfer or "pq" in color_transfer:
                    info["hdr_type"] = "HDR10"
                elif "arib-std-b67" in color_transfer or "hlg" in color_transfer:
                    info["hdr_type"] = "HLG"

            elif stype == "audio":
                audio_entry = {
                    "codec": stream.get("codec_name"),
                    "channels": stream.get("channels"),
                    "language": stream.get("tags", {}).get("language")
                }
                info["audio_streams"].append(audio_entry)

                if not info["audio_codec"]:
                    info["audio_codec"] = stream.get("codec_name")
                    info["audio_channels"] = str(stream.get("channels")) if stream.get("channels") else None

            elif stype == "subtitle":
                sub_entry = {
                    "codec": stream.get("codec_name"),
                    "language": stream.get("tags", {}).get("language"),
                    "title": stream.get("tags", {}).get("title")
                }
                info["subtitle_streams"].append(sub_entry)

        return info
