/**
 * Response Builder — Pretty WhatsApp Message Formatter
 *
 * Utility functions to build formatted messages for WhatsApp.
 */

const EMOJI_MAP: Record<string, string> = {
  PENDING: '🟡',
  CONFIRMED: '✅',
  ARRIVED: '🏢',
  WEIGHING: '⚖️',
  STORED: '📦',
  DISPATCH_REQUESTED: '🚚',
  DISPATCHING: '🔄',
  DISPATCHED: '✈️',
  COMPLETED: '🏆',
  CANCELLED: '❌',
  REJECTED: '🚫',
  // Commodities
  POTATO: '🥔',
  ONION: '🧅',
  VEGETABLES: '🥬',
  FRUITS: '🍎',
  DAIRY: '🧊',
  SEEDS: '🌱',
  OTHER: '📦',
  // Trends
  up: '📈',
  down: '📉',
  stable: '➡️',
};

export function emoji(key: string): string {
  return EMOJI_MAP[key] || EMOJI_MAP[key?.toUpperCase()] || '•';
}

/** Format a booking as a WhatsApp text block */
export function formatBooking(b: any, index?: number): string {
  const num = index != null ? `${index + 1}️⃣ ` : '';
  const statusEmoji = emoji(b.status);
  const commodityEmoji = emoji(b.commodityCategory || 'OTHER');

  return [
    `${num}*#${b.bookingNumber}*`,
    `${commodityEmoji} ${b.commodityName || b.commodityCategory} — ${b.estimatedWeightKg?.toLocaleString('en-IN')} Kg`,
    `🏭 ${b.facility?.name || 'Cold Storage'}`,
    `📍 ${b.facility?.city || ''}, ${b.facility?.state || ''}`,
    `📅 ${new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    `Status: ${statusEmoji} *${b.status?.replace(/_/g, ' ')}*`,
  ].join('\n');
}

/** Format a single booking with full detail */
export function formatBookingDetail(b: any): string {
  const lines = [
    `📦 *Booking #${b.bookingNumber}*`,
    ``,
    `🏭 *${b.facility?.name || 'Cold Storage'}*`,
    `📍 ${b.facility?.city || ''}, ${b.facility?.state || ''}`,
    ``,
    `${emoji(b.commodityCategory)} *${b.commodityName || b.commodityCategory}*`,
    `⚖️ Weight: ${b.estimatedWeightKg?.toLocaleString('en-IN')} Kg`,
    b.estimatedBags ? `🛍️ Bags: ${b.estimatedBags}` : '',
    `📅 Date: ${new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    b.preferredSlot ? `🕐 Slot: ${b.preferredSlot}` : '',
    ``,
    `Status: ${emoji(b.status)} *${b.status?.replace(/_/g, ' ')}*`,
  ];

  if (b.actualWeightKg) {
    lines.push(`Actual Weight: ${b.actualWeightKg?.toLocaleString('en-IN')} Kg`);
  }
  if (b.totalAmount) {
    lines.push(`💰 Amount: ₹${b.totalAmount?.toLocaleString('en-IN')}`);
  }

  return lines.filter(Boolean).join('\n');
}

/** Format mandi price entry */
export function formatMandiPrice(p: any): string {
  const commodityEmoji = emoji(p.commodity?.toUpperCase()) || '🌾';
  const trendEmoji = emoji(p.trend || 'stable');
  const trend = p.trend === 'up' ? 'UP' : p.trend === 'down' ? 'DOWN' : 'STABLE';

  return [
    `${commodityEmoji} *${p.commodity}* (${p.mandi}${p.district ? `, ${p.district}` : ''})`,
    `   Modal: ₹${p.modalPrice?.toLocaleString('en-IN')}/${p.unit || 'Qtl'} | Range: ₹${p.minPrice?.toLocaleString('en-IN')} – ₹${p.maxPrice?.toLocaleString('en-IN')}`,
    `   Trend: ${trendEmoji} ${trend}`,
  ].join('\n');
}

/** Format facility for selection list */
export function formatFacility(f: any, index: number): string {
  return [
    `${index + 1}️⃣ *${f.name}*`,
    `   📍 ${f.city || ''}, ${f.state || ''}`,
    f.totalCapacityMt ? `   📊 ${f.totalCapacityMt} MT capacity` : '',
  ].filter(Boolean).join('\n');
}

export const MAIN_MENU = `🙏 *Welcome to SheetKosh!*
Your cold storage companion on WhatsApp.

Choose an option:
1️⃣ 📦 Book Storage
2️⃣ 📋 My Bookings
3️⃣ 📊 Mandi Prices
4️⃣ 🔍 Check Booking Status
5️⃣ 🚚 Request Dispatch
6️⃣ 👤 My Profile
7️⃣ ❓ Help

_Reply with a number or keyword_`;

export const HELP_TEXT = `❓ *SheetKosh Help*

*Commands:*
• Send *1* or *book* — Start booking storage
• Send *2* or *bookings* — View your bookings
• Send *3* or *prices* — Today's mandi prices
• Send *4* or *status* — Check a booking status
• Send *5* or *dispatch* — Request dispatch
• Send *6* or *profile* — View your profile
• Send *menu* — Show main menu
• Send a *booking number* (e.g., BK-PCS-260720-001) — Get booking details

*Need help?*
📞 Call us: 1800-XXX-XXXX
📧 Email: support@sheetkosh.com`;

export const NOT_REGISTERED = `⚠️ Your phone number is not registered on SheetKosh.

Please download our app and register first:
📱 Android: [Play Store Link]
📱 iOS: [App Store Link]

Or visit: www.sheetkosh.com`;

export const responseBuilder = {
  emoji,
  formatBooking,
  formatBookingDetail,
  formatMandiPrice,
  formatFacility,
  MAIN_MENU,
  HELP_TEXT,
  NOT_REGISTERED,
};
