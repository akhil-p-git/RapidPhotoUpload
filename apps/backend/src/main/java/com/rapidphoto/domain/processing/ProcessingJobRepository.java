package com.rapidphoto.domain.processing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProcessingJobRepository extends JpaRepository<ProcessingJob, UUID> {
    List<ProcessingJob> findByPhotoId(UUID photoId);
    List<ProcessingJob> findByStatus(JobStatus status);
    List<ProcessingJob> findByJobType(JobType jobType);
    List<ProcessingJob> findByStatusOrderByPriorityDescCreatedAtAsc(JobStatus status);
}

