from typing import Protocol

class FileSystemPort(Protocol):
    def calculate_fast_hash(self, file_path: str) -> str:
        ...

    def to_win_long_path(self, path: str) -> str:
        ...

    def calculate_oshash(self, file_path: str) -> str:
        ...

    def calculate_phash(self, file_path: str) -> str:
        ...

    def calculate_full_md5(self, file_path: str) -> str:
        ...

    def calculate_full_sha256(self, file_path: str) -> str:
        ...
