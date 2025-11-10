import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'primary' | 'success' | 'error' | 'warning';
  variant?: 'bar' | 'ring';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  showLabel = true,
  color = 'primary',
  variant = 'bar',
  size = 'md',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    primary: 'bg-gradient-primary',
    success: 'bg-success-500',
    error: 'bg-error-500',
    warning: 'bg-warning-500',
  };

  const ringColorClasses = {
    blue: 'stroke-blue-600',
    green: 'stroke-green-600',
    red: 'stroke-red-600',
    yellow: 'stroke-yellow-600',
    primary: 'stroke-primary-500',
    success: 'stroke-success-500',
    error: 'stroke-error-500',
    warning: 'stroke-warning-500',
  };
  
  const sizeClasses = {
    sm: variant === 'ring' ? 'w-12 h-12' : 'h-1.5',
    md: variant === 'ring' ? 'w-16 h-16' : 'h-2.5',
    lg: variant === 'ring' ? 'w-24 h-24' : 'h-3.5',
  };

  if (variant === 'ring') {
    const radius = size === 'sm' ? 20 : size === 'md' ? 28 : 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clampedProgress / 100) * circumference;

    return (
      <div className={`relative ${sizeClasses[size]} ${className}`}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className={`${ringColorClasses[color]} transition-all duration-300 ease-out`}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold ${
              size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
            } text-gray-700 dark:text-gray-300`}>
              {Math.round(clampedProgress)}%
            </span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-right font-mono">
          {clampedProgress.toFixed(1)}%
        </div>
      )}
    </div>
  );
};

