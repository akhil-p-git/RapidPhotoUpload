import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const maxWidthMap = {
    sm: '448px',
    md: '512px',
    lg: '576px',
    xl: '640px',
  };

  return (
    <>
      <style>{`
        .modal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
        .modal-container { position: relative; width: 100%; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }
        .modal-close { position: absolute; top: 16px; right: 16px; z-index: 10; padding: 8px; color: #9ca3af; border: none; background: none; cursor: pointer; transition: color 0.2s; }
        .modal-close:hover { color: #4b5563; }
        .modal-content { padding: 32px; }
      `}</style>
      <div
        ref={overlayRef}
        className="modal-overlay"
        onClick={handleOverlayClick}
      >
        <div className="modal-backdrop" />
        <div
          ref={modalRef}
          className="modal-container"
          style={{ maxWidth: maxWidthMap[maxWidth] }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close modal"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="modal-content">
            {title && (
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
                {title}
              </h2>
            )}
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
