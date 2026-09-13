package com.rapidphoto.infrastructure.storage;

/**
 * What the store actually holds at a key, as opposed to what a client claimed
 * it would upload. Used to check a finished direct upload against its
 * declaration.
 */
public record StoredObject(long contentLength, String contentType) {}
