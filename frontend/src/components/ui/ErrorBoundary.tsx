'use client';

import React, { Component } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: React.ReactNode;
  /** Optional fallback component. If not provided, a default error UI is shown. */
  fallback?: React.ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.iconWrap}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className={styles.title}>Something went wrong</h2>
            <p className={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div className={styles.actions}>
              <button className={styles.retryBtn} onClick={this.handleReset}>
                Try Again
              </button>
              <button
                className={styles.homeBtn}
                onClick={() => {
                  this.handleReset();
                  window.location.href = '/';
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
