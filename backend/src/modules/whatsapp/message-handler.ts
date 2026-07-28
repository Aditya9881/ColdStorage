/**
 * Message Handler — Routes incoming WhatsApp messages to flows
 *
 * Acts as the central dispatcher:
 * 1. Gets/creates session for the phone
 * 2. If in an active flow → delegates to flow handler
 * 3. If at root → parses intent from text → starts flow
 */
import { sessionManager } from './session-manager';
import { showMainMenu, showHelp } from './flows/main-menu.flow';
import { startBookingFlow, handleBookingStep } from './flows/booking.flow';
import { showMyBookings, showBookingByNumber } from './flows/bookings-list.flow';
import { showMandiPrices } from './flows/mandi-prices.flow';
import { startDispatchFlow, handleDispatchStep } from './flows/dispatch.flow';
import { showProfile } from './flows/profile.flow';
import { whatsappService } from './whatsapp.service';

// Booking number pattern: BK-XXX-XXXXXX-XXX
const BOOKING_NUMBER_REGEX = /BK-[A-Z]+-\d{6}-\d{3}/i;

// Commodity keywords for mandi price queries
const COMMODITY_KEYWORDS = ['potato', 'onion', 'tomato', 'apple', 'wheat', 'rice', 'aloo', 'pyaaz'];

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

    // ── Global Commands (always work, even mid-flow) ──
    if (['menu', 'hi', 'hello', 'hey', 'start', 'main', '0'].includes(lower)) {
      await sessionManager.clearFlow(phone);
      await showMainMenu(phone);
      return;
    }

    if (['help', '?', '7'].includes(lower) && !session.currentFlow) {
      await showHelp(phone);
      return;
    }

    if (lower === 'cancel' || lower === 'exit' || lower === 'quit') {
      await sessionManager.clearFlow(phone);
      await whatsappService.sendText(phone, '✅ Cancelled.\n\nReply *menu* for options.');
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
          await sessionManager.clearFlow(phone);
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
        await startBookingFlow(phone);
        return;

      case '2':
      case 'bookings':
      case 'my bookings':
        await showMyBookings(phone);
        return;

      case '3':
      case 'prices':
      case 'mandi':
      case 'mandi prices':
      case 'market':
        await showMandiPrices(phone);
        return;

      case '4':
      case 'status':
      case 'check status':
        await whatsappService.sendText(phone, '🔍 *Check Booking Status*\n\nEnter your booking number:\n(e.g., BK-PCS-260720-001)\n\nReply *menu* to go back.');
        return;

      case '5':
      case 'dispatch':
        await startDispatchFlow(phone);
        return;

      case '6':
      case 'profile':
      case 'my profile':
        await showProfile(phone);
        return;
    }

    // Check for commodity price queries like "potato price", "onion rates"
    for (const keyword of COMMODITY_KEYWORDS) {
      if (lower.includes(keyword)) {
        const commodity = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        await showMandiPrices(phone, commodity);
        return;
      }
    }

    // ── Fallback: Unrecognized ──
    await whatsappService.sendText(
      phone,
      `🤔 I didn't understand that.\n\nTry:\n• Send a *number* (1-7) for menu options\n• Send a *booking number* (BK-xxx) for details\n• Send *menu* for the full menu\n• Send *help* for all commands`
    );
  } catch (err) {
    console.error('[WhatsApp] Message handler error:', err);
    await whatsappService.sendText(phone, '❌ Something went wrong. Please try again.\nReply *menu* for options.');
  }
}
