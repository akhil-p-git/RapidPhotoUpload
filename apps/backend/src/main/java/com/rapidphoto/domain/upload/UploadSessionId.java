package com.rapidphoto.domain.upload;

import java.util.UUID;
import java.util.Objects;

public class UploadSessionId {
    private final UUID value;

    public UploadSessionId(UUID value) {
        Objects.requireNonNull(value, "UploadSessionId cannot be null");
        this.value = value;
    }

    public static UploadSessionId generate() {
        return new UploadSessionId(UUID.randomUUID());
    }

    public static UploadSessionId from(String value) {
        return new UploadSessionId(UUID.fromString(value));
    }

    public UUID getValue() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UploadSessionId that = (UploadSessionId) o;
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return value.toString();
    }
}

