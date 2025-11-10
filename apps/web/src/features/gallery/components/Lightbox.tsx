import React, { useEffect, useCallback, useState } from 'react';
import { PhotoResponse, galleryApi } from '../../../api/gallery';
import { PhotoMetadata } from './PhotoMetadata';
import { Button } from '../../../components/ui/Button';

interface LightboxProps {
  photo: PhotoResponse | null;
  photos: PhotoResponse[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDelete?: (photoId: string) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  photo,
  photos,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (photo) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [photo, onClose]);

  // Handle arrow keys
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!photo) return;
      
      if (e.key === 'ArrowLeft') {
        onPrevious();
      } else if (e.key === 'ArrowRight') {
        onNext();
      }
    };

    if (photo) {
      document.addEventListener('keydown', handleArrowKeys);
    }

    return () => {
      document.removeEventListener('keydown', handleArrowKeys);
    };
  }, [photo, onNext, onPrevious]);

  if (!photo) return null;

  // Progressive loading: start with medium, then load large
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useLargeImage, setUseLargeImage] = useState(false);

  const mediumImageUrl = `http://localhost:8080/api/photos/${photo.id}/file?size=medium`;
  const largeImageUrl = `http://localhost:8080/api/photos/${photo.id}/file?size=large`;
  const originalImageUrl = `http://localhost:8080/api/photos/${photo.id}/file?size=original`;

  const handleDownload = useCallback(() => {
    if (!photo) return;

    // Download original size
    const link = document.createElement('a');
    link.href = originalImageUrl;
    link.download = photo.originalFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [photo, originalImageUrl]);

  const handleDelete = useCallback(async () => {
    if (!photo || !onDelete) return;

    setIsDeleting(true);
    try {
      await galleryApi.deletePhoto(photo.id);
      onDelete(photo.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Failed to delete photo. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [photo, onDelete, onClose]);
  
  // Start with medium, then load large
  useEffect(() => {
    if (photo) {
      setImageLoaded(false);
      setUseLargeImage(false);
      // Preload large image
      const img = new Image();
      img.onload = () => {
        setUseLargeImage(true);
      };
      img.src = largeImageUrl;
    }
  }, [photo, largeImageUrl]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
        aria-label="Close"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          shapeRendering="geometricPrecision"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Action Buttons */}
      <div className="absolute top-4 right-20 flex gap-2 z-10">
        <button
          onClick={handleDownload}
          className="text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
          aria-label="Download"
          title="Download photo"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            shapeRendering="geometricPrecision"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>
        {onDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-400 hover:text-red-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
            aria-label="Delete"
            title="Delete photo"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              shapeRendering="geometricPrecision"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Delete Photo?</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{photo.originalFileName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="secondary"
                size="sm"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                variant="danger"
                size="sm"
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-3"
          aria-label="Previous"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            shapeRendering="geometricPrecision"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-3"
          aria-label="Next"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            shapeRendering="geometricPrecision"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Main Content */}
      <div
        className="flex flex-col lg:flex-row max-w-7xl w-full h-full p-4 gap-4"
        onClick={(e) => e.stopPropagation()}
      >
                {/* Image with Progressive Loading */}
                <div className="flex-1 flex items-center justify-center relative">
                  {/* Medium image (placeholder) */}
                  {!useLargeImage && (
                    <img
                      src={mediumImageUrl}
                      alt={photo.originalFileName}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      onLoad={() => setImageLoaded(true)}
                    />
                  )}
                  
                  {/* Large image (progressive) */}
                  <img
                    src={useLargeImage ? largeImageUrl : mediumImageUrl}
                    alt={photo.originalFileName}
                    className={`max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300 ${
                      useLargeImage && imageLoaded ? 'opacity-100' : 'opacity-0 absolute'
                    }`}
                    onLoad={() => {
                      setImageLoaded(true);
                      if (useLargeImage) {
                        setImageLoaded(true);
                      }
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23333" width="800" height="600"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Available%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  
                  {/* Loading indicator */}
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

        {/* Metadata Panel */}
        <div className="w-full lg:w-80 bg-gray-900 text-white rounded-lg p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 truncate">{photo.originalFileName}</h2>

          {/* Use PhotoMetadata component */}
          <div className="text-white">
            <PhotoMetadata photo={photo} />
          </div>

          {/* Photo Counter */}
          <div className="text-sm text-gray-400 text-center pt-4 border-t border-gray-700 mt-6">
            {currentIndex + 1} of {photos.length}
          </div>
        </div>
      </div>
    </div>
  );
};

