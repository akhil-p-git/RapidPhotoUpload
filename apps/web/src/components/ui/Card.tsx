import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '',
  glass = false,
  hover = false,
}) => {
  const baseStyles = glass
    ? 'glass rounded-xl shadow-glass'
    : 'bg-white dark:bg-gray-800 rounded-xl shadow-layered border border-gray-200/50 dark:border-gray-700/50';
  
  const hoverStyles = hover
    ? 'hover-lift cursor-pointer'
    : '';

  return (
    <div
      className={`${baseStyles} ${hoverStyles} transition-all duration-150 ease-out ${className}`}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 ${className}`}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 ${className}`}>
      {children}
    </div>
  );
};

