/**
 * Language System — Hindi/English Bilingual Support
 *
 * All WhatsApp bot messages in both languages.
 * Premium, modern formatting — clean dividers, minimal emojis.
 */

export type Lang = 'en' | 'hi';

/** All translatable strings */
const STRINGS = {

  // ── Language Selection ──
  langPrompt: {
    en: `*Choose Your Language*\n\nPlease select your preferred language:\n\n▸ Reply *1* for English\n▸ Reply *2* हिंदी के लिए\n\n━━━━━━━━━━━━━━━━`,
    hi: `*अपनी भाषा चुनें*\n\nकृपया अपनी पसंदीदा भाषा चुनें:\n\n▸ Reply *1* for English\n▸ *2* हिंदी के लिए\n\n━━━━━━━━━━━━━━━━`,
  },
  langSet: {
    en: '✓ Language set to *English*',
    hi: '✓ भाषा *हिंदी* में सेट की गई',
  },

  // ── Welcome / Main Menu ──
  welcome: {
    en: (name?: string) =>
      `*SheetKosh*  ·  Cold Storage Platform\n━━━━━━━━━━━━━━━━━━━━━━\n${name ? `Hello, *${name}* 👋\n\n` : ''}What would you like to do?\n\n` +
      `▸ *1*  Book Storage\n` +
      `▸ *2*  My Bookings\n` +
      `▸ *3*  Mandi Prices\n` +
      `▸ *4*  Booking Status\n` +
      `▸ *5*  Request Dispatch\n` +
      `▸ *6*  My Profile\n` +
      `▸ *7*  Help\n` +
      `▸ *8*  भाषा बदलें / Change Language\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n_Send a number to get started_`,
    hi: (name?: string) =>
      `*SheetKosh*  ·  कोल्ड स्टोरेज प्लेटफॉर्म\n━━━━━━━━━━━━━━━━━━━━━━\n${name ? `नमस्ते, *${name}* 🙏\n\n` : ''}आप क्या करना चाहेंगे?\n\n` +
      `▸ *1*  स्टोरेज बुक करें\n` +
      `▸ *2*  मेरी बुकिंग\n` +
      `▸ *3*  मंडी भाव\n` +
      `▸ *4*  बुकिंग स्थिति\n` +
      `▸ *5*  डिस्पैच अनुरोध\n` +
      `▸ *6*  मेरी प्रोफाइल\n` +
      `▸ *7*  सहायता\n` +
      `▸ *8*  Change Language / भाषा बदलें\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n_कोई नंबर भेजें_`,
  },

  // ── Help ──
  help: {
    en:
      `*SheetKosh — Help Center*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Quick Commands:*\n` +
      `▸ *menu* — Main menu\n` +
      `▸ *1-7* — Select an option\n` +
      `▸ *book* — Book storage\n` +
      `▸ *prices* — Mandi prices\n` +
      `▸ *BK-XXX* — Track booking\n` +
      `▸ *cancel* — Exit current flow\n` +
      `▸ *lang* — Change language\n\n` +
      `*Price Queries:*\n` +
      `▸ Send *potato price* or *onion rate*\n\n` +
      `*Support:*\n` +
      `▸ Call: 1800-XXX-XXXX\n` +
      `▸ Email: support@sheetkosh.com\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
    hi:
      `*SheetKosh — सहायता केंद्र*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*त्वरित कमांड:*\n` +
      `▸ *menu* — मुख्य मेनू\n` +
      `▸ *1-7* — विकल्प चुनें\n` +
      `▸ *book* — स्टोरेज बुक करें\n` +
      `▸ *prices* — मंडी भाव\n` +
      `▸ *BK-XXX* — बुकिंग ट्रैक करें\n` +
      `▸ *cancel* — वर्तमान प्रक्रिया रद्द करें\n` +
      `▸ *lang* — भाषा बदलें\n\n` +
      `*भाव जानें:*\n` +
      `▸ भेजें *aloo bhav* या *pyaaz rate*\n\n` +
      `*सहायता:*\n` +
      `▸ कॉल: 1800-XXX-XXXX\n` +
      `▸ ईमेल: support@sheetkosh.com\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
  },

  // ── Profile ──
  notRegistered: {
    en: `*Account Not Found*\n━━━━━━━━━━━━━━━━━━━━━━\n\nYour number is not linked to SheetKosh yet.\n\nRegister on our app to unlock:\n▸ Storage booking\n▸ Booking management\n▸ Dispatch requests\n\nVisit: *sheetkosh.com*\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Send *menu* to go back_`,
    hi: `*खाता नहीं मिला*\n━━━━━━━━━━━━━━━━━━━━━━\n\nआपका नंबर SheetKosh से जुड़ा नहीं है।\n\nहमारे ऐप पर रजिस्टर करें:\n▸ स्टोरेज बुकिंग\n▸ बुकिंग प्रबंधन\n▸ डिस्पैच अनुरोध\n\nविज़िट करें: *sheetkosh.com*\n\n━━━━━━━━━━━━━━━━━━━━━━\n_*menu* भेजें_`,
  },
  profileCard: {
    en: (u: any) =>
      `*Your Profile*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Name      *${u.fullName || u.name || '—'}*\n` +
      `Phone     ${u.phone}\n` +
      `Email     ${u.email || '—'}\n` +
      `Role        ${u.role}\n` +
      `${u.city ? `City         ${u.city}` : ''}\n` +
      `${u.state ? `State       ${u.state}` : ''}\n\n` +
      `Joined    ${new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n_Send *menu* for main menu_`,
    hi: (u: any) =>
      `*आपकी प्रोफ़ाइल*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `नाम       *${u.fullName || u.name || '—'}*\n` +
      `फ़ोन       ${u.phone}\n` +
      `ईमेल       ${u.email || '—'}\n` +
      `भूमिका     ${u.role}\n` +
      `${u.city ? `शहर        ${u.city}` : ''}\n` +
      `${u.state ? `राज्य       ${u.state}` : ''}\n\n` +
      `शामिल     ${new Date(u.createdAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n_*menu* भेजें_`,
  },

  // ── Booking ──
  selectFacility: {
    en: `*Book Cold Storage*\n━━━━━━━━━━━━━━━━━━━━━━\n\nSelect a facility:\n\n`,
    hi: `*कोल्ड स्टोरेज बुक करें*\n━━━━━━━━━━━━━━━━━━━━━━\n\nसुविधा चुनें:\n\n`,
  },
  facilityItem: {
    en: (f: any, i: number) => `▸ *${i + 1}*  ${f.name}\n     ${f.city || ''}, ${f.state || ''}${f.totalCapacityMt ? ` · ${f.totalCapacityMt} MT` : ''}`,
    hi: (f: any, i: number) => `▸ *${i + 1}*  ${f.name}\n     ${f.city || ''}, ${f.state || ''}${f.totalCapacityMt ? ` · ${f.totalCapacityMt} MT` : ''}`,
  },
  selectPrompt: {
    en: `\n━━━━━━━━━━━━━━━━━━━━━━\n_Reply with number (e.g. 1)_`,
    hi: `\n━━━━━━━━━━━━━━━━━━━━━━\n_नंबर भेजें (जैसे 1)_`,
  },
  noFacilities: {
    en: `No cold storage facilities available right now.\n\n_Send *menu* to go back_`,
    hi: `अभी कोई कोल्ड स्टोरेज उपलब्ध नहीं है।\n\n_*menu* भेजें_`,
  },

  // ── Mandi Prices ──
  mandiHeader: {
    en: (commodity?: string) => commodity
      ? `*Mandi Prices — ${commodity}*\n━━━━━━━━━━━━━━━━━━━━━━`
      : `*Today's Mandi Prices*\n━━━━━━━━━━━━━━━━━━━━━━`,
    hi: (commodity?: string) => commodity
      ? `*मंडी भाव — ${commodity}*\n━━━━━━━━━━━━━━━━━━━━━━`
      : `*आज के मंडी भाव*\n━━━━━━━━━━━━━━━━━━━━━━`,
  },
  mandiFooter: {
    en: `\n━━━━━━━━━━━━━━━━━━━━━━\nFilter: Send *potato price*, *onion rate*, etc.\n\n_Send *menu* for main menu_`,
    hi: `\n━━━━━━━━━━━━━━━━━━━━━━\nफ़िल्टर: भेजें *aloo bhav*, *pyaaz rate*, आदि\n\n_*menu* भेजें_`,
  },
  noMandiPrices: {
    en: (commodity?: string) => commodity
      ? `No prices found for *${commodity}* today.\n\nTry: *potato*, *onion*, *apple*, *tomato*\n\n_Send *menu* for options_`
      : `No mandi prices available right now.\n\n_Send *menu* for options_`,
    hi: (commodity?: string) => commodity
      ? `*${commodity}* के लिए आज कोई भाव नहीं मिला।\n\nकोशिश करें: *aloo*, *pyaaz*, *tamatar*\n\n_*menu* भेजें_`
      : `अभी कोई मंडी भाव उपलब्ध नहीं है।\n\n_*menu* भेजें_`,
  },

  // ── Booking Status ──
  enterBookingNumber: {
    en: `*Check Booking Status*\n━━━━━━━━━━━━━━━━━━━━━━\n\nEnter your booking number:\n▸ Example: _BK-PCS-260720-001_\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Send *menu* to go back_`,
    hi: `*बुकिंग स्थिति जाँचें*\n━━━━━━━━━━━━━━━━━━━━━━\n\nअपना बुकिंग नंबर दर्ज करें:\n▸ उदाहरण: _BK-PCS-260720-001_\n\n━━━━━━━━━━━━━━━━━━━━━━\n_*menu* भेजें_`,
  },

  // ── Common ──
  cancelled: {
    en: `Done. Send *menu* for options.`,
    hi: `हो गया। *menu* भेजें।`,
  },
  error: {
    en: `Something went wrong. Please try again.\n\n_Send *menu* for options_`,
    hi: `कुछ गलत हो गया। कृपया पुनः प्रयास करें।\n\n_*menu* भेजें_`,
  },
  fallback: {
    en:
      `I didn't quite get that.\n\n` +
      `Try:\n` +
      `▸ Send *1-7* for menu options\n` +
      `▸ Send *menu* for full menu\n` +
      `▸ Send *help* for all commands`,
    hi:
      `मैं समझ नहीं पाया।\n\n` +
      `कोशिश करें:\n` +
      `▸ *1-7* भेजें विकल्प के लिए\n` +
      `▸ *menu* भेजें मुख्य मेनू के लिए\n` +
      `▸ *help* भेजें सहायता के लिए`,
  },
  mandiPriceError: {
    en: `Unable to fetch mandi prices right now.\n\n_Send *menu* for options_`,
    hi: `अभी मंडी भाव प्राप्त नहीं हो पा रहे।\n\n_*menu* भेजें_`,
  },
};

/** Get a string in the given language */
export function t(key: keyof typeof STRINGS, lang: Lang = 'en'): any {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.['en'];
}

export default STRINGS;
