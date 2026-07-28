/**
 * Booking Flow — Multi-step cold storage booking via WhatsApp
 *
 * Steps:
 *  0 → Show facility list
 *  1 → User picked facility → Show commodity categories
 *  2 → User picked category → Ask commodity name
 *  3 → User entered name → Ask weight
 *  4 → User entered weight → Ask date
 *  5 → User entered date → Show summary & confirm
 *  6 → User confirmed → Create booking
 */
import { prisma } from '../../../config/database';
import { whatsappService } from '../whatsapp.service';
import { sessionManager } from '../session-manager';
import { formatFacility, emoji } from '../response-builder';

const CATEGORIES = [
  { key: 'POTATO', label: 'Potato', emoji: '🥔' },
  { key: 'ONION', label: 'Onion', emoji: '🧅' },
  { key: 'VEGETABLES', label: 'Vegetables', emoji: '🥬' },
  { key: 'FRUITS', label: 'Fruits', emoji: '🍎' },
  { key: 'DAIRY', label: 'Dairy', emoji: '🧊' },
  { key: 'SEEDS', label: 'Seeds', emoji: '🌱' },
  { key: 'OTHER', label: 'Other', emoji: '📦' },
];

export async function startBookingFlow(phone: string): Promise<void> {
  // Fetch active facilities
  const facilities = await prisma.facility.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, city: true, state: true, totalCapacityMT: true },
    take: 10,
    orderBy: { name: 'asc' },
  });

  if (facilities.length === 0) {
    await whatsappService.sendText(phone, '😕 No cold storage facilities are currently available. Please try again later.\n\nReply *menu* to go back.');
    await sessionManager.clearFlow(phone);
    return;
  }

  const facilityList = facilities.map((f, i) => formatFacility(f, i)).join('\n\n');

  await whatsappService.sendText(
    phone,
    `📦 *Book Storage*\n\nChoose a cold storage facility:\n\n${facilityList}\n\n_Reply with the number (e.g., 1)_`
  );

  await sessionManager.updateFlow(phone, 'BOOKING', 0, { facilities: facilities.map(f => ({ id: f.id, name: f.name })) });
}

