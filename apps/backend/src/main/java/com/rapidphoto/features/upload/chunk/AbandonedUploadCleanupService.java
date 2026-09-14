package com.rapidphoto.features.upload.chunk;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.PhotoStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Reclaims storage and rows left behind by chunked uploads that were never
 * finished -- the tab was closed, the network dropped, the user walked away.
 *
 * Without this, every abandoned upload leaks one object per chunk in the bucket
 * plus a row per chunk in upload_chunks, and the photo sits in UPLOADING for
 * ever. Nothing else in the system ever removes them: assembly only deletes
 * chunks on the success path.
 *
 * A note on naming: the domain has an UploadSession entity that looks like it
 * should own this lifecycle, but nothing in the codebase ever constructs or
 * persists one -- Photo.uploadSessionId is always null. Expiring upload_sessions
 * rows would therefore be a no-op. The thing that actually accumulates is
 * chunks belonging to a Photo still in UPLOADING, so that is what is collected.
 */
@Service
public class AbandonedUploadCleanupService {

    private static final Logger logger = LoggerFactory.getLogger(AbandonedUploadCleanupService.class);

    private final PhotoRepository photoRepository;
    private final AbandonedUploadCollector collector;

    /** How long an incomplete upload may sit untouched before it is collected. */
    @Value("${upload.cleanup.ttl-minutes:120}")
    private long ttlMinutes;

    @Value("${upload.cleanup.enabled:true}")
    private boolean enabled;

    /** Bound the work per pass so a large backlog cannot monopolise the scheduler. */
    @Value("${upload.cleanup.max-per-run:200}")
    private int maxPerRun;

    public AbandonedUploadCleanupService(PhotoRepository photoRepository,
                                         AbandonedUploadCollector collector) {
        this.photoRepository = photoRepository;
        this.collector = collector;
    }

    @Scheduled(
        initialDelayString = "${upload.cleanup.initial-delay-ms:60000}",
        fixedDelayString = "${upload.cleanup.interval-ms:900000}"
    )
    public void collectAbandonedUploads() {
        if (!enabled) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(ttlMinutes);
        List<Photo> stale = photoRepository.findByStatusAndUploadedAtBefore(PhotoStatus.UPLOADING, cutoff);

        if (stale.isEmpty()) return;

        int considered = Math.min(stale.size(), maxPerRun);
        logger.info("Abandoned upload sweep: {} stale upload(s) older than {}m, collecting {}",
            stale.size(), ttlMinutes, considered);

        int collected = 0;
        for (Photo photo : stale.subList(0, considered)) {
            try {
                collector.collect(photo);
                collected++;
            } catch (Exception e) {
                // One bad photo must not abort the sweep; it will be retried next pass.
                logger.warn("Failed to collect abandoned upload photoId={}: {}",
                    photo.getId().getValue(), e.getMessage());
            }
        }

        logger.info("Abandoned upload sweep finished: {}/{} collected", collected, considered);
    }

}
