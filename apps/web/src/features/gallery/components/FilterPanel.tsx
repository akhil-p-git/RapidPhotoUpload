import React from 'react';
import { PhotoFilters } from '../../../api/gallery';
import { Button } from '../../../components/ui/Button';

interface FilterPanelProps {
  filters: PhotoFilters;
  onFiltersChange: (filters: PhotoFilters) => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onReset,
  isOpen,
  onToggle,
}) => {
  const updateFilter = (key: keyof PhotoFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.status !== 'COMPLETED' ||
    filters.startDate ||
    filters.endDate ||
    filters.sortBy !== 'uploadedAt' ||
    filters.sortOrder !== 'desc';

  return (
    <div className="mb-6">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
              Active
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <Button onClick={onReset} variant="ghost" size="sm">
            Reset
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status || 'COMPLETED'}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="COMPLETED">Completed</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
                <option value="COMPLETED,PROCESSING">Completed & Processing</option>
                <option value="">All</option>
              </select>
            </div>

            {/* Date Range - Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilter('startDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range - End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilter('endDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={`${filters.sortBy || 'uploadedAt'}-${filters.sortOrder || 'desc'}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  updateFilter('sortBy', sortBy);
                  updateFilter('sortOrder', sortOrder as 'asc' | 'desc');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="uploadedAt-desc">Newest First</option>
                <option value="uploadedAt-asc">Oldest First</option>
                <option value="fileSizeBytes-desc">Largest First</option>
                <option value="fileSizeBytes-asc">Smallest First</option>
                <option value="originalFileName-asc">Name A-Z</option>
                <option value="originalFileName-desc">Name Z-A</option>
              </select>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 },
                { label: 'This year', year: new Date().getFullYear() },
              ].map((filter) => (
                <Button
                  key={filter.label}
                  onClick={() => {
                    const endDate = new Date().toISOString().split('T')[0];
                    let startDate: string;
                    if (filter.days) {
                      const date = new Date();
                      date.setDate(date.getDate() - filter.days);
                      startDate = date.toISOString().split('T')[0];
                    } else {
                      startDate = `${filter.year}-01-01`;
                    }
                    updateFilter('startDate', startDate);
                    updateFilter('endDate', endDate);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