export async function handleBookingStep(phone: string, message: string, session: any): Promise<void> {
  const step = session.flowStep;
  const data = session.flowData || {};

  switch (step) {
    // ── Step 0: User selects facility ──
    case 0: {
      const idx = parseInt(message) - 1;
      if (isNaN(idx) || idx < 0 || idx >= (data.facilities?.length || 0)) {
        await whatsappService.sendText(phone, '❌ Invalid selection. Please reply with a valid number.\n\nReply *menu* to cancel.');
        return;
      }

      const facility = data.facilities[idx];
      const categoryList = CATEGORIES.map((c, i) => `${i + 1}️⃣ ${c.emoji} ${c.label}`).join('\n');

      await whatsappService.sendText(
        phone,
        `✅ Selected: *${facility.name}*\n\n🌾 *What commodity are you storing?*\n\n${categoryList}\n\n_Reply with the number_`
      );

      await sessionManager.updateFlow(phone, 'BOOKING', 1, {
        ...data,
        facilityId: facility.id,
        facilityName: facility.name,
      });
      break;
    }

    // ── Step 1: User selects commodity category ──
    case 1: {
      const idx = parseInt(message) - 1;
      if (isNaN(idx) || idx < 0 || idx >= CATEGORIES.length) {
        await whatsappService.sendText(phone, '❌ Invalid selection. Reply with 1-7.');
        return;
      }

      const category = CATEGORIES[idx];
      await whatsappService.sendText(
        phone,
        `${category.emoji} Category: *${category.label}*\n\n✏️ *Enter the commodity name*\n(e.g., Aloo Chandramukhi, Pyaaz Red)\n\n_Type the name:_`
      );

      await sessionManager.updateFlow(phone, 'BOOKING', 2, {
        ...data,
        commodityCategory: category.key,
        commodityCategoryLabel: category.label,
      });
      break;
    }

    // ── Step 2: User enters commodity name ──
    case 2: {
      const name = message.trim();
      if (name.length < 2) {
        await whatsappService.sendText(phone, '❌ Name too short. Please enter a valid commodity name.');
        return;
      }

      await whatsappService.sendText(
        phone,
        `📝 Commodity: *${name}*\n\n⚖️ *Enter estimated weight in Kg:*\n(e.g., 5000)`
      );

      await sessionManager.updateFlow(phone, 'BOOKING', 3, {
        ...data,
        commodityName: name,
      });
      break;
    }

    // ── Step 3: User enters weight ──
    case 3: {
      const weight = parseFloat(message.replace(/,/g, ''));
      if (isNaN(weight) || weight <= 0 || weight > 100000) {
        await whatsappService.sendText(phone, '❌ Please enter a valid weight (1 - 100,000 Kg).');
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tmrStr = tomorrow.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      await whatsappService.sendText(
        phone,
        `⚖️ Weight: *${weight.toLocaleString('en-IN')} Kg*\n\n📅 *Enter preferred date:*\nFormat: DD/MM/YYYY\n\nOr reply:\n• *tomorrow* — ${tmrStr}\n• *3days* — In 3 days\n• *week* — In 1 week`
      );

      await sessionManager.updateFlow(phone, 'BOOKING', 4, {
        ...data,
        estimatedWeightKg: weight,
      });
      break;
    }

    // ── Step 4: User enters date ──
    case 4: {
      let date: Date;
      const lower = message.toLowerCase().trim();

      if (lower === 'tomorrow') {
        date = new Date();
        date.setDate(date.getDate() + 1);
      } else if (lower === '3days') {
        date = new Date();
        date.setDate(date.getDate() + 3);
      } else if (lower === 'week') {
        date = new Date();
        date.setDate(date.getDate() + 7);
      } else {
        // Parse DD/MM/YYYY
        const parts = message.trim().split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [day, month, year] = parts.map(Number);
          date = new Date(year, month - 1, day);
        } else {
          await whatsappService.sendText(phone, '❌ Invalid date format. Use DD/MM/YYYY or reply *tomorrow*.');
          return;
        }
      }

      if (isNaN(date.getTime()) || date < new Date()) {
        await whatsappService.sendText(phone, '❌ Date must be today or in the future. Please try again.');
        return;
      }

      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const isoDate = date.toISOString().split('T')[0];

      // Show summary
      const summary = [
        `📋 *Booking Summary*`,
        ``,
        `🏭 ${data.facilityName}`,
        `${emoji(data.commodityCategory)} ${data.commodityCategoryLabel} — *${data.commodityName}*`,
        `⚖️ ${data.estimatedWeightKg?.toLocaleString('en-IN')} Kg`,
        `📅 ${dateStr}`,
        ``,
        `Reply *CONFIRM* to book or *CANCEL* to discard`,
      ].join('\n');

      await whatsappService.sendText(phone, summary);

      await sessionManager.updateFlow(phone, 'BOOKING', 5, {
        ...data,
        preferredDate: isoDate,
        preferredDateDisplay: dateStr,
      });
      break;
    }

    // ── Step 5: User confirms ──
    case 5: {
      const lower = message.toLowerCase().trim();

      if (lower === 'cancel') {
        await whatsappService.sendText(phone, '❌ Booking cancelled.\n\nReply *menu* for options.');
        await sessionManager.clearFlow(phone);
        return;
      }

      if (lower !== 'confirm' && lower !== 'yes') {
        await whatsappService.sendText(phone, 'Reply *CONFIRM* to proceed or *CANCEL* to discard.');
        return;
      }

      // Find the user linked to this phone
      const user = await sessionManager.findLinkedUser(phone);
      if (!user) {
        await whatsappService.sendText(
          phone,
          '⚠️ Your phone number is not registered on SheetKosh.\nPlease register on our app first, then try again.\n\nReply *menu* for options.'
        );
        await sessionManager.clearFlow(phone);
        return;
      }

      try {
        // Generate booking number
        const today = new Date();
        const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
        const count = await prisma.booking.count({
          where: { createdAt: { gte: new Date(today.toISOString().split('T')[0]) } },
        });
        const bookingNumber = `BK-WA-${dateStr}-${String(count + 1).padStart(3, '0')}`;

        // Create booking via Prisma
        const booking = await prisma.booking.create({
          data: {
            bookingNumber,
            farmer: { connect: { id: user.id } },
            facility: { connect: { id: data.facilityId } },
            commodityCategory: data.commodityCategory,
            commodityName: data.commodityName,
            estimatedWeightKg: data.estimatedWeightKg,
            preferredDate: new Date(data.preferredDate),
            status: 'PENDING',
          },
        });

        // Fetch facility name separately
        const facility = await prisma.facility.findUnique({
          where: { id: data.facilityId },
          select: { name: true, city: true },
        });

        const successMsg = [
          `✅ *Booking Created Successfully!*`,
          ``,
          `📦 *#${booking.bookingNumber}*`,
          `🏭 ${facility?.name || data.facilityName}`,
          `📍 ${facility?.city || ''}`,
          `${emoji(data.commodityCategory)} ${data.commodityName} — ${data.estimatedWeightKg?.toLocaleString('en-IN')} Kg`,
          `📅 ${data.preferredDateDisplay}`,
          ``,
          `Status: 🟡 *PENDING* (awaiting owner confirmation)`,
          ``,
          `📱 Show your booking QR at the facility gate.`,
          `You'll be notified when the owner confirms.`,
          ``,
          `Reply *menu* for more options`,
        ].join('\n');

        await whatsappService.sendText(phone, successMsg);
      } catch (err: any) {
        console.error('[WhatsApp] Booking creation failed:', err);
        await whatsappService.sendText(
          phone,
          `❌ *Booking failed*\n${err.message || 'Something went wrong.'}\n\nPlease try again.\nReply *menu* for options.`
        );
      }

      await sessionManager.clearFlow(phone);
      break;
    }

    default:
      await whatsappService.sendText(phone, '❌ Something went wrong. Reply *menu* to start over.');
      await sessionManager.clearFlow(phone);
  }
}
