/**
 * Booking Flow — Multi-step cold storage booking via WhatsApp
 * Premium bilingual design with robust error handling
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
import { t, Lang } from '../language';

const CATEGORIES = [
  { key: 'POTATO', label: 'Potato', labelHi: 'आलू' },
  { key: 'ONION', label: 'Onion', labelHi: 'प्याज' },
  { key: 'VEGETABLES', label: 'Vegetables', labelHi: 'सब्ज़ियाँ' },
  { key: 'FRUITS', label: 'Fruits', labelHi: 'फल' },
  { key: 'DAIRY', label: 'Dairy', labelHi: 'डेयरी' },
  { key: 'SEEDS', label: 'Seeds', labelHi: 'बीज' },
  { key: 'OTHER', label: 'Other', labelHi: 'अन्य' },
];

export async function startBookingFlow(phone: string, lang: Lang = 'en'): Promise<void> {
  try {
    console.log(`[WhatsApp][Booking] Starting booking flow for ${phone}, lang=${lang}`);

    // Fetch active facilities
    const facilities = await prisma.facility.findMany({
      where: { status: 'ACTIVE' as any },
      select: { id: true, name: true, city: true, state: true, totalCapacityMt: true },
      take: 10,
      orderBy: { name: 'asc' },
    });

    console.log(`[WhatsApp][Booking] Found ${facilities.length} facilities`);

    if (facilities.length === 0) {
      await whatsappService.sendText(phone,
        lang === 'hi'
          ? `*कोल्ड स्टोरेज बुक करें*\n━━━━━━━━━━━━━━━━━━━━━━\n\nअभी कोई कोल्ड स्टोरेज उपलब्ध नहीं है।\n\n_*menu* भेजें_`
          : `*Book Cold Storage*\n━━━━━━━━━━━━━━━━━━━━━━\n\nNo facilities available right now.\n\n_Send *menu* to go back_`
      );
      return;
    }

    // Format facility list
    const facilityList = facilities.map((f, i) =>
      `▸ *${i + 1}*  ${f.name}\n     ${f.city || ''}, ${f.state || ''}${f.totalCapacityMt ? ` · ${f.totalCapacityMt} MT` : ''}`
    ).join('\n\n');

    const header = lang === 'hi'
      ? `*कोल्ड स्टोरेज बुक करें*\n━━━━━━━━━━━━━━━━━━━━━━\n\nसुविधा चुनें:\n\n`
      : `*Book Cold Storage*\n━━━━━━━━━━━━━━━━━━━━━━\n\nSelect a facility:\n\n`;

    const footer = lang === 'hi'
      ? `\n\n━━━━━━━━━━━━━━━━━━━━━━\n_नंबर भेजें (जैसे 1)_`
      : `\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Reply with number (e.g. 1)_`;

    await whatsappService.sendText(phone, `${header}${facilityList}${footer}`);

    await sessionManager.updateFlow(phone, 'BOOKING', 0, {
      lang,
      facilities: facilities.map(f => ({ id: f.id, name: f.name })),
    });

    console.log(`[WhatsApp][Booking] Facility list sent, flow set to BOOKING step 0`);
  } catch (err) {
    console.error('[WhatsApp][Booking] startBookingFlow error:', err);
    await whatsappService.sendText(phone,
      lang === 'hi'
        ? `कुछ गलत हो गया। कृपया पुनः प्रयास करें।\n\n_*menu* भेजें_`
        : `Something went wrong. Please try again.\n\n_Send *menu* for options_`
    );
  }
}

export async function handleBookingStep(phone: string, message: string, session: any): Promise<void> {
  const step = session.flowStep;
  const data = session.flowData || {};
  const lang: Lang = data.lang || 'en';

  try {
    switch (step) {
      // ── Step 0: User selects facility ──
      case 0: {
        const idx = parseInt(message) - 1;
        if (isNaN(idx) || idx < 0 || idx >= (data.facilities?.length || 0)) {
          await whatsappService.sendText(phone,
            lang === 'hi'
              ? `अमान्य चयन। कृपया सही नंबर भेजें।`
              : `Invalid selection. Please reply with a valid number.`
          );
          return;
        }

        const facility = data.facilities[idx];
        const categoryList = CATEGORIES.map((c, i) => {
          const label = lang === 'hi' ? c.labelHi : c.label;
          return `▸ *${i + 1}*  ${label}`;
        }).join('\n');

        await whatsappService.sendText(phone,
          lang === 'hi'
            ? `Selected: *${facility.name}*\n\n*आप क्या स्टोर कर रहे हैं?*\n\n${categoryList}\n\n━━━━━━━━━━━━━━━━━━━━━━\n_नंबर भेजें_`
            : `Selected: *${facility.name}*\n\n*What are you storing?*\n\n${categoryList}\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Reply with number_`
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
          await whatsappService.sendText(phone,
            lang === 'hi' ? `अमान्य चयन। 1-7 में से भेजें।` : `Invalid selection. Reply with 1-7.`
          );
          return;
        }

        const category = CATEGORIES[idx];
        const label = lang === 'hi' ? category.labelHi : category.label;
        await whatsappService.sendText(phone,
          lang === 'hi'
            ? `श्रेणी: *${label}*\n\n*फसल का नाम लिखें*\n(जैसे, आलू चंद्रमुखी, प्याज लाल)\n\n━━━━━━━━━━━━━━━━━━━━━━\n_नाम टाइप करें:_`
            : `Category: *${label}*\n\n*Enter commodity name*\n(e.g., Aloo Chandramukhi, Pyaaz Red)\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Type the name:_`
        );

        await sessionManager.updateFlow(phone, 'BOOKING', 2, {
          ...data,
          commodityCategory: category.key,
          commodityCategoryLabel: lang === 'hi' ? category.labelHi : category.label,
        });
        break;
      }

      // ── Step 2: User enters commodity name ──
      case 2: {
        const name = message.trim();
        if (name.length < 2) {
          await whatsappService.sendText(phone,
            lang === 'hi' ? `नाम बहुत छोटा है। कृपया सही नाम दर्ज करें।` : `Name too short. Please enter a valid commodity name.`
          );
          return;
        }

        await whatsappService.sendText(phone,
          lang === 'hi'
            ? `फसल: *${name}*\n\n*अनुमानित वज़न किलो में दर्ज करें:*\n(जैसे, 5000)\n\n━━━━━━━━━━━━━━━━━━━━━━`
            : `Commodity: *${name}*\n\n*Enter estimated weight in Kg:*\n(e.g., 5000)\n\n━━━━━━━━━━━━━━━━━━━━━━`
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
          await whatsappService.sendText(phone,
            lang === 'hi' ? `कृपया सही वज़न दर्ज करें (1 – 1,00,000 Kg)` : `Please enter a valid weight (1 – 100,000 Kg).`
          );
          return;
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tmrStr = tomorrow.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        await whatsappService.sendText(phone,
          lang === 'hi'
            ? `वज़न: *${weight.toLocaleString('en-IN')} Kg*\n\n*तारीख दर्ज करें:*\nFormat: DD/MM/YYYY\n\nया भेजें:\n▸ *tomorrow* — ${tmrStr}\n▸ *3days* — 3 दिन बाद\n▸ *week* — 1 सप्ताह बाद\n\n━━━━━━━━━━━━━━━━━━━━━━`
            : `Weight: *${weight.toLocaleString('en-IN')} Kg*\n\n*Enter preferred date:*\nFormat: DD/MM/YYYY\n\nOr reply:\n▸ *tomorrow* — ${tmrStr}\n▸ *3days* — In 3 days\n▸ *week* — In 1 week\n\n━━━━━━━━━━━━━━━━━━━━━━`
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

        if (['tomorrow', 'kal', 'कल'].includes(lower)) {
          date = new Date();
          date.setDate(date.getDate() + 1);
        } else if (['3days', '3din', '3 din'].includes(lower)) {
          date = new Date();
          date.setDate(date.getDate() + 3);
        } else if (['week', 'hafta', 'हफ्ता'].includes(lower)) {
          date = new Date();
          date.setDate(date.getDate() + 7);
        } else {
          // Parse DD/MM/YYYY
          const parts = message.trim().split(/[\/\-\.]/);
          if (parts.length === 3) {
            const [day, month, year] = parts.map(Number);
            date = new Date(year, month - 1, day);
          } else {
            await whatsappService.sendText(phone,
              lang === 'hi' ? `अमान्य तारीख। DD/MM/YYYY या *tomorrow* भेजें।` : `Invalid date. Use DD/MM/YYYY or reply *tomorrow*.`
            );
            return;
          }
        }

        if (isNaN(date.getTime())) {
          await whatsappService.sendText(phone,
            lang === 'hi' ? `अमान्य तारीख। कृपया पुनः प्रयास करें।` : `Invalid date. Please try again.`
          );
          return;
        }

        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const isoDate = date.toISOString().split('T')[0];

        // Show summary
        const summary = lang === 'hi'
          ? `*बुकिंग सारांश*\n━━━━━━━━━━━━━━━━━━━━━━\n\nसुविधा    *${data.facilityName}*\nफसल       *${data.commodityCategoryLabel}* — ${data.commodityName}\nवज़न        ${data.estimatedWeightKg?.toLocaleString('en-IN')} Kg\nतारीख      ${dateStr}\n\n━━━━━━━━━━━━━━━━━━━━━━\n*CONFIRM* भेजें बुक करने के लिए\n*CANCEL* भेजें रद्द करने के लिए`
          : `*Booking Summary*\n━━━━━━━━━━━━━━━━━━━━━━\n\nFacility     *${data.facilityName}*\nCommodity    *${data.commodityCategoryLabel}* — ${data.commodityName}\nWeight       ${data.estimatedWeightKg?.toLocaleString('en-IN')} Kg\nDate         ${dateStr}\n\n━━━━━━━━━━━━━━━━━━━━━━\nReply *CONFIRM* to book\nReply *CANCEL* to discard`;

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

        if (['cancel', 'रद्द', 'no', 'nahi'].includes(lower)) {
          await whatsappService.sendText(phone,
            lang === 'hi' ? `बुकिंग रद्द की गई।\n\n_*menu* भेजें_` : `Booking cancelled.\n\n_Send *menu* for options_`
          );
          await sessionManager.clearFlow(phone);
          return;
        }

        if (!['confirm', 'yes', 'haan', 'हाँ', 'ok'].includes(lower)) {
          await whatsappService.sendText(phone,
            lang === 'hi' ? `*CONFIRM* भेजें आगे बढ़ने के लिए या *CANCEL* रद्द करने के लिए।` : `Reply *CONFIRM* to proceed or *CANCEL* to discard.`
          );
          return;
        }

        // Find the user linked to this phone
        const user = await sessionManager.findLinkedUser(phone);
        if (!user) {
          await whatsappService.sendText(phone,
            lang === 'hi'
              ? `*खाता नहीं मिला*\n\nआपका नंबर रजिस्टर्ड नहीं है।\nपहले ऐप पर रजिस्टर करें।\n\n_*menu* भेजें_`
              : `*Account Not Found*\n\nYour phone is not registered.\nPlease register on the app first.\n\n_Send *menu* for options_`
          );
          await sessionManager.clearFlow(phone);
          return;
        }

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

        const successMsg = lang === 'hi'
          ? `*बुकिंग अनुरोध भेजा गया!*\n━━━━━━━━━━━━━━━━━━━━━━\n\nसुविधा       ${data.facilityName}\nफसल          ${data.commodityName} — ${data.estimatedWeightKg?.toLocaleString('en-IN')} Kg\nतारीख        ${data.preferredDateDisplay}\n\nस्थिति        🟡 *PENDING*\n\n⏳ आपका अनुरोध *${data.facilityName}* को भेज दिया गया है।\n\nमालिक की मंजूरी के बाद आपको बुकिंग नंबर और QR कोड WhatsApp पर भेजा जाएगा।\n\n━━━━━━━━━━━━━━━━━━━━━━\n_*menu* भेजें_`
          : `*Booking Request Sent!*\n━━━━━━━━━━━━━━━━━━━━━━\n\nFacility      ${data.facilityName}\nCommodity   ${data.commodityName} — ${data.estimatedWeightKg?.toLocaleString('en-IN')} Kg\nDate          ${data.preferredDateDisplay}\n\nStatus       🟡 *PENDING*\n\n⏳ Your request has been sent to *${data.facilityName}*.\n\nYou'll receive your booking number and QR code on WhatsApp once the owner approves your booking.\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Send *menu* for options_`;

        await whatsappService.sendText(phone, successMsg);
        await sessionManager.clearFlow(phone);
        break;
      }

      default:
        await whatsappService.sendText(phone,
          lang === 'hi' ? `कुछ गलत हो गया। *menu* भेजें।` : `Something went wrong. Send *menu* to start over.`
        );
        await sessionManager.clearFlow(phone);
    }
  } catch (err) {
    console.error('[WhatsApp][Booking] handleBookingStep error at step', step, ':', err);
    await whatsappService.sendText(phone,
      lang === 'hi'
        ? `कुछ गलत हो गया। कृपया पुनः प्रयास करें।\n\n_*menu* भेजें_`
        : `Something went wrong. Please try again.\n\n_Send *menu* for options_`
    );
    await sessionManager.clearFlow(phone);
  }
}
