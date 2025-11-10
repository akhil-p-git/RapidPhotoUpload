package com.rapidphoto.domain.photo;

import java.util.UUID;
import java.util.Objects;

public class PhotoId {
    private final UUID value;

    public PhotoId(UUID value) {
        Objects.requireNonNull(value, "PhotoId cannot be null");
        this.value = value;
    }

    public static PhotoId generate() {
        return new PhotoId(UUID.randomUUID());
    }

    public static PhotoId from(String value) {
        return new PhotoId(UUID.fromString(value));
    }

    public UUID getValue() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PhotoId photoId = (PhotoId) o;
        return Objects.equals(value, photoId.value);
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

