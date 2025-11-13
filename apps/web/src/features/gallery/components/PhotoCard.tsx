import React, { memo, useState, useEffect, useRef } from 'react';
import { PhotoResponse } from '../../../api/gallery';
import { formatFileSize } from '../../../utils/fileUtils';

interface PhotoCardProps {
  photo: PhotoResponse;
  onClick: () => void;
  isSelected?: boolean;
  onSelect?: (photoId: string, selected: boolean) => void;
  showCheckbox?: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = memo(({ 
  photo, 
  onClick, 
  isSelected = false, 
  onSelect, 
  showCheckbox = false 
}) => {
  // Construct thumbnail URL - use thumbnail size for grid view
  // Backend serves at /api/photos/{photoId}/file?size=thumbnail
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const imageUrl = `${API_URL}/photos/${photo.id}/file?size=thumbnail`;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(photo.id, !isSelected);
    }
  };

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    // Handle quick actions (download, share, delete, etc.)
    console.log(`Quick action: ${action} for photo ${photo.id}`);
  };

  return (
    <div
      ref={cardRef}
      className={`group relative bg-black border border-white/10 overflow-hidden transition-all duration-300 cursor-pointer hover:border-white/30 ${
        isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''
      }`}
      onClick={onClick}
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
    >
      {/* Selection Checkbox with Animation */}
      {showCheckbox && (
        <div
          className="absolute top-3 left-3 z-20"
          onClick={handleCheckboxClick}
        >
          <div 
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isSelected 
                ? 'bg-white border-white scale-110' 
                : 'bg-black/50 border-white/30 hover:border-white/60 hover:scale-105'
            }`}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-black animate-bounce-in"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail Image with Lazy Loading and Blur-up Placeholder */}
      <div ref={containerRef} className="aspect-square bg-black overflow-hidden relative">
        {/* Shimmer loading placeholder */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 shimmer bg-white/5" />
        )}
        
        {/* Blur-up placeholder */}
        {isInView && !imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-white/5 blur-sm scale-110" />
        )}
        
        {/* Actual image with fade-in animation */}
        {isInView && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={photo.originalFileName}
            className={`w-full h-full object-cover transition-all duration-500 ${
              imageLoaded 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-110'
            } group-hover:scale-105`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              if (imgRef.current) {
                imgRef.current.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23000" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
              }
            }}
          />
        )}
        
        {/* Error placeholder */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <svg
              className="w-12 h-12 text-white/20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              shapeRendering="geometricPrecision"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Quick Action Buttons - Minimalist dark */}
        <div 
          className={`absolute bottom-3 right-3 flex gap-2 transition-all duration-300 ${
            showQuickActions 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-2'
          }`}
        >
          <button
            onClick={(e) => handleQuickAction(e, 'download')}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:scale-110 transition-all duration-150 border border-white/20"
            aria-label="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" shapeRendering="geometricPrecision">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={(e) => handleQuickAction(e, 'share')}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:scale-110 transition-all duration-150 border border-white/20"
            aria-label="Share"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" shapeRendering="geometricPrecision">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Overlay on Hover - Minimalist */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end pointer-events-none">
        <div className="w-full p-3 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-xs font-medium truncate uppercase tracking-wider">{photo.originalFileName}</p>
          {photo.width && photo.height && (
            <p className="text-xs mt-1 opacity-60 font-mono">{photo.width} × {photo.height}</p>
          )}
        </div>
      </div>

      {/* Info Bar - Minimalist dark */}
      <div className="p-2 bg-black border-t border-white/10">
        <p className="text-xs font-medium text-white/80 truncate uppercase tracking-wider">
          {photo.originalFileName}
        </p>
        <div className="flex items-center justify-between mt-1 text-xs text-white/40">
          <span className="font-mono">{formatFileSize(photo.fileSizeBytes)}</span>
          {photo.uploadedAt && (
            <span className="font-mono">{new Date(photo.uploadedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
});

PhotoCard.displayName = 'PhotoCard';

