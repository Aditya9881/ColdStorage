'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './StatsCounter.module.css';

interface StatItem {
  value: number;
  suffix?: string;
  label: string;
}

interface StatsCounterProps {
  stats: StatItem[];
}

function AnimatedNumber({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [started, target, duration]);

  return (
    <span ref={ref} className={styles.number}>
      {count.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

export function StatsCounter({ stats }: StatsCounterProps) {
  return (
    <div className={styles.grid}>
      {stats.map((stat, i) => (
        <div key={i} className={styles.card}>
          <AnimatedNumber target={stat.value} suffix={stat.suffix} />
          <span className={styles.label}>{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
