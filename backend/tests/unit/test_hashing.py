import hashlib

def test_sha256_determinism():
    """Verify that evidence hash generation is completely deterministic."""
    file_content_1 = b"TLS 1.3 Audit Log - Approved"
    file_content_2 = b"TLS 1.3 Audit Log - Approved"
    file_content_diff = b"TLS 1.3 Audit Log - Denied"
    
    hash_1 = hashlib.sha256(file_content_1).hexdigest()
    hash_2 = hashlib.sha256(file_content_2).hexdigest()
    hash_diff = hashlib.sha256(file_content_diff).hexdigest()
    
    # Assert identical contents yield identical hashes
    assert hash_1 == hash_2
    
    # Assert different contents yield different hashes
    assert hash_1 != hash_diff
    
    # Assert hash is 64 hex characters (SHA-256 standard length)
    assert len(hash_1) == 64
    assert all(c in "0123456789abcdef" for c in hash_1)
