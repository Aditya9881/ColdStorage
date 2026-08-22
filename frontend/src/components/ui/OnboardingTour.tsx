'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './Button';
import styles from './OnboardingTour.module.css';

// ── Tour Step Definition ─────────────────────

export interface TourStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Tooltip placement relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  /** Unique key for this tour (used in localStorage to track completion) */
  tourId: string;
  /** Steps to walk the user through */
  steps: TourStep[];
  /** Welcome screen title */
  welcomeTitle?: string;
  /** Welcome screen description */
  welcomeDescription?: string;
  /** Callback when tour completes or is skipped */
  onComplete?: () => void;
}

// ── Helpers ──────────────────────────────────

function getElementRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function getTooltipPosition(
  targetRect: DOMRect,
  placement: string,
  tooltipWidth = 340,
  tooltipHeight = 200,
): { top: number; left: number } {
  const padding = 12;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = targetRect.bottom + padding;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'top':
      top = targetRect.top - tooltipHeight - padding;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + padding;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - padding;
      break;
    default:
      top = targetRect.bottom + padding;
      left = targetRect.left;
  }

  // Clamp within viewport
  left = Math.max(16, Math.min(left, viewportW - tooltipWidth - 16));
  top = Math.max(16, Math.min(top, viewportH - tooltipHeight - 16));

  return { top, left };
}

const STORAGE_PREFIX = 'onboarding_done_';

/**
 * OnboardingTour — Step-by-step interactive walkthrough for new users.
 *
 * Shows a welcome screen, then highlights UI elements one by one with
 * descriptions. Completion is persisted in localStorage so it only
 * shows once per user.
 *
 * Usage:
 *   <OnboardingTour
 *     tourId="wms-dashboard"
 *     steps={[
 *       { target: '#sidebar', title: 'Navigation', description: 'Browse all modules from here' },
 *       ...
 *     ]}
 *   />
 */
export function OnboardingTour({
  tourId,
  steps,
  welcomeTitle = 'Welcome to ColdStorage!',
  welcomeDescription = "Let's take a quick tour to help you get started with your dashboard.",
  onComplete,
}: OnboardingTourProps) {
  const [phase, setPhase] = useState<'hidden' | 'welcome' | 'touring' | 'done'>('hidden');
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if tour was already completed
  useEffect(() => {
    const done = localStorage.getItem(`${STORAGE_PREFIX}${tourId}`);
    if (!done) {
      // Small delay so the DOM is ready
      const timer = setTimeout(() => setPhase('welcome'), 800);
      return () => clearTimeout(timer);
    }
  }, [tourId]);

  // Track target element position
  useEffect(() => {
    if (phase !== 'touring') return;
    const step = steps[currentStep];
    if (!step) return;

    const updateRect = () => {
      const rect = getElementRect(step.target);
      setTargetRect(rect);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [phase, currentStep, steps]);

  const finish = useCallback(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${tourId}`, 'true');
    setPhase('done');
    onComplete?.();
  }, [tourId, onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleStart = () => {
    setCurrentStep(0);
    setPhase('touring');
  };

  // Keyboard navigation
  useEffect(() => {
    if (phase !== 'touring') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, currentStep, finish]);

  if (phase === 'hidden' || phase === 'done') return null;

  const step = steps[currentStep];
  const spotlightPadding = 8;

  return createPortal(
    <>
      {/* Welcome Screen */}
      {phase === 'welcome' && (
        <>
          <div className={styles.overlay} />
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeIcon}>
              <Sparkles size={28} />
            </div>
            <div className={styles.welcomeTitle}>{welcomeTitle}</div>
            <div className={styles.welcomeDesc}>{welcomeDescription}</div>
            <div className={styles.welcomeActions}>
              <Button variant="primary" onClick={handleStart}>
                Start Tour <ChevronRight size={16} />
              </Button>
              <button className={styles.skipBtn} onClick={finish}>
                Skip for now
              </button>
            </div>
          </div>
        </>
      )}

      {/* Touring Phase */}
      {phase === 'touring' && step && (
        <>
          {/* Spotlight on target */}
          {targetRect && (
            <div
              className={styles.spotlight}
              style={{
                top: targetRect.top - spotlightPadding,
                left: targetRect.left - spotlightPadding,
                width: targetRect.width + spotlightPadding * 2,
                height: targetRect.height + spotlightPadding * 2,
              }}
            />
          )}

          {/* Tooltip */}
          <div
            className={styles.tooltip}
            style={
              targetRect
                ? getTooltipPosition(targetRect, step.placement || 'bottom')
                : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            }
          >
            {/* Step dots */}
            <div className={styles.stepIndicator}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`${styles.stepDot} ${i === currentStep ? styles.active : ''} ${i < currentStep ? styles.completed : ''}`}
                />
              ))}
            </div>

            <div className={styles.title}>{step.title}</div>
            <div className={styles.description}>{step.description}</div>

            <div className={styles.actions}>
              <button className={styles.skipBtn} onClick={finish}>
                Skip tour
              </button>
              <div className={styles.navButtons}>
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev}>
                    <ChevronLeft size={14} /> Back
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={handleNext}>
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                  {currentStep < steps.length - 1 && <ChevronRight size={14} />}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>,
    document.body,
  );
}

// ── Predefined Tours ─────────────────────────

export const WMS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Navigation Sidebar',
    description: 'Access all modules from here — Inventory, Bookings, Invoices, Monitoring, and more. Click any item to navigate.',
    placement: 'right',
  },
  {
    target: '[data-tour="dashboard-stats"]',
    title: 'Dashboard Overview',
    description: 'See real-time stats about your facility — total inventory, pending bookings, revenue, and chamber utilization at a glance.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="pending-bookings"]',
    title: 'Pending Bookings',
    description: 'Farmer booking requests appear here. Confirm or reject them to manage incoming inventory.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    description: 'Common tasks like New Intake, Generate Invoice, and Download Reports are one click away.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="monitoring-link"]',
    title: 'Temperature Monitoring',
    description: 'Track real-time temperature and humidity in every chamber. Set up alerts for out-of-range conditions.',
    placement: 'right',
  },
];
