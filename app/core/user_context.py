import contextvars

_current_user_id: contextvars.ContextVar[int] = contextvars.ContextVar("current_user_id", default=1)

def get_current_user_id() -> int:
    return _current_user_id.get()

def set_current_user_id(user_id: int) -> contextvars.Token[int]:
    return _current_user_id.set(user_id)

def reset_current_user_id(token: contextvars.Token[int]) -> None:
    _current_user_id.reset(token)
