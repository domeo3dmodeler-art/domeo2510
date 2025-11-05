'use client';

// components/ui/Modal.tsx
// Унифицированные модальные окна в стиле Domeo

import React, { useEffect } from 'react';
import { createComponentStyles } from '../../lib/design/tokens';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md',
  className = ''
}: ModalProps) {
  const styles = createComponentStyles();
  
  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-[1208px]', // Увеличено в 2 раза с 604px
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-[576px]' // Уменьшено на 25% от 768px (768 * 0.75 = 576)
  };

  const finalWidthClass = sizeClasses[size];
  
  return (
    <div className={styles.modal.overlay}>
      <div 
        className={`${styles.modal.content.replace('w-full', '')} ${finalWidthClass} ${className} relative`}
        style={size === 'xl' ? { maxWidth: '1208px', width: '90%', minWidth: '1208px' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия - всегда показываем */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 hover:bg-gray-100 rounded-full transition-colors bg-white shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        {title && (
          <div className={styles.modal.header}>
            <h3 className="text-lg font-semibold text-black">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className={styles.modal.body}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={styles.modal.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Экспорт для удобства
export default Modal;
