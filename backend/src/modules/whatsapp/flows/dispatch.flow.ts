/**
 * Dispatch Flow — Request dispatch for stored goods via WhatsApp
 */
import { prisma } from '../../../config/database';
import { whatsappService } from '../whatsapp.service';
import { sessionManager } from '../session-manager';
import { emoji } from '../response-builder';

/** Start dispatch flow: list stored bookings */
export async function startDispatchFlow(phone: string): Promise<void> {
  const user = await sessionManager.findLinkedUser(phone);
  if (!user) {
    await whatsappService.sendText(phone, '⚠️ Your phone is not registered.\nReply *menu* for options.');
    return;
  }

  const storedBookings = await prisma.booking.findMany({
    where: {
      farmerId: user.id,
      status: 'STORED',
    },
    include: {
      facility: { select: { name: true, city: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (storedBookings.length === 0) {
    await whatsappService.sendText(phone, '📦 No stored bookings found.\nDispatch is only available for bookings with status *STORED*.\n\nReply *menu* for options.');
    return;
  }

  const list = storedBookings.map((b, i) =>
    `${i + 1}️⃣ *#${b.bookingNumber}*\n   ${emoji(b.commodityCategory)} ${b.commodityName} — ${Number(b.estimatedWeightKg).toLocaleString('en-IN')} Kg\n   🏭 ${(b as any).facility?.name || ''}`
  ).join('\n\n');

  await whatsappService.sendText(
    phone,
    `🚚 *Request Dispatch*\n\nSelect a stored booking:\n\n${list}\n\n_Reply with the number (e.g., 1)_`
  );

  await sessionManager.updateFlow(phone, 'DISPATCH', 0, {
    bookings: storedBookings.map(b => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      commodityName: b.commodityName,
    })),
  });
}

/** Handle dispatch flow steps */
export async function handleDispatchStep(phone: string, message: string, session: any): Promise<void> {
  const data = session.flowData || {};
  const step = session.flowStep;

  switch (step) {
    // ── Step 0: User selects booking ──
    case 0: {
      const idx = parseInt(message) - 1;
      if (isNaN(idx) || idx < 0 || idx >= (data.bookings?.length || 0)) {
        await whatsappService.sendText(phone, '❌ Invalid selection. Reply with a valid number.\nReply *menu* to cancel.');
        return;
      }

      const booking = data.bookings[idx];

      await whatsappService.sendText(
        phone,
        `🚚 *Dispatch Request*\n\n📦 #${booking.bookingNumber}\n🌾 ${booking.commodityName}\n\nReply *CONFIRM* to request dispatch\nor *CANCEL* to go back.`
      );

      await sessionManager.updateFlow(phone, 'DISPATCH', 1, {
        ...data,
        selectedBookingId: booking.id,
        selectedBookingNumber: booking.bookingNumber,
      });
      break;
    }

    // ── Step 1: User confirms ──
    case 1: {
      const lower = message.toLowerCase().trim();

      if (lower === 'cancel') {
        await whatsappService.sendText(phone, '❌ Dispatch cancelled.\nReply *menu* for options.');
        await sessionManager.clearFlow(phone);
        return;
      }

      if (lower !== 'confirm' && lower !== 'yes') {
        await whatsappService.sendText(phone, 'Reply *CONFIRM* or *CANCEL*.');
        return;
      }

      try {
        await prisma.booking.update({
          where: { id: data.selectedBookingId },
          data: { status: 'DISPATCH_REQUESTED' },
        });

        await whatsappService.sendText(
          phone,
          `✅ *Dispatch Requested!*\n\n📦 #${data.selectedBookingNumber}\nStatus: 🟡 *DISPATCH REQUESTED*\n\nThe cold storage owner has been notified.\nYou'll receive updates here.\n\nReply *menu* for options.`
        );
      } catch (err: any) {
        console.error('[WhatsApp] Dispatch request failed:', err);
        await whatsappService.sendText(phone, '❌ Failed to request dispatch. Please try again.\nReply *menu* for options.');
      }

      await sessionManager.clearFlow(phone);
      break;
    }

    default:
      await whatsappService.sendText(phone, '❌ Something went wrong. Reply *menu* to start over.');
      await sessionManager.clearFlow(phone);
  }
}
