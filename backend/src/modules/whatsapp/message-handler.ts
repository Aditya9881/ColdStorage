/**
 * Message Handler — Routes incoming WhatsApp messages to flows
 *
 * Premium bilingual bot with Hindi/English support.
 * Modern formatting, fuzzy greeting detection, clean UX.
 */
import { sessionManager } from './session-manager';
import { showMainMenu, showHelp } from './flows/main-menu.flow';
import { startBookingFlow, handleBookingStep } from './flows/booking.flow';
import { showMyBookings, showBookingByNumber } from './flows/bookings-list.flow';
import { showMandiPrices } from './flows/mandi-prices.flow';
import { startDispatchFlow, handleDispatchStep } from './flows/dispatch.flow';
import { showProfile } from './flows/profile.flow';
import { whatsappService } from './whatsapp.service';
import { t, Lang } from './language';

// Booking number pattern: BK-XXX-XXXXXX-XXX
const BOOKING_NUMBER_REGEX = /BK-[A-Z]+-\d{6}-\d{3}/i;

// Greetings that should trigger the main menu
const GREETINGS = new Set([
  'menu', 'hi', 'hii', 'hiii', 'hello', 'hey', 'hola', 'start', 'main', '0',
  'namaste', 'namaskar', 'namaskaar', 'helo', 'shuru',
]);

// Hindi menu keywords
const HINDI_KEYWORDS: Record<string, string> = {
  'book': '1', 'booking': '1', 'बुक': '1', 'स्टोरेज': '1',
  'bookings': '2', 'मेरी बुकिंग': '2',
  'prices': '3', 'mandi': '3', 'bhav': '3', 'मंडी': '3', 'भाव': '3', 'rate': '3',
  'status': '4', 'स्थिति': '4',
  'dispatch': '5', 'डिस्पैच': '5',
  'profile': '6', 'प्रोफाइल': '6',
};

// Commodity keywords for mandi price queries (English + Hindi)
const COMMODITY_KEYWORDS = [
  'potato', 'onion', 'tomato', 'apple', 'wheat', 'rice',
  'aloo', 'pyaaz', 'tamatar', 'seb', 'gehun', 'chawal',
  'आलू', 'प्याज', 'टमाटर', 'सेब', 'गेहूँ', 'चावल',
];

// Commodity Hindi -> English map
const COMMODITY_MAP: Record<string, string> = {
  'aloo': 'Potato', 'आलू': 'Potato',
  'pyaaz': 'Onion', 'प्याज': 'Onion',
  'tamatar': 'Tomato', 'टमाटर': 'Tomato',
  'seb': 'Apple', 'सेब': 'Apple',
  'gehun': 'Wheat', 'गेहूँ': 'Wheat',
  'chawal': 'Rice', 'चावल': 'Rice',
};

/** Get the user's language from session flowData */
function getLang(session: any): Lang {
  return session?.flowData?.lang || 'en';
}

/**
 * Handle an incoming WhatsApp text message
 */
export async function handleIncomingMessage(phone: string, text: string, messageId?: string): Promise<void> {
  try {
    // Mark as read
    if (messageId) {
      await whatsappService.markAsRead(messageId);
    }

    const session = await sessionManager.getSession(phone);
    const message = text.trim();
    const lower = message.toLowerCase();
    const lang = getLang(session);

    // ── Language Selection Flow ──
    if (session.currentFlow === 'LANG_SELECT') {
      if (lower === '1') {
        await sessionManager.updateFlow(phone, null, 0, { lang: 'en' });
        await whatsappService.sendText(phone, t('langSet', 'en'));
        await showMainMenu(phone, 'en');
      } else if (lower === '2') {
        await sessionManager.updateFlow(phone, null, 0, { lang: 'hi' });
        await whatsappService.sendText(phone, t('langSet', 'hi'));
        await showMainMenu(phone, 'hi');
      } else {
        await whatsappService.sendText(phone, t('langPrompt', lang));
      }
      return;
    }

    // ── Global: Language change command ──
    if (['8', 'lang', 'language', 'bhasha', 'भाषा'].includes(lower)) {
      await sessionManager.updateFlow(phone, 'LANG_SELECT', 0, { lang });
      await whatsappService.sendText(phone, t('langPrompt', lang));
      return;
    }

    // ── Global: Greetings → Main Menu ──
    if (GREETINGS.has(lower)) {
      await sessionManager.clearFlow(phone);
      // Preserve lang in flowData
      await sessionManager.updateFlow(phone, null, 0, { lang });
      await showMainMenu(phone, lang);
      return;
    }

    if (['help', '?', '7', 'sahayata', 'सहायता'].includes(lower) && !session.currentFlow) {
      await showHelp(phone, lang);
      return;
    }

    if (['cancel', 'exit', 'quit', 'रद्द', 'बंद'].includes(lower)) {
      await sessionManager.updateFlow(phone, null, 0, { lang });
      await whatsappService.sendText(phone, t('cancelled', lang));
      return;
    }

    // ── If in an active flow, delegate to flow handler ──
    if (session.currentFlow) {
      switch (session.currentFlow) {
        case 'BOOKING':
          await handleBookingStep(phone, message, session);
          return;

        case 'DISPATCH':
          await handleDispatchStep(phone, message, session);
          return;

        default:
          // Unknown flow, reset
          await sessionManager.updateFlow(phone, null, 0, { lang });
          break;
      }
    }

    // ── Root Level: Parse intent ──

    // Check if it's a booking number
    const bookingMatch = message.match(BOOKING_NUMBER_REGEX);
    if (bookingMatch) {
      await showBookingByNumber(phone, bookingMatch[0]);
      return;
    }

    // Menu number selections
    switch (lower) {
      case '1':
      case 'book':
      case 'book storage':
      case 'booking':
      case 'बुक':
        await startBookingFlow(phone, lang);
        return;

      case '2':
      case 'bookings':
      case 'my bookings':
      case 'मेरी बुकिंग':
        await showMyBookings(phone);
        return;

      case '3':
      case 'prices':
      case 'mandi':
      case 'mandi prices':
      case 'bhav':
      case 'मंडी भाव':
        await showMandiPrices(phone, undefined, lang);
        return;

      case '4':
      case 'status':
      case 'check status':
      case 'स्थिति':
        await whatsappService.sendText(phone, t('enterBookingNumber', lang));
        return;

      case '5':
      case 'dispatch':
      case 'डिस्पैच':
        await startDispatchFlow(phone);
        return;

      case '6':
      case 'profile':
      case 'my profile':
      case 'प्रोफाइल':
        await showProfile(phone, lang);
        return;
    }

    // Check for commodity price queries like "potato price", "aloo bhav", "प्याज rate"
    for (const keyword of COMMODITY_KEYWORDS) {
      if (lower.includes(keyword)) {
        const commodity = COMMODITY_MAP[keyword] || keyword.charAt(0).toUpperCase() + keyword.slice(1);
        await showMandiPrices(phone, commodity, lang);
        return;
      }
    }

    // Check Hindi keywords
    for (const [key, value] of Object.entries(HINDI_KEYWORDS)) {
      if (lower.includes(key)) {
        // Simulate the number input
        await handleIncomingMessage(phone, value, undefined);
        return;
      }
    }

    // ── Fallback: Unrecognized ──
    await whatsappService.sendText(phone, t('fallback', lang));
  } catch (err) {
    console.error('[WhatsApp] Message handler error:', err);
    const lang = 'en'; // fallback
    await whatsappService.sendText(phone, t('error', lang));
  }
}
