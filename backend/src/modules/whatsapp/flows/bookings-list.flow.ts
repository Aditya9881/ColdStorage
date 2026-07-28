/**
 * Bookings List Flow — Show farmer's bookings via WhatsApp
 */
import { prisma } from '../../../config/database';
import { whatsappService } from '../whatsapp.service';
import { sessionManager } from '../session-manager';
import { formatBooking, formatBookingDetail } from '../response-builder';

/** Show all bookings for the registered farmer */
export async function showMyBookings(phone: string): Promise<void> {
  const user = await sessionManager.findLinkedUser(phone);
  if (!user) {
    await whatsappService.sendText(phone, '⚠️ Your phone is not registered on SheetKosh.\nPlease register on our app first.\n\nReply *menu* for options.');
    return;
  }

  const bookings = await prisma.booking.findMany({
    where: { farmerId: user.id },
    include: {
      facility: { select: { name: true, city: true, state: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (bookings.length === 0) {
    await whatsappService.sendText(phone, '📋 You have no bookings yet.\n\nReply *1* to book storage or *menu* for options.');
    return;
  }

  const list = bookings.map((b, i) => formatBooking(b, i)).join('\n\n──────────\n\n');

  await whatsappService.sendText(
    phone,
    `📋 *Your Bookings* (${bookings.length})\n\n${list}\n\n──────────\n\n📝 Send a *booking number* (e.g., BK-PCS-260720-001) for full details.\n\nReply *menu* for main menu.`
  );
}

/** Show detail for a specific booking by number */
export async function showBookingByNumber(phone: string, bookingNumber: string): Promise<void> {
  const booking = await prisma.booking.findFirst({
    where: {
      bookingNumber: { contains: bookingNumber, mode: 'insensitive' },
    },
    include: {
      facility: { select: { name: true, city: true, state: true, address: true } },
    },
  });

  if (!booking) {
    await whatsappService.sendText(phone, `❌ Booking *${bookingNumber}* not found.\n\nCheck the number and try again.\nReply *menu* for options.`);
    return;
  }

  const detail = formatBookingDetail(booking);
  let actions = '\n\n';

  if (booking.status === 'STORED') {
    actions += '🚚 Reply *dispatch* to request dispatch\n';
  }
  actions += '📋 Reply *bookings* to see all bookings\n';
  actions += '🏠 Reply *menu* for main menu';

  await whatsappService.sendText(phone, detail + actions);
}
