package com.rapidphoto.features.upload.chunk;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.UploadChunk;
import com.rapidphoto.domain.photo.UploadChunkRepository;
import com.rapidphoto.infrastructure.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Removes one abandoned upload's chunks and marks the photo failed.
 *
 * Separate from AbandonedUploadCleanupService on purpose: @Transactional is
 * applied by a proxy, so a method called from a sibling method of the same bean
 * runs with no transaction at all. Keeping the transactional unit in its own
 * bean means the annotation actually takes effect.
 */
@Service
public class AbandonedUploadCollector {

    private static final Logger logger = LoggerFactory.getLogger(AbandonedUploadCollector.class);

    private final PhotoRepository photoRepository;
    private final UploadChunkRepository chunkRepository;
    private final StorageService storageService;

    public AbandonedUploadCollector(PhotoRepository photoRepository,
                                    UploadChunkRepository chunkRepository,
                                    StorageService storageService) {
        this.photoRepository = photoRepository;
        this.chunkRepository = chunkRepository;
        this.storageService = storageService;
    }

    /**
     * Storage objects go first, rows second. If the process dies in between,
     * the photo is still UPLOADING so the next sweep retries it; the reverse
     * order would orphan objects with no remaining record of where they are.
     */
    @Transactional
    public void collect(Photo photo) {
        UUID photoId = photo.getId().getValue();
        List<UploadChunk> chunks = chunkRepository.findByPhotoId(photoId);

        for (UploadChunk chunk : chunks) {
            String chunkPath = String.format("%s/chunks/chunk_%d", photoId, chunk.getChunkNumber());
            try {
                storageService.delete(chunkPath);
            } catch (Exception e) {
                logger.debug("Chunk object already gone or undeletable: {} ({})", chunkPath, e.getMessage());
            }
        }

        chunkRepository.deleteAll(chunks);

        photo.markAsFailed();
        photoRepository.save(photo);

        logger.info("Collected abandoned upload: photoId={}, chunks={}", photoId, chunks.size());
    }
}
