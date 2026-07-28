/**
 * Mandi Prices Flow — Show market prices via WhatsApp
 */
import { whatsappService } from '../whatsapp.service';
import { formatMandiPrice } from '../response-builder';

const MANDI_API_BASE = process.env.BACKEND_URL || 'https://coldstorage-4wbr.onrender.com';

/** Fetch and show mandi prices, optionally filtered by commodity */
export async function showMandiPrices(phone: string, commodity?: string): Promise<void> {
  try {
    // Call the market-prices API internally
    let url = `${MANDI_API_BASE}/api/market-prices?limit=15`;
    if (commodity) {
      url += `&commodity=${encodeURIComponent(commodity)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      await whatsappService.sendText(phone, '❌ Unable to fetch mandi prices right now. Please try again later.\n\nReply *menu* for options.');
      return;
    }

    const result = await response.json() as any;
    const prices = result?.data?.prices || result?.data || [];

    if (!Array.isArray(prices) || prices.length === 0) {
      await whatsappService.sendText(
        phone,
        commodity
          ? `📊 No prices found for *${commodity}* today.\n\nTry: *potato*, *onion*, *apple*, *tomato*\nReply *menu* for options.`
          : '📊 No mandi prices available right now.\n\nReply *menu* for options.'
      );
      return;
    }

    const formatted = prices.slice(0, 10).map(formatMandiPrice).join('\n\n');
    const header = commodity
      ? `📊 *Mandi Prices — ${commodity.charAt(0).toUpperCase() + commodity.slice(1)}*`
      : `📊 *Today's Mandi Prices*`;

    await whatsappService.sendText(
      phone,
      `${header}\n\n${formatted}\n\n──────────\n\n💡 Filter by commodity:\nReply *potato price*, *onion price*, etc.\n\nReply *menu* for main menu.`
    );
  } catch (err) {
    console.error('[WhatsApp] Mandi prices error:', err);
    await whatsappService.sendText(phone, '❌ Error fetching prices. Please try again.\n\nReply *menu* for options.');
  }
}
