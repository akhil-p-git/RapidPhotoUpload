package com.rapidphoto.application.query.user;

import java.util.UUID;

public class GetUserStorageStatsQuery {
    private final UUID userId;

    public GetUserStorageStatsQuery(UUID userId) {
        this.userId = userId;
    }

    public UUID getUserId() {
        return userId;
    }
}

