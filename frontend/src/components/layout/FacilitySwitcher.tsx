'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApiQuery';
import styles from './FacilitySwitcher.module.css';

interface Facility {
  id: string;
  name: string;
  city?: string;
  state?: string;
  status: string;
}

interface FacilitySwitcherProps {
  /** Currently selected facility ID */
  selectedId?: string;
  /** Callback when facility is changed */
  onSelect: (facility: Facility) => void;
}

/**
 * FacilitySwitcher — Dropdown for owners with multiple facilities.
 * Renders in the WMS sidebar header. Fetches owned facilities from the API.
 *
 * If the owner has only one facility, it shows the facility name
 * without the dropdown chevron.
 */
export function FacilitySwitcher({ selectedId, onSelect }: FacilitySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: facilitiesData } = useApiQuery<any>('/facilities', {
    params: { status: 'ACTIVE' },
    transform: (raw: any) => {
      if (Array.isArray(raw)) return raw;
      if (raw?.data && Array.isArray(raw.data)) return raw.data;
      return raw;
    },
  });

  const facilities: Facility[] = Array.isArray(facilitiesData) ? facilitiesData : [];

  const selected = facilities.find((f) => f.id === selectedId) || facilities[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-select first facility if none selected
  useEffect(() => {
    if (facilities.length > 0 && !selectedId) {
      onSelect(facilities[0]);
    }
  }, [facilities, selectedId, onSelect]);

  if (facilities.length === 0) return null;

  // Single facility — no dropdown needed
  if (facilities.length === 1) {
    return (
      <div className={styles.switcher}>
        <div className={styles.trigger} style={{ cursor: 'default' }}>
          <div className={styles.triggerIcon}>
            <Building2 size={14} />
          </div>
          <div className={styles.triggerInfo}>
            <div className={styles.facilityName}>{selected?.name || 'Facility'}</div>
            {selected?.city && <div className={styles.facilityCity}>{selected.city}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.switcher} ref={dropdownRef}>
      <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.triggerIcon}>
          <Building2 size={14} />
        </div>
        <div className={styles.triggerInfo}>
          <div className={styles.facilityName}>{selected?.name || 'Select Facility'}</div>
          {selected?.city && <div className={styles.facilityCity}>{selected.city}</div>}
        </div>
        <ChevronDown size={14} className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {facilities.map((facility) => (
            <button
              key={facility.id}
              className={`${styles.option} ${facility.id === selected?.id ? styles.active : ''}`}
              onClick={() => {
                onSelect(facility);
                setIsOpen(false);
              }}
            >
              <div>
                <div className={styles.optionName}>{facility.name}</div>
                {facility.city && <div className={styles.optionDetail}>{facility.city}, {facility.state}</div>}
              </div>
              {facility.id === selected?.id && (
                <Check size={14} className={styles.checkmark} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
