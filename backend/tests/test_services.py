from app.services import chunk_text, extract_file


def test_chunk_text_returns_empty_for_empty_input():
    assert chunk_text("") == []


def test_chunk_text_splits_long_text_with_overlap():
    words = [f"word{i}" for i in range(11)]
    chunks = chunk_text(" ".join(words), size=5, overlap=2)

    assert len(chunks) == 3
    assert chunks[0].split() == words[0:5]
    assert chunks[1].split() == words[3:8]
    assert chunks[2].split() == words[6:11]


def test_chunk_text_keeps_short_text_as_one_chunk():
    assert chunk_text("one two three", size=5, overlap=1) == ["one two three"]


def test_chunk_text_rejects_invalid_overlap():
    try:
        chunk_text("some words", size=5, overlap=5)
    except ValueError as exc:
        assert "smaller than chunk size" in str(exc)
    else:
        raise AssertionError("Expected invalid overlap to raise ValueError")


def test_extract_txt_file_decodes_utf8():
    result = extract_file("notes.txt", "Hello VivaProof".encode("utf-8"))
    assert result == [{"text": "Hello VivaProof", "page": None}]


def test_extract_markdown_file_decodes_utf8():
    result = extract_file("notes.md", "# Project\nEvidence".encode("utf-8"))
    assert result == [{"text": "# Project\nEvidence", "page": None}]


def test_extract_rejects_unsupported_file_type():
    try:
        extract_file("image.png", b"not a document")
    except ValueError as exc:
        assert "Unsupported file type" in str(exc)
    else:
        raise AssertionError("Expected unsupported file type to raise ValueError")
