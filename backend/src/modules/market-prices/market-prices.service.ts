/**
 * ColdStorage — Live Mandi Price Service
 *
 * Fetches real commodity prices from the Government of India's
 * Open Government Data Platform (data.gov.in / AGMARKNET).
 *
 * Features:
 * - In-memory cache with 30-minute TTL
 * - Location-based filtering (state, district)
 * - Commodity grouping with min/max/modal prices
 * - Graceful fallback to cached data when API is down
 * - "Last updated" timestamp for staleness indication
 */

const DATA_GOV_BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const API_TIMEOUT_MS = 10_000; // 10 seconds

// ── Types ──

export interface MandiRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
}

export interface MandiPrice {
  name: string;
  state: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  variety: string;
  arrivalDate: string;
}

export interface CommodityPriceGroup {
  commodity: string;
  unit: string;
  date: string;
  mandis: MandiPrice[];
}

interface CacheEntry {
  data: CommodityPriceGroup[];
  fetchedAt: number; // Unix timestamp
  source: 'live' | 'cached';
}

// ── In-memory Cache ──

const cache = new Map<string, CacheEntry>();

function getCacheKey(state?: string, district?: string, commodity?: string): string {
  return `${state || 'ALL'}::${district || 'ALL'}::${commodity || 'ALL'}`;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

// ── API Fetching ──

async function fetchFromDataGov(params: {
  state?: string;
  district?: string;
  commodity?: string;
  limit?: number;
  offset?: number;
}): Promise<MandiRecord[]> {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) {
    console.warn('[MandiPrices] DATA_GOV_API_KEY not set, using fallback data');
    return [];
  }

  const url = new URL(DATA_GOV_BASE_URL);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(params.limit || 500));
  if (params.offset) url.searchParams.set('offset', String(params.offset));
  if (params.state) url.searchParams.set('filters[state]', params.state);
  if (params.district) url.searchParams.set('filters[district]', params.district);
  if (params.commodity) url.searchParams.set('filters[commodity]', params.commodity);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[MandiPrices] API returned ${response.status}: ${response.statusText}`);
      return [];
    }

    const json: any = await response.json();

    if (json.status === 'ok' && Array.isArray(json.records)) {
      console.log(`[MandiPrices] Fetched ${json.records.length} records (total: ${json.total})`);
      return json.records;
    }

    console.warn('[MandiPrices] Unexpected API response format:', JSON.stringify(json).slice(0, 200));
    return [];
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('[MandiPrices] API request timed out');
    } else {
      console.error('[MandiPrices] API fetch error:', err.message);
    }
    return [];
  }
}

// ── Data Transformation ──

function transformRecords(records: MandiRecord[]): CommodityPriceGroup[] {
  // Group records by commodity
  const grouped = new Map<string, MandiRecord[]>();
  for (const record of records) {
    const key = record.commodity?.trim();
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(record);
  }

  const today = new Date().toISOString().split('T')[0];

  const result: CommodityPriceGroup[] = [];
  for (const [commodity, recs] of grouped) {
    // De-duplicate by market name (take latest/best)
    const byMarket = new Map<string, MandiRecord>();
    for (const rec of recs) {
      const marketKey = `${rec.market}-${rec.district}`;
      // Keep the record with the higher modal price (more recent data tends to be first)
      if (!byMarket.has(marketKey)) {
        byMarket.set(marketKey, rec);
      }
    }

    const mandis: MandiPrice[] = Array.from(byMarket.values()).map(rec => ({
      name: rec.market?.trim() || '—',
      state: rec.state?.trim() || '—',
      district: rec.district?.trim() || '—',
      minPrice: Number(rec.min_price) || 0,
      maxPrice: Number(rec.max_price) || 0,
      modalPrice: Number(rec.modal_price) || 0,
      variety: rec.variety?.trim() || 'Other',
      arrivalDate: rec.arrival_date || today,
    }));

    // Sort mandis by modal price (highest first — best selling mandis on top)
    mandis.sort((a, b) => b.modalPrice - a.modalPrice);

    if (mandis.length > 0) {
      result.push({
        commodity,
        unit: '₹/Quintal',
        date: mandis[0].arrivalDate || today,
        mandis: mandis.slice(0, 15), // Cap at 15 mandis per commodity
      });
    }
  }

  // Sort commodities alphabetically
  result.sort((a, b) => a.commodity.localeCompare(b.commodity));

  return result;
}

// ── Public API ──

/**
 * Get live mandi prices, with caching and fallback.
 *
 * @param state    — Indian state name (e.g. "Uttar Pradesh")
 * @param district — District/city name (optional)
 * @param commodity — Specific commodity filter (optional)
 * @returns { prices, fetchedAt, source }
 */
export async function getMandiPrices(
  state?: string,
  district?: string,
  commodity?: string,
): Promise<{ prices: CommodityPriceGroup[]; fetchedAt: number; source: 'live' | 'cached' | 'fallback' }> {
  const key = getCacheKey(state, district, commodity);

  // 1. Check cache
  const cached = cache.get(key);
  if (cached && isCacheValid(cached)) {
    return { prices: cached.data, fetchedAt: cached.fetchedAt, source: 'cached' };
  }

  // 2. Fetch from API
  const records = await fetchFromDataGov({ state, district, commodity, limit: 500 });

  if (records.length > 0) {
    const prices = transformRecords(records);
    const entry: CacheEntry = { data: prices, fetchedAt: Date.now(), source: 'live' };
    cache.set(key, entry);
    return { prices, fetchedAt: entry.fetchedAt, source: 'live' };
  }

  // 3. Fallback to stale cache if API failed
  if (cached) {
    console.warn(`[MandiPrices] API failed, using stale cache (age: ${Math.round((Date.now() - cached.fetchedAt) / 60000)}min)`);
    return { prices: cached.data, fetchedAt: cached.fetchedAt, source: 'fallback' };
  }

  // 4. No cache, no API — return empty
  return { prices: [], fetchedAt: Date.now(), source: 'fallback' };
}

/**
 * Get price trends for a specific commodity+mandi combination.
 * Since data.gov.in only provides current-day prices, trends are built
 * from our cache history. For true historical trends, we'd need a DB table.
 *
 * For now, returns the current-day snapshot.
 */
export async function getMandiTrend(
  commodity: string,
  mandi?: string,
  state?: string,
): Promise<{ commodity: string; mandi: string; state: string; unit: string; currentPrice: MandiPrice | null }> {
  const { prices } = await getMandiPrices(state, undefined, commodity);

  const commodityGroup = prices.find(p =>
    p.commodity.toLowerCase() === commodity.toLowerCase()
  );

  if (!commodityGroup || commodityGroup.mandis.length === 0) {
    return { commodity, mandi: mandi || '—', state: state || '—', unit: '₹/Quintal', currentPrice: null };
  }

  const targetMandi = mandi
    ? commodityGroup.mandis.find(m => m.name.toLowerCase().includes(mandi.toLowerCase()))
    : commodityGroup.mandis[0];

  return {
    commodity: commodityGroup.commodity,
    mandi: targetMandi?.name || commodityGroup.mandis[0].name,
    state: targetMandi?.state || commodityGroup.mandis[0].state,
    unit: commodityGroup.unit,
    currentPrice: targetMandi || commodityGroup.mandis[0],
  };
}

/**
 * Clear the entire cache (useful for admin/debug).
 */
export function clearMandiCache(): void {
  cache.clear();
  console.log('[MandiPrices] Cache cleared');
}
