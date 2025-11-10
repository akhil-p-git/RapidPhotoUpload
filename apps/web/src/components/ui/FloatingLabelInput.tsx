import React, { useState, useRef } from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showPasswordStrength?: boolean;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  error,
  showPasswordStrength = false,
  value,
  type = 'text',
  className = '',
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value && String(value).length > 0;
  const isFloating = isFocused || hasValue;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-error-500' };
    if (strength <= 4) return { strength: 2, label: 'Medium', color: 'bg-warning-500' };
    if (strength <= 5) return { strength: 3, label: 'Strong', color: 'bg-success-500' };
    return { strength: 4, label: 'Very Strong', color: 'bg-success-600' };
  };

  const passwordStrength = showPasswordStrength && type === 'password' && value
    ? getPasswordStrength(String(value))
    : null;

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          className={`peer w-full px-4 pt-6 pb-2 bg-white dark:bg-gray-800 border rounded-xl transition-all duration-200 focus-visible-ring ${
            error
              ? 'border-error-500 focus:border-error-500 focus:ring-error-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
          } ${className}`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        <label
          className={`absolute left-4 transition-all duration-200 pointer-events-none ${
            isFloating
              ? 'top-2 text-xs font-medium text-primary-600 dark:text-primary-400'
              : 'top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400'
          }`}
        >
          {label}
        </label>
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" shapeRendering="geometricPrecision">
              {showPassword ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </>
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Password Strength Indicator */}
      {passwordStrength && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  level <= passwordStrength.strength
                    ? passwordStrength.color
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <p className={`text-xs font-medium ${
            passwordStrength.strength === 1
              ? 'text-error-500'
              : passwordStrength.strength === 2
              ? 'text-warning-500'
              : 'text-success-500'
          }`}>
            {passwordStrength.label}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-error-600 dark:text-error-400 animate-slide-up">
          {error}
        </p>
      )}
    </div>
  );
};

