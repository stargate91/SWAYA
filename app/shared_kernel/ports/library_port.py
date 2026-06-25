from typing import Protocol

from app.shared_kernel.ports.media_item_port import MediaItemPort
from app.shared_kernel.ports.rename_port import RenamePort
from app.shared_kernel.ports.scan_port import ScanPort
from app.shared_kernel.ports.person_override_port import PersonOverridePort
from app.shared_kernel.ports.playback_port import PlaybackPort
from app.shared_kernel.ports.collection_port import CollectionPort

class LibraryPort(
    MediaItemPort,
    RenamePort,
    ScanPort,
    PersonOverridePort,
    PlaybackPort,
    CollectionPort,
    Protocol
):
    pass






