package com.rapidphoto.features.photo;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.infrastructure.storage.StorageService;
import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ImageMetadataExtractor {

    private static final Logger logger = LoggerFactory.getLogger(ImageMetadataExtractor.class);

    private final StorageService storageService;
    private final PhotoRepository photoRepository;

    public ImageMetadataExtractor(StorageService storageService, PhotoRepository photoRepository) {
        this.storageService = storageService;
        this.photoRepository = photoRepository;
    }

    /**
     * Extract image dimensions and EXIF data from photo
     * Updates photo entity with width, height, and EXIF data
     */
    public void extractMetadata(Photo photo) {
        UUID photoId = photo.getId().getValue();
        logger.info("Extracting metadata for photo: {}", photoId);

        try {
            // Get original image from storage
            String storagePath = photo.getStorageInfo().getStoragePath();
            InputStream imageStream = storageService.retrieve(storagePath);

            // Extract dimensions using ImageIO
            BufferedImage image = ImageIO.read(imageStream);
            if (image != null) {
                photo.setWidth(image.getWidth());
                photo.setHeight(image.getHeight());
                logger.debug("Extracted dimensions: {}x{} for photo: {}", 
                    image.getWidth(), image.getHeight(), photoId);
            }

            // Reset stream for EXIF extraction
            imageStream.close();
            imageStream = storageService.retrieve(storagePath);

            // Extract EXIF data using metadata-extractor
            Map<String, Object> exifData = new HashMap<>();
            LocalDateTime takenAtValue = null;
            BigDecimal locationLatValue = null;
            BigDecimal locationLonValue = null;
            
            try {
                Metadata metadata = ImageMetadataReader.readMetadata(imageStream);
                
                // Extract camera make/model
                ExifIFD0Directory ifd0Directory = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
                if (ifd0Directory != null) {
                    if (ifd0Directory.containsTag(ExifIFD0Directory.TAG_MAKE)) {
                        exifData.put("cameraMake", ifd0Directory.getString(ExifIFD0Directory.TAG_MAKE));
                    }
                    if (ifd0Directory.containsTag(ExifIFD0Directory.TAG_MODEL)) {
                        exifData.put("cameraModel", ifd0Directory.getString(ExifIFD0Directory.TAG_MODEL));
                    }
                }

                // Extract exposure settings
                ExifSubIFDDirectory exifDirectory = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
                if (exifDirectory != null) {
                    if (exifDirectory.containsTag(ExifSubIFDDirectory.TAG_ISO_EQUIVALENT)) {
                        exifData.put("iso", exifDirectory.getInteger(ExifSubIFDDirectory.TAG_ISO_EQUIVALENT));
                    }
                    if (exifDirectory.containsTag(ExifSubIFDDirectory.TAG_FNUMBER)) {
                        exifData.put("fNumber", exifDirectory.getDouble(ExifSubIFDDirectory.TAG_FNUMBER));
                    }
                    if (exifDirectory.containsTag(ExifSubIFDDirectory.TAG_EXPOSURE_TIME)) {
                        exifData.put("exposureTime", exifDirectory.getDouble(ExifSubIFDDirectory.TAG_EXPOSURE_TIME));
                    }
                    if (exifDirectory.containsTag(ExifSubIFDDirectory.TAG_FOCAL_LENGTH)) {
                        exifData.put("focalLength", exifDirectory.getDouble(ExifSubIFDDirectory.TAG_FOCAL_LENGTH));
                    }
                    if (exifDirectory.containsTag(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL)) {
                        String dateTimeStr = exifDirectory.getString(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
                        if (dateTimeStr != null) {
                            try {
                                // Parse EXIF date format: "yyyy:MM:dd HH:mm:ss"
                                String dateTimeFormatted = dateTimeStr.replaceFirst(":", "-").replaceFirst(":", "-").replace(" ", "T");
                                LocalDateTime takenAt = LocalDateTime.parse(dateTimeFormatted);
                                exifData.put("dateTaken", dateTimeStr);
                                // Store in photo metadata
                                takenAtValue = takenAt;
                            } catch (Exception e) {
                                logger.warn("Failed to parse date taken: {}", dateTimeStr);
                            }
                        }
                    }
                }

                // Extract GPS coordinates
                GpsDirectory gpsDirectory = metadata.getFirstDirectoryOfType(GpsDirectory.class);
                if (gpsDirectory != null) {
                    if (gpsDirectory.containsTag(GpsDirectory.TAG_LATITUDE) && 
                        gpsDirectory.containsTag(GpsDirectory.TAG_LONGITUDE)) {
                        double lat = gpsDirectory.getGeoLocation().getLatitude();
                        double lon = gpsDirectory.getGeoLocation().getLongitude();
                        locationLatValue = BigDecimal.valueOf(lat);
                        locationLonValue = BigDecimal.valueOf(lon);
                        exifData.put("gpsLatitude", lat);
                        exifData.put("gpsLongitude", lon);
                        logger.debug("Extracted GPS coordinates: {}, {} for photo: {}", lat, lon, photoId);
                    }
                }
                
                logger.info("Successfully extracted EXIF data for photo: {}", photoId);
            } catch (ImageProcessingException e) {
                logger.warn("Could not extract EXIF data for photo: {} - {}", photoId, e.getMessage());
                // Continue without EXIF data
            }

            imageStream.close();
            
            // Store EXIF data and location in photo entity using PhotoMetadata
            com.rapidphoto.domain.photo.PhotoMetadata currentMetadata = photo.getPhotoMetadata();
            Map<String, Object> existingMetadata = currentMetadata != null ? currentMetadata.getMetadata() : new HashMap<>();
            Map<String, Object> existingAiTags = currentMetadata != null ? currentMetadata.getAiTags() : null;
            
            com.rapidphoto.domain.photo.PhotoMetadata updatedMetadata = new com.rapidphoto.domain.photo.PhotoMetadata(
                existingMetadata,
                exifData.isEmpty() ? (currentMetadata != null ? currentMetadata.getExifData() : null) : exifData,
                existingAiTags,
                locationLatValue != null ? locationLatValue.doubleValue() : (currentMetadata != null ? currentMetadata.getLocationLat() : null),
                locationLonValue != null ? locationLonValue.doubleValue() : (currentMetadata != null ? currentMetadata.getLocationLon() : null),
                takenAtValue != null ? takenAtValue : (currentMetadata != null ? currentMetadata.getTakenAt() : null)
            );
            photo.setPhotoMetadata(updatedMetadata);
            
            // Save photo with updated metadata
            photoRepository.save(photo);
            
        } catch (Exception e) {
            logger.error("Failed to extract metadata for photo: {}", photoId, e);
            // Don't throw exception - metadata extraction is optional
        }
    }
}

