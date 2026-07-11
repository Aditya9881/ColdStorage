'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  showCharCount?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      resize = 'vertical',
      showCharCount = false,
      className = '',
      id,
      maxLength,
      value,
      ...rest
    },
    ref
  ) => {
    const textAreaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
        {label && (
          <label htmlFor={textAreaId} className={styles.label}>
            {label}
            {rest.required && <span className={styles.required}>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textAreaId}
          className={`${styles.textarea} ${error ? styles.error : ''}`}
          style={{ resize }}
          maxLength={maxLength}
          value={value}
          {...rest}
        />
        <div className={styles.footer}>
          {(error || helperText) && (
            <span className={error ? styles.errorText : styles.helperText}>
              {error || helperText}
            </span>
          )}
          {showCharCount && maxLength && (
            <span className={`${styles.charCount} ${charCount >= maxLength ? styles.charCountMax : ''}`}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
export default TextArea;
