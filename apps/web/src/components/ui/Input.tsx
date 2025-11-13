import React, { useState, useRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  value,
  type = 'text',
  className = '',
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

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

  return (
    <>
      <style>{`
        .input-wrapper { position: relative; }
        .input-field { width: 100%; padding: 13px 16px 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem; color: #111827; transition: all 0.2s; }
        .input-field:focus { outline: none; border-color: #111827; background: white; }
        .input-label { position: absolute; left: 16px; transition: all 0.2s; pointer-events: none; color: #6b7280; }
        .input-label-floating { top: 4px; font-size: 0.75rem; }
        .input-label-normal { top: 14px; font-size: 0.875rem; }
        .input-error { margin-top: 4px; font-size: 0.75rem; color: #ef4444; }
      `}</style>
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`input-field ${className}`}
          placeholder=" "
          {...props}
        />
        <label
          htmlFor={props.id}
          className={`input-label ${isFloating ? 'input-label-floating' : 'input-label-normal'}`}
          onClick={() => inputRef.current?.focus()}
        >
          {label}
        </label>
        {error && (
          <p className="input-error">{error}</p>
        )}
      </div>
    </>
  );
});

Input.displayName = 'Input';
