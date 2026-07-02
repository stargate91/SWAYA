import uvicorn
from app.shared_kernel.logging import setup_logger

if __name__ == "__main__":
    setup_logger()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_config=None, access_log=True, reload=True)
