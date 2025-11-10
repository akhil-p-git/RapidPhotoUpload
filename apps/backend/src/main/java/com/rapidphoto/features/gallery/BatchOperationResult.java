package com.rapidphoto.features.gallery;

import java.util.List;

public record BatchOperationResult(
    int totalRequested,
    int successful,
    int failed,
    List<String> errors
) {
    public BatchOperationResult {
        if (errors == null) {
            errors = List.of();
        }
    }
}

