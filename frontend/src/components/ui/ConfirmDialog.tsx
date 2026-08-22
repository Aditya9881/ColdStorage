'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  /** Text for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Text for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Visual variant of the confirm button. Defaults to "danger". */
  variant?: 'danger' | 'primary' | 'accent';
  /** Whether the confirm action is in progress. */
  loading?: boolean;
  /** Icon shown in the dialog. Defaults to AlertTriangle for danger variant. */
  icon?: React.ReactNode;
}

/**
 * Standardized confirmation dialog.
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showDelete}
 *     onClose={() => setShowDelete(false)}
 *     onConfirm={handleDelete}
 *     title="Delete Lot"
 *     message="Are you sure you want to delete this lot? This action cannot be undone."
 *     confirmLabel="Delete"
 *     loading={deleting}
 *   />
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const defaultIcon = variant === 'danger'
    ? <AlertTriangle size={24} />
    : null;

  const displayIcon = icon ?? defaultIcon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className={styles.content}>
        {displayIcon && (
          <div className={`${styles.iconWrap} ${styles[`icon-${variant}`]}`}>
            {displayIcon}
          </div>
        )}
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
