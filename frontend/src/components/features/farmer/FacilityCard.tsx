'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Star, MapPin, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import styles from './FacilityCard.module.css';

interface FacilityCardProps {
  facility: {
    id: string;
    name: string;
    imageUrl?: string | null;
    city: string;
    state: string;
    district: string;
    status: string;
    storageType: string;
    totalCapacityMt?: number;
    totalCapacity?: number;
    availableCapacity?: number;
    utilizationPercent?: number;
    avgRating?: number | null;
    reviewCount?: number;
    distanceKm?: number | null;
    chambers?: Array<{
      commodityCategory: string | null;
    }>;
    pricing?: Array<{
      commodityCategory: string;
      pricingModel: string;
      rateAmount: number;
      rateCurrency: string;
    }>;
  };
  onBook?: (facilityId: string) => void;
}

function getCapacityStatus(available: number, total: number) {
  const pct = total > 0 ? (available / total) * 100 : 0;
  if (pct <= 5) return { label: `Selling out fast • Only ${Math.round(available)} MT left`, color: '#D45B4E', barColor: '#D45B4E' };
  if (pct <= 30) return { label: `Limited availability`, color: '#B7791F', barColor: '#D29424' };
  return { label: `High capacity available`, color: '#0D7A62', barColor: '#17A56D' };
}

function getCommodityLabels(chambers: Array<{ commodityCategory: string | null }>) {
  const cats = [...new Set(chambers.map(c => c.commodityCategory).filter(Boolean))];
  const labelMap: Record<string, string> = {
    POTATO: 'Potato', ONION: 'Onion', VEGETABLES: 'Vegetables', FRUITS: 'Fruits',
    DAIRY: 'Dairy', FROZEN_SEAFOOD: 'Seafood', FROZEN_MEAT: 'Meat',
    PROCESSED_FOOD: 'Processed', SEEDS: 'Seeds', OTHER: 'Other',
  };
  return cats.map(c => labelMap[c!] || c).join(', ');
}

function getLowestPrice(pricing: FacilityCardProps['facility']['pricing']) {
  if (!pricing || pricing.length === 0) return null;
  const sorted = [...pricing].sort((a, b) => Number(a.rateAmount) - Number(b.rateAmount));
  const lowest = sorted[0];
  const modelLabel: Record<string, string> = {
    PER_DAY_PER_MT: '/MT/day', PER_MONTH_PER_MT: '/MT/mo',
    PER_SEASON: '/season', FLAT_RATE: ' flat',
  };
  return {
    amount: Math.round(Number(lowest.rateAmount)),
    unit: modelLabel[lowest.pricingModel] || '/MT',
  };
}

export function FacilityCard({ facility, onBook }: FacilityCardProps) {
  const router = useRouter();
  const totalCap = facility.totalCapacity ?? Number(facility.totalCapacityMt || 0);
  const available = facility.availableCapacity ?? totalCap;
  const occupied = totalCap - available;
  const utilPct = totalCap > 0 ? Math.round((occupied / totalCap) * 100) : 0;
  const capStatus = getCapacityStatus(available, totalCap);
  const commodityLabel = facility.chambers ? getCommodityLabels(facility.chambers) : '';
  const price = getLowestPrice(facility.pricing);
  const isVerified = facility.status === 'ACTIVE';

  const handleViewDetails = () => {
    router.push(`/discover/${facility.id}`);
  };

  const handleBook = () => {
    if (onBook) {
      onBook(facility.id);
    } else {
      router.push(`/farmer/book?facility=${facility.id}`);
    }
  };

  return (
    <article className={styles.card}>
      {/* Image */}
      <div className={styles.imageWrap}>
        <img
          src={facility.imageUrl || '/images/facilities/pk-cold-storage.png'}
          alt={facility.name}
          className={styles.image}
          loading="lazy"
        />
        {isVerified && (
          <div className={styles.verifiedBadge}>
            <CheckCircle size={14} />
            <span>Verified</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Name & Rating */}
        <div className={styles.nameRow}>
          <h3 className={styles.name}>{facility.name}</h3>
          {facility.avgRating != null && (
            <div className={styles.rating}>
              <Star size={14} fill="#D29424" stroke="#D29424" />
              <span>{facility.avgRating}</span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className={styles.location}>
          <MapPin size={13} />
          <span>
            {facility.city}, {facility.state}
            {facility.distanceKm != null && ` • ${facility.distanceKm} km away`}
          </span>
        </div>

        {/* Capacity */}
        <div className={styles.capacitySection}>
          <div className={styles.capacityHeader}>
            <span className={styles.capacityLabel}>Space Available</span>
            <span className={styles.capacityValue}>
              {available.toLocaleString('en-IN')} / {totalCap.toLocaleString('en-IN')} MT
            </span>
          </div>
          <div className={styles.capacityBarTrack}>
            <div
              className={styles.capacityBarFill}
              style={{
                width: `${utilPct}%`,
                backgroundColor: capStatus.barColor,
              }}
            />
          </div>
          <div className={styles.capacityStatus} style={{ color: capStatus.color }}>
            {utilPct > 95 ? (
              <AlertTriangle size={12} />
            ) : utilPct > 70 ? (
              <Info size={12} />
            ) : (
              <CheckCircle size={12} />
            )}
            <span>{capStatus.label}</span>
          </div>
        </div>

        {/* Commodity tags */}
        {commodityLabel && (
          <div className={styles.commodityRow}>
            <Info size={12} />
            <span>Ideal for {commodityLabel}</span>
          </div>
        )}

        {/* Price & CTA */}
        <div className={styles.priceRow}>
          <div className={styles.priceInfo}>
            <span className={styles.priceLabel}>Starting from</span>
            <div className={styles.priceAmount}>
              <span className={styles.rupee}>₹</span>
              <span className={styles.priceValue}>{price ? price.amount : '—'}</span>
              <span className={styles.priceUnit}>{price ? price.unit : ''}</span>
            </div>
          </div>
          <button className={styles.bookBtn} onClick={handleBook}>
            Book storage
          </button>
        </div>
      </div>
    </article>
  );
}
