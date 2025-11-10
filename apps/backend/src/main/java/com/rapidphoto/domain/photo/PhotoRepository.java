package com.rapidphoto.domain.photo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    List<Photo> findByUserIdOrderByUploadedAtDesc(UUID userId);
    List<Photo> findByStatus(PhotoStatus status);
    List<Photo> findByUploadSessionId(UUID uploadSessionId);
    
    // Paginated queries for gallery
    Page<Photo> findByUserIdAndStatusOrderByUploadedAtDesc(
        UUID userId, 
        PhotoStatus status, 
        Pageable pageable
    );
    
    Page<Photo> findByUserIdOrderByUploadedAtDesc(
        UUID userId, 
        Pageable pageable
    );
    
    @Query("SELECT p FROM Photo p WHERE p.userId = :userId AND p.status = :status ORDER BY p.uploadedAt DESC")
    Page<Photo> findUserPhotosByStatus(
        @Param("userId") UUID userId,
        @Param("status") PhotoStatus status,
        Pageable pageable
    );
    
    /**
     * Find photo by ID and user ID (for ownership verification)
     */
    Optional<Photo> findByIdAndUserId(UUID id, UUID userId);
    
    /**
     * Advanced queries for search and filtering
     */
    Page<Photo> findByUserIdAndOriginalFileNameContainingIgnoreCase(
        UUID userId,
        String search,
        Pageable pageable
    );
    
    Page<Photo> findByUserIdAndUploadedAtBetween(
        UUID userId,
        LocalDateTime startDate,
        LocalDateTime endDate,
        Pageable pageable
    );
    
    Page<Photo> findByUserIdAndStatusIn(
        UUID userId,
        List<PhotoStatus> statuses,
        Pageable pageable
    );
    
    Page<Photo> findByUserIdAndOriginalFileNameContainingIgnoreCaseAndStatusIn(
        UUID userId,
        String search,
        List<PhotoStatus> statuses,
        Pageable pageable
    );
    
    Page<Photo> findByUserIdAndOriginalFileNameContainingIgnoreCaseAndUploadedAtBetween(
        UUID userId,
        String search,
        LocalDateTime startDate,
        LocalDateTime endDate,
        Pageable pageable
    );
    
    Page<Photo> findByUserIdAndStatusInAndUploadedAtBetween(
        UUID userId,
        List<PhotoStatus> statuses,
        LocalDateTime startDate,
        LocalDateTime endDate,
        Pageable pageable
    );
    
    Page<Photo> findByUserIdAndOriginalFileNameContainingIgnoreCaseAndStatusInAndUploadedAtBetween(
        UUID userId,
        String search,
        List<PhotoStatus> statuses,
        LocalDateTime startDate,
        LocalDateTime endDate,
        Pageable pageable
    );
    
    /**
     * Stats queries
     */
    long countByUserId(UUID userId);
    
    long countByUserIdAndStatus(UUID userId, PhotoStatus status);
    
    @Query("SELECT COUNT(p) FROM Photo p WHERE p.userId = :userId AND p.uploadedAt >= :startDate")
    long countByUserIdAndUploadedAtAfter(
        @Param("userId") UUID userId,
        @Param("startDate") LocalDateTime startDate
    );
    
    @Query("SELECT COALESCE(SUM(p.fileSizeBytes), 0) FROM Photo p WHERE p.userId = :userId")
    long sumFileSizeByUserId(@Param("userId") UUID userId);
}

