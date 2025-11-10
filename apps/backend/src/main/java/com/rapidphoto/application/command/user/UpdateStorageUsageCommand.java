package com.rapidphoto.application.command.user;

import java.util.UUID;

public class UpdateStorageUsageCommand {
    private final UUID userId;
    private final long bytesToAdd;

    public UpdateStorageUsageCommand(UUID userId, long bytesToAdd) {
        this.userId = userId;
        this.bytesToAdd = bytesToAdd;
    }

    public UUID getUserId() {
        return userId;
    }

    public long getBytesToAdd() {
        return bytesToAdd;
    }
}

