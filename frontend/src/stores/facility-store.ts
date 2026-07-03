'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { Facility, Chamber, FacilityStats } from '@/types/models';

// ──────────────────────────────────────────────
// Facility Store — Zustand
// ──────────────────────────────────────────────
// Holds the "currently active facility" context for WMS operations.
// Owner users may have multiple facilities; this store tracks which
// one is selected and caches its chambers/stats.

interface FacilityState {
  /** Currently selected facility (for WMS context) */
  facility: Facility | null;
  /** Chambers in the active facility */
  chambers: Chamber[];
  /** Facility utilization stats */
  stats: FacilityStats | null;
  /** Loading states */
  loading: boolean;
  chambersLoading: boolean;
  statsLoading: boolean;

  /** Set the active facility by ID (fetches full details) */
  setActiveFacility: (facilityId: string) => Promise<void>;

  /** Refresh chambers list */
  loadChambers: () => Promise<void>;

  /** Refresh facility stats */
  loadStats: () => Promise<void>;

  /** Clear facility context (e.g., on logout) */
  clear: () => void;
}

export const useFacilityStore = create<FacilityState>((set, get) => ({
  facility: null,
  chambers: [],
  stats: null,
  loading: false,
  chambersLoading: false,
  statsLoading: false,

  setActiveFacility: async (facilityId: string) => {
    set({ loading: true });
    try {
      const res = await api.get<{ success: boolean; data: Facility }>(`/facilities/${facilityId}`);
      if (res.success && res.data) {
        set({ facility: res.data });
        // Load chambers and stats in parallel
        get().loadChambers();
        get().loadStats();
      }
    } catch (err) {
      console.error('[FacilityStore] Failed to load facility', err);
    } finally {
      set({ loading: false });
    }
  },

  loadChambers: async () => {
    const facility = get().facility;
    if (!facility) return;

    set({ chambersLoading: true });
    try {
      const res = await api.get<{ success: boolean; data: Chamber[] }>('/chambers', {
        facilityId: facility.id,
      });
      if (res.success && res.data) {
        set({ chambers: res.data });
      }
    } catch (err) {
      console.error('[FacilityStore] Failed to load chambers', err);
    } finally {
      set({ chambersLoading: false });
    }
  },

  loadStats: async () => {
    const facility = get().facility;
    if (!facility) return;

    set({ statsLoading: true });
    try {
      const res = await api.get<{ success: boolean; data: FacilityStats }>(`/facilities/${facility.id}/stats`);
      if (res.success && res.data) {
        set({ stats: res.data });
      }
    } catch (err) {
      console.error('[FacilityStore] Failed to load stats', err);
    } finally {
      set({ statsLoading: false });
    }
  },

  clear: () => {
    set({ facility: null, chambers: [], stats: null });
  },
}));
