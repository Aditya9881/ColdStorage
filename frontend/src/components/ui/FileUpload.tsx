'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  label?: string;
  required?: boolean;
  accept?: string;
  maxSizeMB?: number;
  file?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  hint?: string;
  compact?: boolean;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  label,
  required,
  accept = 'image/jpeg,image/png',
  maxSizeMB = 5,
  file,
  onChange,
  error,
  hint,
  compact = false,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateFile = useCallback(
    (f: File): string | null => {
      const allowedTypes = accept.split(',').map((t) => t.trim());
      if (!allowedTypes.some((type) => f.type.match(type.replace('*', '.*')))) {
        return `Invalid file type. Accepted: ${allowedTypes.join(', ')}`;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        return `File too large. Maximum: ${maxSizeMB}MB`;
      }
      return null;
    },
    [accept, maxSizeMB]
  );

  const handleFile = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      setLocalError(null);

      // Create preview URL for images
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        setPreviewUrl(url);
      }

      onChange(f);
    },
    [validateFile, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLocalError(null);
    onChange(null);
  };

  const displayError = error || localError;

  return (
    <div className={`${styles.wrapper} ${compact ? styles.compact : ''}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      {file ? (
        <div className={styles.preview}>
          {previewUrl && (
            <div className={styles.previewImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={file.name} />
            </div>
          )}
          <div className={styles.previewInfo}>
            <div className={styles.previewName}>{file.name}</div>
            <div className={styles.previewSize}>{formatFileSize(file.size)}</div>
            <div className={styles.previewStatus}>
              <CheckCircle size={12} /> Ready
            </div>
          </div>
          <button type="button" className={styles.removeBtn} onClick={handleRemove} aria-label="Remove file">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''} ${displayError ? styles.dropZoneError : ''} ${disabled ? styles.dropZoneDisabled : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className={styles.hiddenInput}
            disabled={disabled}
          />
          <div className={styles.uploadIcon}>
            <Upload size={20} />
          </div>
          <div className={styles.uploadText}>
            <p>
              Drag & drop or <span>browse</span>
            </p>
            <p className={styles.uploadHint}>
              {hint || `JPEG, PNG up to ${maxSizeMB}MB`}
            </p>
          </div>
        </div>
      )}

      {displayError && (
        <p className={styles.error}>
          <AlertCircle size={12} /> {displayError}
        </p>
      )}
    </div>
  );
}
