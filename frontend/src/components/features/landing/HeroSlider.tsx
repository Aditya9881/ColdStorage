'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './HeroSlider.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  image: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    image: '/images/hero/cold-storage.png',
    title: 'From Farm Gate to Cold Storage — Book in Minutes',
    subtitle:
      'ColdStorage connects farmers, sellers, and buyers directly with verified cold storage warehouses nearby — live capacity, transparent rates, and doorstep pickup.',
  },
  {
    image: '/images/hero/farm-harvest.png',
    title: 'Store Your Harvest Safely, Sell When Prices Rise',
    subtitle:
      'Avoid distress selling right after harvest. Reserve space at a nearby cold store in minutes and secure the value of your produce.',
  },
  {
    image: '/images/hero/fresh-produce.png',
    title: 'Real-Time Temperature Monitoring, Zero Spoilage',
    subtitle:
      'IoT-powered chambers with live telemetry ensure your produce stays at the perfect temperature throughout the entire storage lifecycle.',
  },
];

const AUTO_ADVANCE_MS = 6000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setCurrent((index + SLIDES.length) % SLIDES.length);
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  return (
    <div
      className={styles.slider}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div className={styles.slidesTrack}>
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`${styles.slide} ${i === current ? styles.slideActive : ''}`}
          >
            <div
              className={styles.slideImage}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className={styles.slideOverlay} />
            <div className={styles.slideContent}>
              <h2 className={styles.slideTitle}>{slide.title}</h2>
              <p className={styles.slideSubtitle}>{slide.subtitle}</p>
              <div className={styles.slideCtas}>
                <a href="/register" className={styles.ctaPrimary}>
                  Register Now
                </a>
                <a href="#find-storage" className={styles.ctaSecondary}>
                  Find Nearby Cold Storage
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev} aria-label="Previous slide">
        <ChevronLeft size={22} />
      </button>
      <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={next} aria-label="Next slide">
        <ChevronRight size={22} />
      </button>

      {/* Dots */}
      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
