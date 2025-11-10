package com.rapidphoto.infrastructure.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@ConditionalOnProperty(name = "storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalStorageService.class);

    @Value("${storage.local.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public String store(String path, InputStream inputStream, String contentType, long contentLength) {
        try {
            Path targetPath = Paths.get(uploadDir, path);
            Files.createDirectories(targetPath.getParent());
            
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            
            logger.info("Stored file locally: {}", path);
            return targetPath.toString();
            
        } catch (IOException e) {
            throw new StorageException("Failed to store file locally: " + path, e);
        }
    }

    @Override
    public InputStream retrieve(String path) {
        try {
            Path targetPath = Paths.get(uploadDir, path);
            return Files.newInputStream(targetPath);
        } catch (IOException e) {
            throw new StorageException("Failed to retrieve file: " + path, e);
        }
    }

    @Override
    public void delete(String path) {
        try {
            Path targetPath = Paths.get(uploadDir, path);
            Files.deleteIfExists(targetPath);
            logger.info("Deleted file locally: {}", path);
        } catch (IOException e) {
            throw new StorageException("Failed to delete file: " + path, e);
        }
    }

    @Override
    public boolean exists(String path) {
        Path targetPath = Paths.get(uploadDir, path);
        return Files.exists(targetPath);
    }

    @Override
    public String getStorageType() {
        return "LOCAL";
    }
}

