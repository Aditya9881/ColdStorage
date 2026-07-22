'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, Layers, Wallet, Search, MapPin,
  ChevronDown, Snowflake, Map, Phone, CalendarCheck,
  ChevronRight, CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { FarmerHeader } from './FarmerHeader';
import { FacilityCard } from './FacilityCard';
import styles from './FarmerHomePage.module.css';

const COMMODITY_OPTIONS = [
  { value: '', label: 'All Cold Storage' },
  { value: 'POTATO', label: 'Potato Cold Storage' },
  { value: 'ONION', label: 'Onion Cold Storage' },
  { value: 'VEGETABLES', label: 'Vegetable Storage' },
  { value: 'FRUITS', label: 'Fruit Cold Storage' },
  { value: 'DAIRY', label: 'Dairy Cold Storage' },
  { value: 'SEEDS', label: 'Seed Storage' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

interface DashboardData {
  totalLots: number;
  storedWeight: number;
  totalRent: number;
  activeLots: number;
}

interface BookingData {
  id: string;
  bookingNumber: string;
  status: string;
  commodityName?: string;
  estimatedWeightKg?: number;
  facility?: { id: string; name: string; city?: string };
  createdAt: string;
}

export function FarmerHomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Dashboard data
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  // Discovery state
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [locationText, setLocationText] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const animRef = useRef<HTMLDivElement>(null);

  // ── Fetch dashboard data ──
  const fetchDashboard = useCallback(async () => {
    try {
      const [lotsRes, bookingsRes] = await Promise.all([
        api.get<any>('/inventory/my-lots?limit=100').catch(() => ({ success: false, data: null })),
        api.get<any>('/bookings/my?limit=5').catch(() => ({ success: false, data: null })),
      ]);

      if (lotsRes.success && lotsRes.data?.lots) {
        const lots = lotsRes.data.lots;
        const activeLots = lots.filter(
          (lot: any) => lot.status === 'STORED' || lot.status === 'PARTIALLY_RELEASED'
        );
        setDashData({
          totalLots: lots.length,
          storedWeight: lots.reduce((sum: number, lot: any) => sum + Number(lot.currentWeightKg || 0), 0),
          totalRent: lots.reduce((sum: number, lot: any) => sum + Number(lot.estimatedRent || 0), 0),
          activeLots: activeLots.length,
        });
      } else {
        setDashData({ totalLots: 0, storedWeight: 0, totalRent: 0, activeLots: 0 });
      }

      if (bookingsRes.success && bookingsRes.data?.bookings) {
        setBookings(bookingsRes.data.bookings);
      }
    } catch {
      setDashData({ totalLots: 0, storedWeight: 0, totalRent: 0, activeLots: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Request location ──
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLocationRequested(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        // Reverse geocode using a simple approach
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
      () => {
        setLocationText('');
        setLocationRequested(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // ── Fetch facilities ──
  const fetchFacilities = useCallback(async () => {
    setFacilitiesLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCommodity) params.commodity = selectedCommodity;
      if (searchQuery) params.search = searchQuery;
      if (userLat != null && userLng != null) {
        params.lat = String(userLat);
        params.lng = String(userLng);
      }
      const qs = new URLSearchParams(params).toString();
      const res = await api.get<any>(`/discover/facilities${qs ? `?${qs}` : ''}`);
      if (res.success && res.data?.facilities) {
        setFacilities(res.data.facilities);
      }
    } catch {
      // Silently fail
    } finally {
      setFacilitiesLoading(false);
    }
  }, [selectedCommodity, searchQuery, userLat, userLng]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const handleSearch = () => {
    fetchFacilities();
  };

  const storedMT = ((dashData?.storedWeight || 0) / 1000).toFixed(1);
  const rentFormatted = (dashData?.totalRent || 0) >= 100000
    ? `₹${((dashData?.totalRent || 0) / 100000).toFixed(2)}L`
    : `₹${(dashData?.totalRent || 0).toLocaleString('en-IN')}`;

  const firstName = user?.fullName?.split(' ')[0] || 'Farmer';

  return (
    <div className={styles.page}>
      <FarmerHeader />

      <main className={styles.main}>
        {/* ── Greeting ── */}
        <section className={styles.greetingSection}>
          <p className={styles.greeting}>{getGreeting()},</p>
          <h1 className={styles.userName}>{firstName}</h1>
          <p className={styles.greetingSub}>Your storage summary for today.</p>
        </section>

        {/* ── Live Status Cards ── */}
        <section className={styles.statusCards}>
          <div className={styles.statusCard}>
            <div className={styles.statusIconWrap}>
              <Package size={22} strokeWidth={1.8} />
            </div>
            <div className={styles.statusBadge}>LIVE STATUS</div>
            <p className={styles.statusLabel}>CURRENT LOTS</p>
            <div className={styles.statusValueRow}>
              <span className={styles.statusValue}>
                {loading ? '—' : dashData?.activeLots || 0}
              </span>
              <span className={styles.statusUnit}>Active Units</span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusIconWrap}>
              <Layers size={22} strokeWidth={1.8} />
            </div>
            <div className={styles.statusBadge}>CAPACITY</div>
            <p className={styles.statusLabel}>STORED WEIGHT</p>
            <div className={styles.statusValueRow}>
              <span className={styles.statusValue}>
                {loading ? '—' : storedMT}
              </span>
              <span className={styles.statusUnit}>MT</span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusIconWrap}>
              <Wallet size={22} strokeWidth={1.8} />
            </div>
            <div className={styles.statusBadge}>FINANCIALS</div>
            <p className={styles.statusLabel}>ACCRUED RENT</p>
            <div className={styles.statusValueRow}>
              <span className={styles.statusValue}>
                {loading ? '—' : rentFormatted}
              </span>
            </div>
          </div>
        </section>

        {/* ── Active Bookings ── */}
        {bookings.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>UPCOMING ACTIVITY</span>
                <div className={styles.sectionTitleRow}>
                  <span className={styles.liveDot} />
                  <h2 className={styles.sectionTitle}>My Bookings</h2>
                </div>
              </div>
              <button className={styles.seeAllBtn} onClick={() => router.push('/farmer/bookings')}>
                See all <ChevronRight size={14} />
              </button>
            </div>

            <div className={styles.bookingsScroll}>
              {bookings.slice(0, 3).map((booking) => (
                <button
                  key={booking.id}
                  className={styles.bookingCard}
                  onClick={() => router.push(`/farmer/booking/${booking.id}`)}
                >
                  <div className={styles.bookingTop}>
                    <div className={styles.bookingIcon}>
                      <CalendarCheck size={18} />
                    </div>
                    <div className={styles.bookingInfo}>
                      <span className={styles.bookingNumber}>#{booking.bookingNumber}</span>
                      <span className={styles.bookingCommodity}>
                        {booking.commodityName || 'Storage booking'}
                      </span>
                    </div>
                    <span className={`${styles.bookingStatus} ${styles[`status_${booking.status}`] || ''}`}>
                      {booking.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className={styles.bookingBottom}>
                    <span className={styles.bookingMeta}>
                      {booking.facility?.name || 'Facility pending'}
                    </span>
                    <ChevronRight size={15} color="#96A19B" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Storage Discovery ── */}
        <section className={styles.discoverySection}>
          <h2 className={styles.discoveryTitle}>Storage Discovery</h2>
          <p className={styles.discoverySub}>
            Find certified cold storage facilities near your location.
          </p>

          <div className={styles.searchCard}>
            <div className={styles.searchField}>
              <MapPin size={18} className={styles.searchFieldIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Enter your location..."
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                readOnly={!!userLat}
                onClick={() => {
                  if (!userLat) requestLocation();
                }}
              />
              {!locationRequested && (
                <button className={styles.locationBtn} onClick={requestLocation}>
                  Detect
                </button>
              )}
            </div>

            <div className={styles.searchDivider} />

            <div className={styles.searchField}>
              <Snowflake size={18} className={styles.searchFieldIcon} />
              <select
                className={styles.searchSelect}
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
              >
                {COMMODITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className={styles.selectArrow} />
            </div>

            <button className={styles.searchBtn} onClick={handleSearch}>
              <Search size={18} />
              <span>Search</span>
            </button>
          </div>

          {/* ── Facility Cards ── */}
          <div className={styles.facilitiesList} ref={animRef}>
            {facilitiesLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Finding nearby facilities...</p>
              </div>
            ) : facilities.length === 0 ? (
              <div className={styles.emptyState}>
                <Snowflake size={36} color="#96A19B" />
                <p>No facilities found. Try adjusting your search.</p>
              </div>
            ) : (
              facilities.map((facility) => (
                <FacilityCard key={facility.id} facility={facility} />
              ))
            )}
          </div>

          {/* ── Don't find what you need? ── */}
          <div className={styles.ctaCard}>
            <h3 className={styles.ctaTitle}>Don&apos;t find what you need?</h3>
            <p className={styles.ctaSub}>
              Our field team can help find off-market cold storage capacity for bulk requirements.
            </p>
            <div className={styles.ctaButtons}>
              <button
                className={styles.ctaBtnGold}
                onClick={() => router.push('/discover?view=map')}
              >
                <Map size={18} />
                <span>View on Map</span>
              </button>
              <button
                className={styles.ctaBtnOutline}
                onClick={() => window.open('tel:+911234567890')}
              >
                <span>Contact Support</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
