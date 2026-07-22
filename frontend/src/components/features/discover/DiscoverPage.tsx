'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, MapPin, Snowflake, ChevronDown, Map, Phone,
  ArrowLeft, SlidersHorizontal, X,
} from 'lucide-react';
import { FacilityCard } from '@/components/features/farmer/FacilityCard';
import styles from './DiscoverPage.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const COMMODITY_OPTIONS = [
  { value: '', label: 'All Cold Storage' },
  { value: 'POTATO', label: 'Potato Cold Storage' },
  { value: 'ONION', label: 'Onion Cold Storage' },
  { value: 'VEGETABLES', label: 'Vegetable Storage' },
  { value: 'FRUITS', label: 'Fruit Cold Storage' },
  { value: 'DAIRY', label: 'Dairy Cold Storage' },
  { value: 'SEEDS', label: 'Seed Storage' },
];

export function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [locationText, setLocationText] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);

  // Request location
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLocationRequested(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const state = data.address?.state || '';
          setLocationText(city && state ? `${city}, ${state}` : state || 'Location detected');
        } catch {
          setLocationText('Location detected');
        }
      },
      () => { setLocationRequested(false); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Fetch facilities
  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCommodity) params.commodity = selectedCommodity;
      if (searchQuery) params.search = searchQuery;
      if (userLat != null && userLng != null) {
        params.lat = String(userLat);
        params.lng = String(userLng);
      }
      const qs = new URLSearchParams(params).toString();
      let apiUrl = API_BASE;
      if (apiUrl && !apiUrl.endsWith('/api/v1')) {
        apiUrl = apiUrl.replace(/\/+$/, '') + '/api/v1';
      }
      const res = await fetch(`${apiUrl}/discover/facilities${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      if (data.success && data.data?.facilities) {
        setFacilities(data.data.facilities);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedCommodity, searchQuery, userLat, userLng]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerBrand}>
          <Snowflake size={15} />
          <span>ColdStorage</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.loginBtn} onClick={() => router.push('/login')}>
            Log in
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Storage Discovery</h1>
          <p className={styles.heroSub}>
            Find certified cold storage facilities near your location.
          </p>

          <div className={styles.searchCard}>
            <div className={styles.searchField}>
              <MapPin size={18} className={styles.fieldIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Enter your location..."
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                readOnly={!!userLat}
                onClick={() => { if (!userLat) requestLocation(); }}
              />
              {!locationRequested && (
                <button className={styles.detectBtn} onClick={requestLocation}>
                  Detect
                </button>
              )}
            </div>

            <div className={styles.divider} />

            <div className={styles.searchField}>
              <Snowflake size={18} className={styles.fieldIcon} />
              <select
                className={styles.selectInput}
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
              >
                {COMMODITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className={styles.selectArrow} />
            </div>

            <button className={styles.searchBtn} onClick={fetchFacilities}>
              <Search size={18} />
              <span>Search</span>
            </button>
          </div>
        </section>

        {/* Results */}
        <section className={styles.results}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Finding facilities near you...</p>
            </div>
          ) : facilities.length === 0 ? (
            <div className={styles.emptyState}>
              <Snowflake size={40} color="#96A19B" />
              <h3>No facilities found</h3>
              <p>Try adjusting your search or explore a different area.</p>
            </div>
          ) : (
            <div className={styles.facilitiesGrid}>
              {facilities.map((f) => (
                <FacilityCard key={f.id} facility={f} />
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className={styles.ctaCard}>
          <h3 className={styles.ctaTitle}>Don&apos;t find what you need?</h3>
          <p className={styles.ctaSub}>
            Our field team can help find off-market cold storage capacity for bulk requirements.
          </p>
          <div className={styles.ctaButtons}>
            <button className={styles.ctaBtnGold}>
              <Map size={18} />
              <span>View on Map</span>
            </button>
            <button className={styles.ctaBtnOutline}>
              <span>Contact Support</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
