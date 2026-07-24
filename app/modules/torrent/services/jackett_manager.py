import os
import sys
import zipfile
import urllib.request
import subprocess
import shutil
import logging
import uuid
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class JackettManager:
    def __init__(self, data_root: Path):
        self.data_root = data_root
        self.jackett_dir = self.data_root / "bin" / "jackett"
        self.config_dir = self.data_root / "jackett_config"
        self.exe_path = self.jackett_dir / "Jackett" / "JackettConsole.exe" # Windows portable usually has JackettConsole.exe or Jackett.exe
        if not self.exe_path.exists():
            # Fallback to Jackett.exe
            self.exe_path = self.jackett_dir / "Jackett" / "Jackett.exe"
            
        self.api_key = "swaya_secret_api_key_123456"
        self.port = 9117
        self.process = None

    def is_installed(self) -> bool:
        # Check if the directory and executable exist
        exe1 = self.jackett_dir / "Jackett" / "JackettConsole.exe"
        exe2 = self.jackett_dir / "Jackett" / "Jackett.exe"
        return exe1.exists() or exe2.exists()

    def download_and_extract(self):
        logger.info("Downloading portable Jackett...")
        self.jackett_dir.mkdir(parents=True, exist_ok=True)
        zip_path = self.jackett_dir / "jackett.zip"

        # Download URL for Windows portable 64-bit
        url = "https://github.com/Jackett/Jackett/releases/latest/download/Jackett.Binaries.Windows.zip"
        
        # Simple download using urllib
        urllib.request.urlretrieve(url, zip_path)
        logger.info("Extracting Jackett...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(self.jackett_dir)
            
        # Clean up zip
        if zip_path.exists():
            zip_path.unlink()
        logger.info("Jackett installation completed.")

    def ensure_config(self):
        self.config_dir.mkdir(parents=True, exist_ok=True)
        config_file = self.config_dir / "ServerConfig.json"
        
        # If config doesn't exist, create it with pre-defined API key and port
        if not config_file.exists():
            config_data = {
                "Port": self.port,
                "AllowExternal": False,
                "APIKey": self.api_key,
                "Password": None,
                "BasePath": "",
                "UpdateDisabled": True,
                "UpdateToPrerelease": False,
                "InstanceId": str(uuid.uuid4())
            }
            with open(config_file, "w", encoding="utf-8") as f:
                json.dump(config_data, f, indent=4)
            logger.info(f"Created default Jackett config with API key: {self.api_key}")
        else:
            # Load existing API key
            try:
                with open(config_file, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
                    self.api_key = config_data.get("APIKey", self.api_key)
                    self.port = config_data.get("Port", self.port)
            except Exception as e:
                logger.error(f"Failed to read existing Jackett config: {e}")

    def start(self):
        try:
            if not self.is_installed():
                self.download_and_extract()
                
            self.ensure_config()
            
            # Find which executable to run
            exe_to_run = self.jackett_dir / "Jackett" / "JackettConsole.exe"
            if not exe_to_run.exists():
                exe_to_run = self.jackett_dir / "Jackett" / "Jackett.exe"
    
            logger.info(f"Starting Jackett from {exe_to_run} with DataFolder {self.config_dir}...")
            
            # Start Jackett Console as a background process redirecting output to NUL/DEVNULL on Windows
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            self.process = subprocess.Popen(
                [str(exe_to_run), "--DataFolder", str(self.config_dir), "--NoUpdates"],
                startupinfo=startupinfo,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            logger.info("Jackett process launched.")
        except Exception as e:
            logger.error(f"Failed to start Jackett manager: {e}", exc_info=True)

    def stop(self):
        if self.process:
            logger.info("Stopping Jackett process...")
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            self.process = None
            logger.info("Jackett process stopped.")
