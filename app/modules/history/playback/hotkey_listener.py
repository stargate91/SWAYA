import threading
import win32con
import ctypes
import ctypes.wintypes
import logging
from app.core.database import SessionLocal
from app.modules.library.db_media_resolver import DbMediaResolver
from app.modules.history.services.playback_peak_service import PlaybackPeakService
from app.modules.history.playback.playback_monitor import active_sessions

logger = logging.getLogger(__name__)

def trigger_peak_moment():
    logger.info("Global hotkey triggered! Checking active playback sessions...")
    if not active_sessions:
        logger.info("No active playback sessions found.")
        return
        
    # Get the first active session item_id
    item_id = next(iter(active_sessions))
    
    db = SessionLocal()
    try:
        from app.modules.metadata.models import MetadataMatch
        is_adult = db.query(MetadataMatch).filter(
            MetadataMatch.media_item_id == item_id,
            MetadataMatch.is_adult
        ).count() > 0
        
        if not is_adult:
            logger.info(f"Hotkey ignored: active media item_id {item_id} is not adult content.")
            return
            
        logger.info(f"Adding peak moment for active media item_id: {item_id}")
        resolver = DbMediaResolver(db)
        service = PlaybackPeakService(db, resolver)
        # default user_id is 1
        service.add_peak(str(item_id), 1)
        db.commit()
        logger.info(f"Successfully added peak moment for item_id: {item_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to add peak moment via global hotkey: {e}")
    finally:
        db.close()

def hotkey_thread_func():
    HOTKEY_ID = 42
    MODS = 0
    KEY = win32con.VK_F9
    
    logger.info("Registering global hotkey F9 for peak moments...")
    success = ctypes.windll.user32.RegisterHotKey(None, HOTKEY_ID, MODS, KEY)
    if not success:
        logger.error("Failed to register global hotkey F9.")
        return
        
    try:
        msg = ctypes.wintypes.MSG()
        while ctypes.windll.user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            if msg.message == win32con.WM_HOTKEY:
                if msg.wParam == HOTKEY_ID:
                    try:
                        trigger_peak_moment()
                    except Exception as ex:
                        logger.error(f"Error executing hotkey action: {ex}")
            ctypes.windll.user32.TranslateMessage(ctypes.byref(msg))
            ctypes.windll.user32.DispatchMessageW(ctypes.byref(msg))
    finally:
        ctypes.windll.user32.UnregisterHotKey(None, HOTKEY_ID)
        logger.info("Unregistered global hotkey F9.")

def start_hotkey_listener():
    t = threading.Thread(target=hotkey_thread_func, daemon=True)
    t.start()
