
from app.modules.library.adapters.db_media_item_read_adapter import DbMediaItemReadAdapter
from app.modules.library.adapters.db_media_item_write_adapter import DbMediaItemWriteAdapter
from app.modules.library.adapters.db_media_item_structure_adapter import DbMediaItemStructureAdapter

class DbMediaItemAdapter(
    DbMediaItemReadAdapter,
    DbMediaItemWriteAdapter,
    DbMediaItemStructureAdapter
):
    pass
