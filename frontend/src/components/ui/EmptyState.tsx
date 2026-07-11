'use client';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

// Default empty state icons by context
function DefaultIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.defaultIcon}
    >
      <rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
      <path d="M24 32h16M32 24v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      <div className={styles.iconWrapper}>
        {icon || <DefaultIcon />}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <button className={styles.actionButton} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
