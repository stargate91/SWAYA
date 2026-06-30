from app.shared_kernel.ports.media_item_port import MediaItemPort
from app.infrastructure.media.adapters.db_media_item_read_adapter import DbMediaItemReadAdapter
from app.infrastructure.media.adapters.db_media_item_write_adapter import DbMediaItemWriteAdapter
from app.infrastructure.media.adapters.db_media_item_structure_adapter import DbMediaItemStructureAdapter

class DbMediaItemAdapter(
    DbMediaItemReadAdapter,
    DbMediaItemWriteAdapter,
    DbMediaItemStructureAdapter,
    MediaItemPort
):
    pass
