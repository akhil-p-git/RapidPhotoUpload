import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  children,
  onClick,
  fullWidth = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      onClick?.(e);
    }
  };

  const baseStyles = 'relative inline-flex items-center justify-center font-medium uppercase tracking-widest transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'border border-white bg-transparent text-white hover:bg-white hover:text-black focus:ring-white/40',
    secondary: 'border border-white/20 bg-white/5 text-white hover:bg-white/10 focus:ring-white/40',
    danger: 'border border-red-500 bg-transparent text-red-500 hover:bg-red-500 hover:text-white focus:ring-red-500/40',
    ghost: 'border-0 bg-transparent text-white/60 hover:text-white hover:bg-white/10 focus:ring-white/40',
    accent: 'border border-white bg-transparent text-white hover:bg-white hover:text-black focus:ring-white/40',
  };
  
  const sizeStyles = {
    xs: 'px-3 py-1.5 text-xs gap-1.5',
    sm: 'px-4 py-2 text-xs gap-2',
    md: 'px-6 py-3 text-sm gap-2',
    lg: 'px-8 py-4 text-base gap-2.5',
    xl: 'px-10 py-5 text-lg gap-3',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {/* Loading spinner */}
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 absolute"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {/* Button content */}
      <span className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity'}`}>
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </span>
    </button>
  );
};

