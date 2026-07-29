/**
 * Mandi Prices Flow — Show market prices via WhatsApp
 * Uses the market-prices service directly (no HTTP loopback)
 */
import { whatsappService } from '../whatsapp.service';
import { getMandiPrices, CommodityPriceGroup, MandiPrice } from '../../market-prices/market-prices.service';

/** Fetch and show mandi prices, optionally filtered by commodity */
export async function showMandiPrices(phone: string, commodity?: string): Promise<void> {
  try {
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
      const unit = group.unit || 'Qtl';

      for (const m of group.mandis.slice(0, 3)) {
        lines.push(
          `🌾 *${commodityName}* (${m.name}${m.district ? `, ${m.district}` : ''})\n` +
          `   Modal: ₹${m.modalPrice?.toLocaleString('en-IN')}/${unit}\n` +
          `   Range: ₹${m.minPrice?.toLocaleString('en-IN')} – ₹${m.maxPrice?.toLocaleString('en-IN')}\n` +
          `   ${m.variety ? `Variety: ${m.variety}` : ''}`
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
