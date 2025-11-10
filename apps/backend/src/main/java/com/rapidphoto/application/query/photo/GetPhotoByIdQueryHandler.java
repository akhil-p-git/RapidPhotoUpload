package com.rapidphoto.application.query.photo;

import com.rapidphoto.application.dto.PhotoDto;
import com.rapidphoto.application.query.QueryHandler;
import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GetPhotoByIdQueryHandler implements QueryHandler<GetPhotoByIdQuery, PhotoDto> {

    private final PhotoRepository photoRepository;

    public GetPhotoByIdQueryHandler(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PhotoDto handle(GetPhotoByIdQuery query) {
        Photo photo = photoRepository.findById(query.getPhotoId())
            .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + query.getPhotoId()));

        return mapToDto(photo);
    }

    private PhotoDto mapToDto(Photo photo) {
        PhotoDto dto = new PhotoDto();
        dto.setId(photo.getId().getValue());
        dto.setUserId(photo.getUserId().getValue());
        dto.setFileName(photo.getFileName());
        dto.setOriginalFileName(photo.getOriginalFileName());
        dto.setFileSizeBytes(photo.getFileSizeBytes());
        dto.setMimeType(photo.getMimeType());
        dto.setWidth(photo.getWidth());
        dto.setHeight(photo.getHeight());
        dto.setStatus(photo.getStatus().name());
        dto.setUploadedAt(photo.getUploadedAt());
        dto.setProcessedAt(photo.getProcessedAt());
        return dto;
    }
}

