import React from 'react';
import { PhotoStats as PhotoStatsType } from '../../../api/gallery';
import { formatFileSize } from '../../../utils/fileUtils';

interface PhotoStatsProps {
  stats: PhotoStatsType | null;
  loading?: boolean;
}

export const PhotoStats: React.FC<PhotoStatsProps> = ({ stats, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-t border-white/10 pt-6 animate-pulse">
            <div className="h-3 bg-white/10 rounded w-24 mb-3" />
            <div className="h-8 bg-white/10 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const storagePercent = Math.min(stats.storageUsedPercent, 100);

  return (
    <div className="mb-12 space-y-8">
      {/* Quick Stats - Minimalist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Photos */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-xs font-medium tracking-widest uppercase text-white/60 mb-3">Total Photos</p>
          <p className="text-3xl font-bold text-white">
            {stats.totalPhotos.toLocaleString()}
          </p>
        </div>

        {/* Recent Uploads */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-xs font-medium tracking-widest uppercase text-white/60 mb-3">Recent Uploads</p>
          <p className="text-3xl font-bold text-white mb-1">
            {stats.recentUploads.toLocaleString()}
          </p>
          <p className="text-xs text-white/40 font-mono">Last 7 days</p>
        </div>

        {/* Total Size */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-xs font-medium tracking-widest uppercase text-white/60 mb-3">Total Size</p>
          <p className="text-3xl font-bold text-white">
            {formatFileSize(stats.totalSizeBytes)}
          </p>
        </div>

        {/* Storage Used */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-xs font-medium tracking-widest uppercase text-white/60 mb-3">Storage Used</p>
          <p className="text-3xl font-bold text-white mb-1">
            {storagePercent.toFixed(1)}%
          </p>
          <p className="text-xs text-white/40 font-mono">
            {formatFileSize(stats.storageUsedBytes)} / {formatFileSize(stats.storageQuotaBytes)}
          </p>
        </div>
      </div>

      {/* Storage Progress Bar - Minimalist */}
      <div className="border-t border-white/10 pt-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium tracking-widest uppercase text-white/60">Storage Usage</p>
          <span className="text-xs text-white/60 font-mono">
            {storagePercent.toFixed(1)}% used
          </span>
        </div>
        <div className="w-full bg-white/10 h-1">
          <div
            className={`h-1 transition-all duration-300 ${
              storagePercent < 50
                ? 'bg-white'
                : storagePercent < 80
                ? 'bg-white/80'
                : 'bg-white/60'
            }`}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-white/40 font-mono">
          <span>{formatFileSize(stats.storageUsedBytes)} used</span>
          <span>{formatFileSize(stats.storageQuotaBytes - stats.storageUsedBytes)} available</span>
        </div>
      </div>

      {/* Photos by Status - Minimalist */}
      {Object.keys(stats.photosByStatus).length > 0 && (
        <div className="border-t border-white/10 pt-8">
          <p className="text-xs font-medium tracking-widest uppercase text-white/60 mb-6">
            Photos by Status
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(stats.photosByStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-3xl font-bold text-white mb-1">
                  {count.toLocaleString()}
                </p>
                <p className="text-xs text-white/60 uppercase tracking-wider">
                  {status.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

