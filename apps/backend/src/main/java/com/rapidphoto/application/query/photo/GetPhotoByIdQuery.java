package com.rapidphoto.application.query.photo;

import java.util.UUID;

public class GetPhotoByIdQuery {
    private final UUID photoId;

    public GetPhotoByIdQuery(UUID photoId) {
        this.photoId = photoId;
    }

    public UUID getPhotoId() {
        return photoId;
    }
}

