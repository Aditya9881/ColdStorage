/**
 * Mandi Prices Flow — Show market prices via WhatsApp
 * Uses the market-prices service directly (no HTTP loopback)
 */
import { whatsappService } from '../whatsapp.service';
import { getMandiPrices } from '../../market-prices/market-prices.service';

/** Fetch and show mandi prices, optionally filtered by commodity */
export async function showMandiPrices(phone: string, commodity?: string): Promise<void> {
  try {
    // Call the market-prices service directly
    const { prices } = await getMandiPrices(undefined, undefined, commodity);

    if (!prices || prices.length === 0) {
      await whatsappService.sendText(
        phone,
        commodity
          ? `📊 No prices found for *${commodity}* today.\n\nTry: *potato*, *onion*, *apple*, *tomato*\nReply *menu* for options.`
          : '📊 No mandi prices available right now.\n\nReply *menu* for options.'
      );
      return;
    }

    // Format the grouped prices
    const lines: string[] = [];
    for (const group of prices.slice(0, 5)) {
      const commodityName = group.commodity || 'Unknown';
      for (const mandi of (group.mandis || []).slice(0, 3)) {
        const trendEmoji = mandi.trend === 'up' ? '📈' : mandi.trend === 'down' ? '📉' : '➡️';
        const trendLabel = mandi.trend === 'up' ? 'UP' : mandi.trend === 'down' ? 'DOWN' : 'STABLE';

        lines.push(
          `🌾 *${commodityName}* (${mandi.mandi}${mandi.district ? `, ${mandi.district}` : ''})\n` +
          `   Modal: ₹${mandi.modalPrice?.toLocaleString('en-IN')}/${mandi.unit || 'Qtl'} | Range: ₹${mandi.minPrice?.toLocaleString('en-IN')} – ₹${mandi.maxPrice?.toLocaleString('en-IN')}\n` +
          `   Trend: ${trendEmoji} ${trendLabel}`
        );
      }
    }

    const header = commodity
      ? `📊 *Mandi Prices — ${commodity.charAt(0).toUpperCase() + commodity.slice(1)}*`
      : `📊 *Today's Mandi Prices*`;

    await whatsappService.sendText(
      phone,
      `${header}\n\n${lines.join('\n\n')}\n\n──────────\n\n💡 Filter by commodity:\nReply *potato price*, *onion price*, etc.\n\nReply *menu* for main menu.`
    );
  } catch (err) {
    console.error('[WhatsApp] Mandi prices error:', err);
    await whatsappService.sendText(phone, '❌ Error fetching prices. Please try again.\n\nReply *menu* for options.');
  }
}
