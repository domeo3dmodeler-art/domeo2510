// components/ui/Input.tsx
// Унифицированные поля ввода в стиле Domeo

import React, { useId } from 'react';
import { createComponentStyles } from '../../lib/design/tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'base' | 'error';
}

export function Input({ 
  label, 
  error, 
  helperText, 
  variant = 'base',
  className = '',
  id,
  ...props 
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const styles = createComponentStyles();
  
  const inputClasses = error ? styles.input.error : styles.input.base;
  
  return (
    <div className={styles.form.field}>
      {label && (
        <label 
          htmlFor={inputId}
          className={styles.input.label}
        >
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={`${inputClasses} ${className}`}
        {...props}
      />
      
      {error && (
        <p className={styles.input.errorText}>{error}</p>
      )}
      
      {helperText && !error && (
        <p className={styles.input.helper}>{helperText}</p>
      )}
    </div>
  );
}

// Экспорт для удобства
export default Input;
