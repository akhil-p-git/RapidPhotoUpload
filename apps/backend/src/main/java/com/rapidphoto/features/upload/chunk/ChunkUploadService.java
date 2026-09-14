package com.rapidphoto.features.upload.chunk;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.PhotoStatus;
import com.rapidphoto.domain.photo.UploadChunk;
import com.rapidphoto.domain.photo.UploadChunkRepository;
import com.rapidphoto.features.upload.progress.ProgressBroadcastService;
import com.rapidphoto.infrastructure.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class ChunkUploadService {

    private static final Logger logger = LoggerFactory.getLogger(ChunkUploadService.class);

    private final UploadChunkRepository chunkRepository;
    private final PhotoRepository photoRepository;
    private final StorageService storageService;
    private final ChunkAssemblyService assemblyService;
    private final ProgressBroadcastService progressBroadcastService;

    @Value("${upload.chunk-size:5242880}")
    private long chunkSize;

    public ChunkUploadService(UploadChunkRepository chunkRepository,
                             PhotoRepository photoRepository,
                             StorageService storageService,
                             ChunkAssemblyService assemblyService,
                             ProgressBroadcastService progressBroadcastService) {
        this.chunkRepository = chunkRepository;
        this.photoRepository = photoRepository;
        this.storageService = storageService;
        this.assemblyService = assemblyService;
        this.progressBroadcastService = progressBroadcastService;
    }

    @Transactional
    public ChunkUploadResponse uploadChunk(ChunkUploadRequest request, MultipartFile file) {
        try {
            UUID photoId = request.getPhotoId();
            Integer chunkNumber = request.getChunkNumber();

            // Validate photo exists
            Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

            // Check if chunk already uploaded (idempotency)
            if (chunkRepository.existsByPhotoIdAndChunkNumber(photoId, chunkNumber)) {
                logger.info("Chunk already uploaded: photoId={}, chunk={}", photoId, chunkNumber);

                ChunkUploadResponse progress = getUploadProgress(photoId, request.getTotalChunks());

                // A resuming client that finds every chunk already stored has no
                // chunk left to send, yet the file may never have been assembled
                // -- the process can die between the final chunk landing and
                // assembly starting. Treat a duplicate of the last outstanding
                // chunk as a completeness check so one cheap re-send is enough to
                // recover, rather than leaving the upload stuck for ever.
                boolean complete = progress.getMissingChunks() != null
                    && progress.getMissingChunks().isEmpty()
                    && progress.getTotalChunks() != null
                    && progress.getTotalChunks() > 0;

                if (complete && photo.getStatus() == PhotoStatus.UPLOADING) {
                    logger.info("All chunks present but photo still UPLOADING; starting assembly: {}", photoId);
                    assemblyService.assembleChunks(photoId, progress.getTotalChunks());
                    progress.setStatus("COMPLETED");
                    progress.setMessage("Upload already complete. Assembling file.");
                }

                return progress;
            }

            // Store chunk to temporary location
            String chunkPath = String.format("%s/chunks/chunk_%d", photoId, chunkNumber);
            String storageUrl = storageService.store(
                chunkPath,
                file.getInputStream(),
                file.getContentType(),
                file.getSize()
            );

            // Calculate checksum if not provided
            String checksum = request.getChecksum();
            if (checksum == null) {
                checksum = calculateChecksum(file.getBytes());
            }

            // Save chunk metadata
            UploadChunk chunk = new UploadChunk(UUID.randomUUID(), photoId, chunkNumber, file.getSize());
            chunk.setChecksum(checksum);
            chunk.markAsUploaded();
            chunkRepository.save(chunk);

            logger.info("Chunk uploaded: photoId={}, chunk={}/{}, size={}", 
                photoId, chunkNumber + 1, request.getTotalChunks(), file.getSize());

            // Broadcast progress
            progressBroadcastService.broadcastChunkUploaded(
                photoId,
                chunkNumber,
                file.getSize()
            );

            // Check if all chunks uploaded
            long uploadedCount = chunkRepository.countByPhotoIdAndStatus(photoId, UploadChunk.ChunkStatus.UPLOADED);
            
            ChunkUploadResponse response = new ChunkUploadResponse(
                photoId,
                chunkNumber,
                "SUCCESS",
                (int) uploadedCount,
                request.getTotalChunks()
            );

            if (uploadedCount == request.getTotalChunks()) {
                // All chunks uploaded - trigger assembly
                logger.info("All chunks uploaded for photo: {}, starting assembly", photoId);
                progressBroadcastService.broadcastUploadCompleted(photoId);
                assemblyService.assembleChunks(photoId, request.getTotalChunks());
                response.setStatus("COMPLETED");
                response.setMessage("Upload completed. Assembling file.");
            } else {
                response.setMessage(String.format("Chunk %d/%d uploaded successfully", 
                    uploadedCount, request.getTotalChunks()));
            }

            return response;

        } catch (IOException e) {
            logger.error("Failed to upload chunk: photoId={}, chunk={}", 
                request.getPhotoId(), request.getChunkNumber(), e);
            throw new RuntimeException("Chunk upload failed", e);
        }
    }

    /**
     * Number of chunks a file of this size is split into, from the server's own
     * configured chunk size. Derived rather than taken from the client so a
     * caller cannot shrink the expected total and be told an upload is complete.
     */
    public int expectedChunkCount(long fileSizeBytes) {
        if (fileSizeBytes <= 0) return 0;
        return (int) ((fileSizeBytes + chunkSize - 1) / chunkSize);
    }

    public ChunkUploadResponse getUploadProgress(UUID photoId, Integer totalChunks) {
        int expected = totalChunks != null && totalChunks > 0
            ? totalChunks
            : photoRepository.findById(photoId)
                .map(p -> expectedChunkCount(p.getFileSizeBytes()))
                .orElse(0);

        // Received set and count come from one query over one status. They were
        // previously derived from two different queries -- a count filtered to
        // UPLOADED and a list that included every row regardless of status -- so
        // a PENDING or FAILED row made the two disagree and a chunk that never
        // landed was reported as present.
        List<Integer> receivedChunks = chunkRepository
            .findByPhotoIdAndStatusOrderByChunkNumberAsc(photoId, UploadChunk.ChunkStatus.UPLOADED)
            .stream()
            .map(UploadChunk::getChunkNumber)
            .collect(Collectors.toList());

        Set<Integer> received = new HashSet<>(receivedChunks);
        List<Integer> missingChunks = IntStream.range(0, expected)
            .filter(i -> !received.contains(i))
            .boxed()
            .collect(Collectors.toList());

        ChunkUploadResponse response = new ChunkUploadResponse(
            photoId,
            null,
            missingChunks.isEmpty() && expected > 0 ? "COMPLETED" : "IN_PROGRESS",
            receivedChunks.size(),
            expected
        );
        response.setReceivedChunks(receivedChunks);
        response.setMissingChunks(missingChunks);
        response.setMessage(String.format("%d/%d chunks uploaded", receivedChunks.size(), expected));

        return response;
    }

    private String calculateChecksum(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            logger.warn("Failed to calculate checksum", e);
            return null;
        }
    }
}

