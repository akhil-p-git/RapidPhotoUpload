package com.rapidphoto.application.query.photo;

import com.rapidphoto.application.dto.PhotoDto;
import com.rapidphoto.application.query.QueryHandler;
import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GetUserPhotosQueryHandler implements QueryHandler<GetUserPhotosQuery, List<PhotoDto>> {

    private final PhotoRepository photoRepository;

    public GetUserPhotosQueryHandler(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PhotoDto> handle(GetUserPhotosQuery query) {
        List<Photo> photos = photoRepository.findByUserIdOrderByUploadedAtDesc(query.getUserId());
        
        return photos.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
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

