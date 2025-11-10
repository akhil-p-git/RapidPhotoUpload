import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

interface EmptyStateProps {
  type: 'no-photos' | 'no-results' | 'filtered-no-results';
  searchTerm?: string;
  onClearFilters?: () => void;
  onUpload?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  searchTerm,
  onClearFilters,
  onUpload,
}) => {
  const handleUpload = () => {
    if (onUpload) {
      onUpload();
    } else {
      window.location.href = '/upload';
    }
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
  };

  if (type === 'no-photos') {
    return (
      <Card glass className="max-w-md mx-auto animate-scale-in">
        <div className="p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-primary/10 dark:bg-gradient-primary/20 flex items-center justify-center animate-bounce-in">
            <svg
              className="w-12 h-12 text-primary-500 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display gradient-text mb-3">
            No photos yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
            Upload your first photo to get started!
          </p>
          <Button onClick={handleUpload} variant="primary" size="lg" className="animate-pulse-glow">
            Upload Photos
          </Button>
        </div>
      </Card>
    );
  }

  if (type === 'no-results') {
    return (
      <Card glass className="max-w-md mx-auto animate-scale-in">
        <div className="p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center animate-bounce-in">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-gray-100 mb-3">
            No results found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2 text-lg">
            {searchTerm ? (
              <>
                No photos match <span className="font-semibold text-primary-600 dark:text-primary-400">"{searchTerm}"</span>
              </>
            ) : (
              'No photos match your search'
            )}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Try adjusting your search terms or filters
          </p>
          {onClearFilters && (
            <Button onClick={handleClearFilters} variant="secondary" size="md">
              Clear Filters
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (type === 'filtered-no-results') {
    return (
      <Card glass className="max-w-md mx-auto animate-scale-in">
        <div className="p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-warning-100 dark:bg-warning-900/20 flex items-center justify-center animate-bounce-in">
            <svg
              className="w-12 h-12 text-warning-500 dark:text-warning-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-gray-100 mb-3">
            No photos match your filters
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
            Try adjusting your filters to see more photos
          </p>
          {onClearFilters && (
            <Button onClick={handleClearFilters} variant="secondary" size="md">
              Clear All Filters
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return null;
};

