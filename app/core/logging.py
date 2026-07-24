import os
import sys
import logging
from logging.handlers import RotatingFileHandler

WORKSPACE_LOG_FILENAME = "swaya-debug.txt"


def get_log_filepath() -> str:
    """
    Get the path for the log file.
    Resolves to %APPDATA%/Swaya/logs/swaya.log on Windows,
    or a fallback workspace directory logs/swaya.log if not writable or on other platforms.
    """
    log_dir = None
    
    # Try APPDATA on Windows
    if sys.platform == "win32":
        appdata = os.getenv("APPDATA")
        if appdata:
            log_dir = os.path.join(appdata, "Swaya", "logs")
            
    # Fallback to user home directory or local project dir
    if not log_dir:
        home = os.path.expanduser("~")
        log_dir = os.path.join(home, ".swaya", "logs")
        
    try:
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "swaya.log")
        # Test if writable
        with open(log_file, "a"):
            pass
        return log_file
    except Exception:
        # Final fallback to workspace logs directory
        workspace_log_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "logs"))
        os.makedirs(workspace_log_dir, exist_ok=True)
        return os.path.join(workspace_log_dir, "swaya.log")


def get_workspace_log_filepath() -> str:
    workspace_log_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "logs"))
    os.makedirs(workspace_log_dir, exist_ok=True)
    return os.path.join(workspace_log_dir, WORKSPACE_LOG_FILENAME)


def setup_logger(name: str = "swaya") -> logging.Logger:
    """
    Configures the root logger so app module loggers and uvicorn workers share
    the same console/file handlers.
    """
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    if not getattr(root_logger, "_swaya_configured", False):
        for handler in list(root_logger.handlers):
            root_logger.removeHandler(handler)

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.WARNING)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

        file_paths = []
        try:
            file_paths.append(get_log_filepath())
        except Exception as e:
            root_logger.warning(f"Could not resolve appdata log file: {e}")

        try:
            file_paths.append(get_workspace_log_filepath())
        except Exception as e:
            root_logger.warning(f"Could not resolve workspace log file: {e}")

        seen = set()
        for log_file in file_paths:
            if not log_file or log_file in seen:
                continue
            seen.add(log_file)
            try:
                file_handler = RotatingFileHandler(
                    log_file,
                    maxBytes=5242880,
                    backupCount=3,
                    encoding="utf-8"
                )
                file_handler.setLevel(logging.INFO)
                file_handler.setFormatter(formatter)
                root_logger.addHandler(file_handler)
            except Exception as e:
                root_logger.warning(f"Could not configure file logging for {log_file}: {e}")

        root_logger._swaya_configured = True

    for logger_name in (name, "uvicorn", "uvicorn.error"):
        named_logger = logging.getLogger(logger_name)
        named_logger.setLevel(logging.INFO)
        named_logger.propagate = True

    access_logger = logging.getLogger("uvicorn.access")
    access_logger.setLevel(logging.WARNING)
    access_logger.propagate = True

    return logging.getLogger(name)
