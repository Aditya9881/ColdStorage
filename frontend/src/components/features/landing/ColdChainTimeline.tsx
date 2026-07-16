'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Truck, Warehouse, ShoppingCart, Sprout } from 'lucide-react';
import styles from './ColdChainTimeline.module.css';

const STEPS = [
  { icon: Sprout, label: 'Farm Harvest', color: '#10b981' },
  { icon: Truck, label: 'Refrigerated Transit', color: '#3b82f6' },
  { icon: Warehouse, label: 'Smart Cold Store', color: '#0b1d36' },
  { icon: ShoppingCart, label: 'Buyer Marketplace', color: '#e8720c' },
];

export function ColdChainTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Scroll-triggered visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Auto-advance steps
  useEffect(() => {
    if (!isVisible) return;
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [isVisible]);

  return (
    <div ref={ref} className={`${styles.timeline} ${isVisible ? styles.visible : ''}`}>
      {/* Steps */}
      <div className={styles.steps}>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= activeStep;
          return (
            <React.Fragment key={step.label}>
              <div
                className={`${styles.step} ${isActive ? styles.stepActive : ''}`}
                onClick={() => setActiveStep(i)}
              >
                <div
                  className={styles.stepCircle}
                  style={{
                    borderColor: isActive ? step.color : undefined,
                    background: isActive ? `${step.color}15` : undefined,
                  }}
                >
                  <Icon
                    size={22}
                    style={{ color: isActive ? step.color : undefined }}
                  />
                </div>
                <span
                  className={styles.stepLabel}
                  style={{ color: isActive ? step.color : undefined }}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`${styles.connector} ${i < activeStep ? styles.connectorActive : ''}`}>
                  <div className={styles.connectorFill} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Temperature indicator */}
      <div className={styles.tempSection}>
        <div className={styles.tempValue}>2°C</div>
        <div className={styles.tempBadge}>Preservation Secured</div>
      </div>
    </div>
  );
}
