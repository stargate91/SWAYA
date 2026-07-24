import socket

def is_port_in_use(port: int) -> bool:
    """Checks if a local TCP port is in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex(('127.0.0.1', port)) == 0
