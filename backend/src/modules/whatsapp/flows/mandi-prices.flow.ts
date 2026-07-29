/**
 * Mandi Prices Flow — Premium bilingual market prices
 * Uses the market-prices service directly (no HTTP loopback)
 */
import { whatsappService } from '../whatsapp.service';
import { getMandiPrices } from '../../market-prices/market-prices.service';
import { t, Lang } from '../language';

/** Fetch and show mandi prices, optionally filtered by commodity */
export async function showMandiPrices(phone: string, commodity?: string, lang: Lang = 'en'): Promise<void> {
  try {
    const { prices } = await getMandiPrices(undefined, undefined, commodity);

    if (!prices || prices.length === 0) {
      const noDataFn = t('noMandiPrices', lang);
      await whatsappService.sendText(phone, noDataFn(commodity));
      return;
    }

    // Format prices in a clean, modern way
    const lines: string[] = [];
    for (const group of prices.slice(0, 5)) {
      const commodityName = group.commodity || 'Unknown';
      const unit = group.unit || 'Qtl';

      for (const m of group.mandis.slice(0, 3)) {
        lines.push(
          `*${commodityName}*  ·  ${m.name}\n` +
          `${m.district ? `${m.district}, ${m.state}\n` : ''}` +
          `Modal  ₹${m.modalPrice?.toLocaleString('en-IN')}/${unit}\n` +
          `Range  ₹${m.minPrice?.toLocaleString('en-IN')} – ₹${m.maxPrice?.toLocaleString('en-IN')}` +
          `${m.variety && m.variety !== commodityName ? `\nVariety  ${m.variety}` : ''}`
        );
      }
    }

    const headerFn = t('mandiHeader', lang);
    const footer = t('mandiFooter', lang);

    await whatsappService.sendText(
      phone,
      `${headerFn(commodity)}\n\n${lines.join('\n\n─────\n\n')}${footer}`
    );
  } catch (err) {
    console.error('[WhatsApp] Mandi prices error:', err);
    await whatsappService.sendText(phone, t('mandiPriceError', lang));
  }
}
