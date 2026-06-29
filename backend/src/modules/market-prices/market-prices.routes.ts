import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest } from '../../shared/types';

const router = Router();
router.use(authenticate);

// Simulated mandi price data — in production would come from Agmarknet/e-NAM APIs
const MANDI_PRICES: Record<string, { commodity: string; category: string; unit: string; mandis: { name: string; state: string; minPrice: number; maxPrice: number; modalPrice: number }[] }> = {
  POTATO: {
    commodity: 'Potato', category: 'POTATO', unit: '₹/Quintal',
    mandis: [
      { name: 'Agra Mandi', state: 'Uttar Pradesh', minPrice: 350, maxPrice: 600, modalPrice: 480 },
      { name: 'Farrukhabad', state: 'Uttar Pradesh', minPrice: 320, maxPrice: 550, modalPrice: 450 },
      { name: 'Kanpur', state: 'Uttar Pradesh', minPrice: 380, maxPrice: 620, modalPrice: 510 },
      { name: 'Jalandhar', state: 'Punjab', minPrice: 400, maxPrice: 650, modalPrice: 530 },
      { name: 'Indore', state: 'Madhya Pradesh', minPrice: 420, maxPrice: 680, modalPrice: 560 },
      { name: 'Nashik', state: 'Maharashtra', minPrice: 450, maxPrice: 720, modalPrice: 590 },
    ],
  },
  ONION: {
    commodity: 'Onion', category: 'ONION', unit: '₹/Quintal',
    mandis: [
      { name: 'Lasalgaon', state: 'Maharashtra', minPrice: 800, maxPrice: 1500, modalPrice: 1150 },
      { name: 'Nashik', state: 'Maharashtra', minPrice: 750, maxPrice: 1400, modalPrice: 1100 },
      { name: 'Bangalore', state: 'Karnataka', minPrice: 900, maxPrice: 1600, modalPrice: 1250 },
      { name: 'Delhi Azadpur', state: 'Delhi', minPrice: 850, maxPrice: 1550, modalPrice: 1200 },
    ],
  },
  VEGETABLES: {
    commodity: 'Mixed Vegetables', category: 'VEGETABLES', unit: '₹/Quintal',
    mandis: [
      { name: 'Azadpur Mandi', state: 'Delhi', minPrice: 1200, maxPrice: 2500, modalPrice: 1800 },
      { name: 'Vashi Mandi', state: 'Maharashtra', minPrice: 1100, maxPrice: 2400, modalPrice: 1700 },
      { name: 'Koyambedu', state: 'Tamil Nadu', minPrice: 1300, maxPrice: 2600, modalPrice: 1900 },
    ],
  },
  FRUITS: {
    commodity: 'Apple', category: 'FRUITS', unit: '₹/Quintal',
    mandis: [
      { name: 'Shimla', state: 'Himachal Pradesh', minPrice: 4000, maxPrice: 8000, modalPrice: 6000 },
      { name: 'Srinagar', state: 'Jammu & Kashmir', minPrice: 3500, maxPrice: 7500, modalPrice: 5500 },
      { name: 'Delhi Azadpur', state: 'Delhi', minPrice: 4500, maxPrice: 8500, modalPrice: 6500 },
    ],
  },
  DAIRY: {
    commodity: 'Dairy Products', category: 'DAIRY', unit: '₹/Litre',
    mandis: [
      { name: 'Anand', state: 'Gujarat', minPrice: 38, maxPrice: 55, modalPrice: 45 },
      { name: 'Jaipur', state: 'Rajasthan', minPrice: 40, maxPrice: 58, modalPrice: 48 },
    ],
  },
};

function addVariation(base: number, range: number): number {
  return Math.round(base + (Math.random() - 0.5) * range);
}

// ── GET /market-prices ──
router.get('/', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const today = new Date().toISOString().split('T')[0];
  const prices = Object.entries(MANDI_PRICES).map(([, data]) => ({
    ...data, date: today,
    mandis: data.mandis.map(m => ({
      ...m,
      minPrice: addVariation(m.minPrice, 40),
      maxPrice: addVariation(m.maxPrice, 60),
      modalPrice: addVariation(m.modalPrice, 50),
    })),
  }));
  res.json({ success: true, data: prices });
}));

// ── GET /market-prices/trends ──
router.get('/trends', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { commodity = 'POTATO', mandi } = req.query;
  const commodityData = MANDI_PRICES[commodity as string];
  if (!commodityData) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Commodity not found' } }); return; }

  const targetMandi = mandi
    ? commodityData.mandis.find(m => m.name.toLowerCase().includes((mandi as string).toLowerCase()))
    : commodityData.mandis[0];
  if (!targetMandi) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mandi not found' } }); return; }

  const today = new Date();
  const trend: { date: string; minPrice: number; maxPrice: number; modalPrice: number }[] = [];
  let baseModal = targetMandi.modalPrice;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    baseModal += (Math.random() - 0.48) * 20;
    baseModal = Math.max(targetMandi.minPrice * 0.8, Math.min(targetMandi.maxPrice * 1.2, baseModal));
    const modalPrice = Math.round(baseModal);
    const spread = Math.round(modalPrice * 0.15);
    trend.push({ date: date.toISOString().split('T')[0], minPrice: modalPrice - spread, maxPrice: modalPrice + spread, modalPrice });
  }

  res.json({ success: true, data: { commodity: commodityData.commodity, category: commodity, mandi: targetMandi.name, state: targetMandi.state, unit: commodityData.unit, trend } });
}));

export default router;
