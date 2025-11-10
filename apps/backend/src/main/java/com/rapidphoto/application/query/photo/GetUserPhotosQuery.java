package com.rapidphoto.application.query.photo;

import java.util.UUID;

public class GetUserPhotosQuery {
    private final UUID userId;

    public GetUserPhotosQuery(UUID userId) {
        this.userId = userId;
    }

    public UUID getUserId() {
        return userId;
    }
}

