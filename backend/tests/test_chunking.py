from app.services import chunk_text


def test_empty_text_returns_no_chunks():
    assert chunk_text("") == []


def test_short_text_is_one_chunk():
    assert chunk_text("one two three", size=5, overlap=1) == ["one two three"]


def test_chunks_overlap_by_requested_word_count():
    chunks = chunk_text("one two three four five six seven", size=4, overlap=1)
    assert chunks == ["one two three four", "four five six seven"]


def test_invalid_overlap_is_rejected():
    try:
        chunk_text("one two", size=3, overlap=3)
    except ValueError as error:
        assert "smaller than chunk size" in str(error)
    else:
        raise AssertionError("Expected invalid overlap to raise ValueError")
