import React from 'react';
import { PhotoResponse } from '../../../api/gallery';
import { formatFileSize } from '../../../utils/fileUtils';

interface PhotoMetadataProps {
  photo: PhotoResponse;
}

export const PhotoMetadata: React.FC<PhotoMetadataProps> = ({ photo }) => {
  const exifData = photo.exifData || {};
  const aiTags = photo.aiTags || {};
  const metadata = photo.metadata || {};

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatExifValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Basic Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Filename:</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium truncate ml-4 max-w-xs">
              {photo.originalFileName}
            </span>
          </div>
          {photo.width && photo.height && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Dimensions:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {photo.width} × {photo.height} px
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">File Size:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatFileSize(photo.fileSizeBytes)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">MIME Type:</span>
            <span className="text-gray-900 dark:text-gray-100">{photo.mimeType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span className="text-gray-900 dark:text-gray-100 capitalize">{photo.status.toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Dates
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Uploaded:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatDate(photo.uploadedAt)}
            </span>
          </div>
          {photo.processedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Processed:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatDate(photo.processedAt)}
              </span>
            </div>
          )}
          {photo.takenAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Taken:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatDate(photo.takenAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* EXIF Data */}
      {Object.keys(exifData).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            EXIF Data
          </h3>
          <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {Object.entries(exifData).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 dark:text-gray-100 text-right max-w-xs truncate">
                  {formatExifValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tags */}
      {Object.keys(aiTags).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            AI Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(aiTags).map(([tag, confidence]) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {tag}
                {typeof confidence === 'number' && (
                  <span className="ml-1 opacity-75">
                    ({(confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {(photo.locationLat || photo.locationLon) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Location
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {photo.locationLat?.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {photo.locationLon?.toFixed(6)}
              </span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${photo.locationLat},${photo.locationLon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              View on Google Maps →
            </a>
          </div>
        </div>
      )}

      {/* Additional Metadata */}
      {Object.keys(metadata).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Additional Metadata
          </h3>
          <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 dark:text-gray-100 text-right max-w-xs truncate">
                  {formatExifValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

