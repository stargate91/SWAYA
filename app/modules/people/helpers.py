from app.modules.people.domain.credits import (
    _normalize_words,
    _is_self_or_guest_credit,
    _department_matches_credit,
    _is_voice_credit,
    known_for_score,
    select_known_for,
    resolve_person_known_for_backdrop,
)
from app.modules.people.domain.formulas import (
    calculate_underage_threshold,
    calculate_butt_size,
    calculate_breast_size,
    is_underage_performer,
)
from app.modules.people.domain.images import merge_images
from app.modules.people.domain.filters import should_exclude_adult_performer