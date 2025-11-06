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
  const modalRef = React.useRef<HTMLDivElement>(null);
  
  // Логирование для отладки
  console.log('🔍 Modal component render:', { isOpen, size, className });
  
  // Установка стилей с !important для размера xl
  useEffect(() => {
    if (size === 'xl' && modalRef.current) {
      const element = modalRef.current;
      element.style.setProperty('max-width', '1208px', 'important');
      element.style.setProperty('width', '1208px', 'important');
      element.style.setProperty('min-width', '1208px', 'important');
      console.log('🔍 Modal xl - стили установлены через setProperty с !important');
    }
  }, [size, isOpen]);
  
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

  if (!isOpen) {
    console.log('🔍 Modal: isOpen=false, не рендерим');
    return null;
  }

  console.log('🔍 Modal: isOpen=true, рендерим с size=', size);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-[1208px]', // Увеличено в 2 раза с 604px
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-[576px]' // Уменьшено на 25% от 768px (768 * 0.75 = 576)
  };

  const finalWidthClass = sizeClasses[size];
  
  // Для xl полностью переопределяем классы и используем только inline стили
  let modalContentClasses: string;
  
  if (size === 'xl') {
    // Для xl убираем все классы ширины и используем только базовые стили без w-full и max-w-*
    modalContentClasses = `bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden ${className} relative`;
    console.log('🔍 Modal xl size - классы:', modalContentClasses);
    console.log('🔍 Modal xl size - inline стили будут:', { maxWidth: '1208px', width: '1208px', minWidth: '1208px' });
  } else {
    modalContentClasses = `${styles.modal.content.replace('w-full', '')} ${finalWidthClass} ${className} relative`;
  }
  
  return (
    <div className={styles.modal.overlay} style={size === 'xl' ? { padding: '1rem' } : undefined}>
      <div 
        ref={modalRef}
        className={modalContentClasses}
        style={size === 'xl' ? { 
          maxWidth: '1208px',
          width: '1208px',
          minWidth: '1208px',
          boxSizing: 'border-box',
          margin: '0 auto'
        } : undefined}
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
