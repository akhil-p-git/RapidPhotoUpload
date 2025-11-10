package com.rapidphoto.domain.photo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UploadChunkRepository extends JpaRepository<UploadChunk, UUID> {

    boolean existsByPhotoIdAndChunkNumber(UUID photoId, Integer chunkNumber);

    long countByPhotoIdAndStatus(UUID photoId, UploadChunk.ChunkStatus status);

    List<UploadChunk> findByPhotoIdOrderByChunkNumberAsc(UUID photoId);

    List<UploadChunk> findByPhotoId(UUID photoId);
}
