package com.rapidphoto.application.query.user;

import java.util.UUID;

public class GetUserByIdQuery {
    private final UUID userId;

    public GetUserByIdQuery(UUID userId) {
        this.userId = userId;
    }

    public UUID getUserId() {
        return userId;
    }
}

