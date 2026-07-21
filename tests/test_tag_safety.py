import pytest
from app.modules.recommendations.services.tag_safety import (
    normalize_tag,
    expand_tags,
    has_word_match,
    TAG_SYNONYMS
)

def test_normalize_tag():
    assert normalize_tag("Transgender") == "transgender"
    assert normalize_tag("Transexual!") == "transexual"
    assert normalize_tag("group sex") == "groupsex"
    assert normalize_tag("") == ""

def test_expand_tags_transgender():
    expanded = expand_tags({"transgender"})
    assert "tranimals" in expanded
    assert "tranimal" in expanded
    assert "transexual" in expanded
    assert "transsexual" in expanded
    assert "tgirl" in expanded
    assert "shemale" in expanded

def test_has_word_match_tranimals():
    blacklist = expand_tags({"transgender"})
    assert has_word_match("Tranimals 4", blacklist) is True
    assert has_word_match("Transexual Escorts", blacklist) is True
    assert has_word_match("Regular Movie Title", blacklist) is False

def test_has_word_match_transexual_blacklist():
    blacklist = expand_tags({"transexual"})
    assert has_word_match("Tranimals", blacklist) is True
    assert has_word_match("Transgender Story", blacklist) is True

def test_has_word_match_partial_prefix():
    blacklist = expand_tags({"cuckold"})
    assert has_word_match("The Cuckolding of John", blacklist) is True

def test_pegging_synonyms():
    blacklist = expand_tags({"pegging"})
    assert "strapon" in blacklist
    assert has_word_match("Extreme Strapon Action", blacklist) is True

