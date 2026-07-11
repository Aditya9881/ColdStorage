import { Router, Request } from 'express';
import { asyncHandler } from '../../shared/middleware/error-handler';
import {
  getMandiPrices,
  getMandiTrend,
  clearMandiCache,
} from './market-prices.service';

const router = Router();
// Market prices are PUBLIC — guests can browse prices without login

/**
 * GET /market-prices
 *
 * Fetches live commodity prices from data.gov.in (AGMARKNET).
 * Supports location-based filtering via query params.
 *
 * Query params:
 *   ?state=Uttar Pradesh   — filter by state
 *   ?district=Agra         — filter by district
 *   ?commodity=Potato      — filter by commodity
 *
 * Response includes:
 *   - data: CommodityPriceGroup[] (grouped by commodity, each with mandi prices)
 *   - meta.fetchedAt: ISO timestamp of when data was fetched
 *   - meta.source: 'live' | 'cached' | 'fallback'
 */
router.get('/', asyncHandler(async (req: Request, res) => {
  const state = req.query.state as string | undefined;
  const district = req.query.district as string | undefined;
  const commodity = req.query.commodity as string | undefined;

  const { prices, fetchedAt, source } = await getMandiPrices(state, district, commodity);

  res.json({
    success: true,
    data: prices,
    meta: {
      fetchedAt: new Date(fetchedAt).toISOString(),
      source,
      totalCommodities: prices.length,
      totalMandis: prices.reduce((sum, p) => sum + p.mandis.length, 0),
      filters: {
        state: state || null,
        district: district || null,
        commodity: commodity || null,
      },
    },
  });
}));

/**
 * GET /market-prices/trends
 *
 * Get price info for a specific commodity + mandi.
 *
 * Query params:
 *   ?commodity=Potato       — required
 *   ?mandi=Agra             — optional (defaults to top mandi)
 *   ?state=Uttar Pradesh    — optional
 */
router.get('/trends', asyncHandler(async (req: Request, res) => {
  const commodity = (req.query.commodity as string) || 'Potato';
  const mandi = req.query.mandi as string | undefined;
  const state = req.query.state as string | undefined;

  const trend = await getMandiTrend(commodity, mandi, state);

  if (!trend.currentPrice) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `No price data found for "${commodity}"` },
    });
    return;
  }

  res.json({
    success: true,
    data: trend,
  });
}));

/**
 * POST /market-prices/cache/clear
 *
 * Admin-only: Clear the mandi price cache to force a fresh fetch.
 */
router.post('/cache/clear', asyncHandler(async (_req: Request, res) => {
  clearMandiCache();
  res.json({ success: true, message: 'Mandi price cache cleared' });
}));

export default router;
