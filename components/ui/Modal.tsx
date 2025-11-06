'use client';

// components/ui/Modal.tsx
// Унифицированные модальные окна в стиле Domeo

import React, { useEffect, useRef } from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Логирование для отладки
  console.log('🔍 Modal component render:', { isOpen, size, className });
  
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

  // Установка стилей ширины для размера xl напрямую в DOM
  useEffect(() => {
    if (isOpen && size === 'xl' && modalRef.current) {
      const element = modalRef.current;
      // Устанавливаем стили с !important
      element.style.setProperty('max-width', '1208px', 'important');
      element.style.setProperty('width', '1208px', 'important');
      element.style.setProperty('min-width', '1208px', 'important');
      console.log('🔍 Modal xl - стили установлены через setProperty с !important');
    }
  }, [isOpen, size]);

  if (!isOpen) {
    console.log('🔍 Modal: isOpen=false, не рендерим');
    return null;
  }

  console.log('🔍 Modal: isOpen=true, рендерим с size=', size);

  // Определяем размеры для разных типов модальных окон
  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { maxWidth: '384px', width: '100%' };
      case 'md':
        return { maxWidth: '448px', width: '100%' };
      case 'lg':
        return { maxWidth: '512px', width: '100%' };
      case 'xl':
        // Для xl используем фиксированную ширину без max-width ограничений
        return { 
          maxWidth: '1208px', 
          width: '1208px', 
          minWidth: '1208px',
          boxSizing: 'border-box'
        };
      case '2xl':
        return { maxWidth: '672px', width: '100%' };
      case '3xl':
        return { maxWidth: '576px', width: '100%' };
      default:
        return { maxWidth: '448px', width: '100%' };
    }
  };

  // Базовые классы без ограничений ширины для xl
  const baseClasses = 'bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden relative';
  
  // Для xl полностью убираем классы ширины из Tailwind
  const modalClasses = size === 'xl' 
    ? `${baseClasses} ${className}`
    : `${baseClasses} ${styles.modal.content.replace('w-full', '')} ${className}`;

  return (
    <div 
      className={styles.modal.overlay} 
      onClick={onClose}
      style={size === 'xl' ? { padding: '1rem' } : undefined}
    >
      <div 
        ref={modalRef}
        className={modalClasses}
        style={{
          ...getSizeStyles(),
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия - всегда показываем */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 hover:bg-gray-100 rounded-full transition-colors bg-white shadow-sm"
          aria-label="Закрыть"
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
