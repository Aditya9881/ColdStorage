/**
 * Internationalization (i18n) — ColdStorage Mobile
 *
 * Supports Hindi (hi) and English (en).
 * Uses device locale detection with manual override.
 */
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { storage } from './storage';

export type Locale = 'en' | 'hi';

// ── Translation strings ──
const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.apply': 'Apply',
    'common.reset': 'Reset',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.kg': 'kg',
    'common.perKg': '/kg',

    // Auth
    'auth.login': 'Login',
    'auth.register': 'Create Account',
    'auth.logout': 'Logout',
    'auth.phone': 'Phone Number',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.email': 'Email Address',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.farmer': 'Farmer',
    'auth.buyer': 'Buyer',
    'auth.selectRole': 'I am a...',
    'auth.loginSubtitle': 'Enter your credentials to continue',
    'auth.registerSubtitle': 'Create your account to get started',

    // KYC
    'kyc.aadhaar': 'Aadhaar Number',
    'kyc.pan': 'PAN Number',
    'kyc.gst': 'GST Number',
    'kyc.address': 'Address',
    'kyc.city': 'City',
    'kyc.state': 'State',
    'kyc.pincode': 'Pincode',
    'kyc.district': 'District',
    'kyc.landHolding': 'Land Holding (acres)',
    'kyc.khasra': 'Khasra Number',
    'kyc.village': 'Village Name',
    'kyc.businessName': 'Business Name',
    'kyc.businessType': 'Business Type',
    'kyc.personalDetails': 'Personal Details',
    'kyc.addressDetails': 'Address Details',
    'kyc.verification': 'Verification Documents',
    'kyc.farmerDetails': 'Farmer Details',
    'kyc.buyerDetails': 'Business Details',

    // Dashboard (Farmer)
    'dashboard.greeting': 'Hello',
    'dashboard.overview': 'Here is your real-time storage overview',
    'dashboard.totalLots': 'Total Lots',
    'dashboard.storedWeight': 'Stored Weight',
    'dashboard.totalRent': 'Total Rent',
    'dashboard.activeLots': 'Active Lots',
    'dashboard.alerts': 'Alerts',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.viewFacility': 'View Facility',
    'dashboard.addLot': 'Add New Lot',
    'dashboard.marketPrices': 'Market Prices',
    'dashboard.myOrders': 'My Orders',

    // Discover
    'discover.title': 'ColdStore Connect',
    'discover.subtitle': 'India\'s Trusted Cold Storage Marketplace',
    'discover.searchPlaceholder': 'Search commodities, facilities...',
    'discover.nearYou': 'Near You',
    'discover.topFacilities': 'Top Facilities',
    'discover.allCommodities': 'All Commodities',
    'discover.loginPrompt': 'Login to access full features',

    // Facility
    'facility.details': 'Facility Details',
    'facility.chambers': 'Chambers',
    'facility.capacity': 'Capacity',
    'facility.temperature': 'Temperature',
    'facility.humidity': 'Humidity',
    'facility.operational': 'Operational',
    'facility.maintenance': 'Maintenance',
    'facility.contact': 'Contact Facility',

    // Marketplace (Buyer)
    'marketplace.title': 'Marketplace',
    'marketplace.browse': 'Browse Listings',
    'marketplace.watchlist': 'Watchlist',
    'marketplace.orders': 'Orders',
    'marketplace.profile': 'Profile',
    'marketplace.placeOrder': 'Place Order',
    'marketplace.bidNow': 'Bid Now',

    // Orders
    'orders.title': 'Orders',
    'orders.pending': 'Pending',
    'orders.confirmed': 'Confirmed',
    'orders.inTransit': 'In Transit',
    'orders.delivered': 'Delivered',
    'orders.cancelled': 'Cancelled',
    'orders.total': 'Total',
    'orders.escrow': 'Escrow Protected',

    // Notifications
    'notifications.title': 'Notifications',
    'notifications.tempAlert': 'Temperature Alert',
    'notifications.orderUpdate': 'Order Update',
    'notifications.priceAlert': 'Price Alert',
    'notifications.markAllRead': 'Mark All Read',
    'notifications.empty': 'No notifications yet',

    // Profile
    'profile.title': 'Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.settings': 'Settings',
    'profile.language': 'Language',
    'profile.notifications': 'Notifications',
    'profile.help': 'Help & Support',
    'profile.about': 'About',
    'profile.verified': 'Verified',
    'profile.pendingVerification': 'Pending Verification',
  },

  hi: {
    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'कुछ गलत हो गया',
    'common.retry': 'पुनः प्रयास करें',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.sort': 'क्रमबद्ध करें',
    'common.apply': 'लागू करें',
    'common.reset': 'रीसेट करें',
    'common.confirm': 'पुष्टि करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.done': 'हो गया',
    'common.yes': 'हां',
    'common.no': 'नहीं',
    'common.ok': 'ठीक है',
    'common.kg': 'किलो',
    'common.perKg': '/किलो',

    // Auth
    'auth.login': 'लॉगिन करें',
    'auth.register': 'खाता बनाएं',
    'auth.logout': 'लॉगआउट',
    'auth.phone': 'फ़ोन नंबर',
    'auth.password': 'पासवर्ड',
    'auth.fullName': 'पूरा नाम',
    'auth.email': 'ईमेल पता',
    'auth.forgotPassword': 'पासवर्ड भूल गए?',
    'auth.noAccount': 'खाता नहीं है?',
    'auth.hasAccount': 'पहले से खाता है?',
    'auth.farmer': 'किसान',
    'auth.buyer': 'खरीदार',
    'auth.selectRole': 'मैं हूं...',
    'auth.loginSubtitle': 'जारी रखने के लिए अपना विवरण दर्ज करें',
    'auth.registerSubtitle': 'शुरू करने के लिए अपना खाता बनाएं',

    // KYC
    'kyc.aadhaar': 'आधार नंबर',
    'kyc.pan': 'पैन नंबर',
    'kyc.gst': 'जीएसटी नंबर',
    'kyc.address': 'पता',
    'kyc.city': 'शहर',
    'kyc.state': 'राज्य',
    'kyc.pincode': 'पिनकोड',
    'kyc.district': 'जिला',
    'kyc.landHolding': 'भूमि (एकड़)',
    'kyc.khasra': 'खसरा नंबर',
    'kyc.village': 'गांव का नाम',
    'kyc.businessName': 'व्यापार का नाम',
    'kyc.businessType': 'व्यापार का प्रकार',
    'kyc.personalDetails': 'व्यक्तिगत विवरण',
    'kyc.addressDetails': 'पता विवरण',
    'kyc.verification': 'सत्यापन दस्तावेज़',
    'kyc.farmerDetails': 'किसान विवरण',
    'kyc.buyerDetails': 'व्यापार विवरण',

    // Dashboard (Farmer)
    'dashboard.greeting': 'नमस्ते',
    'dashboard.overview': 'आपका रियल-टाइम स्टोरेज अवलोकन',
    'dashboard.totalLots': 'कुल लॉट',
    'dashboard.storedWeight': 'संग्रहित वजन',
    'dashboard.totalRent': 'कुल किराया',
    'dashboard.activeLots': 'सक्रिय लॉट',
    'dashboard.alerts': 'चेतावनी',
    'dashboard.quickActions': 'त्वरित कार्य',
    'dashboard.viewFacility': 'सुविधा देखें',
    'dashboard.addLot': 'नया लॉट जोड़ें',
    'dashboard.marketPrices': 'बाज़ार भाव',
    'dashboard.myOrders': 'मेरे ऑर्डर',

    // Discover
    'discover.title': 'कोल्डस्टोर कनेक्ट',
    'discover.subtitle': 'भारत का विश्वसनीय कोल्ड स्टोरेज मार्केटप्लेस',
    'discover.searchPlaceholder': 'वस्तुएं, सुविधाएं खोजें...',
    'discover.nearYou': 'आपके पास',
    'discover.topFacilities': 'शीर्ष सुविधाएं',
    'discover.allCommodities': 'सभी वस्तुएं',
    'discover.loginPrompt': 'पूर्ण सुविधाओं के लिए लॉगिन करें',

    // Facility
    'facility.details': 'सुविधा विवरण',
    'facility.chambers': 'चैम्बर',
    'facility.capacity': 'क्षमता',
    'facility.temperature': 'तापमान',
    'facility.humidity': 'नमी',
    'facility.operational': 'चालू',
    'facility.maintenance': 'रखरखाव',
    'facility.contact': 'सुविधा से संपर्क करें',

    // Marketplace (Buyer)
    'marketplace.title': 'बाज़ार',
    'marketplace.browse': 'लिस्टिंग देखें',
    'marketplace.watchlist': 'वॉचलिस्ट',
    'marketplace.orders': 'ऑर्डर',
    'marketplace.profile': 'प्रोफ़ाइल',
    'marketplace.placeOrder': 'ऑर्डर दें',
    'marketplace.bidNow': 'बोली लगाएं',

    // Orders
    'orders.title': 'ऑर्डर',
    'orders.pending': 'लंबित',
    'orders.confirmed': 'पुष्टि हो गई',
    'orders.inTransit': 'रास्ते में',
    'orders.delivered': 'डिलीवर हो गया',
    'orders.cancelled': 'रद्द',
    'orders.total': 'कुल',
    'orders.escrow': 'एस्क्रो संरक्षित',

    // Notifications
    'notifications.title': 'सूचनाएं',
    'notifications.tempAlert': 'तापमान चेतावनी',
    'notifications.orderUpdate': 'ऑर्डर अपडेट',
    'notifications.priceAlert': 'मूल्य चेतावनी',
    'notifications.markAllRead': 'सब पढ़ा हुआ करें',
    'notifications.empty': 'अभी कोई सूचना नहीं',

    // Profile
    'profile.title': 'प्रोफ़ाइल',
    'profile.editProfile': 'प्रोफ़ाइल संपादित करें',
    'profile.settings': 'सेटिंग्स',
    'profile.language': 'भाषा',
    'profile.notifications': 'सूचनाएं',
    'profile.help': 'सहायता और समर्थन',
    'profile.about': 'हमारे बारे में',
    'profile.verified': 'सत्यापित',
    'profile.pendingVerification': 'सत्यापन लंबित',
  },
};

// ── i18n Engine ──
let currentLocale: Locale = 'en';

/**
 * Initialize i18n — detects device locale or loads saved preference
 */
export async function initI18n(): Promise<Locale> {
  // Check saved preference first
  const saved = await storage.getItem('app_locale');
  if (saved === 'hi' || saved === 'en') {
    currentLocale = saved;
    return currentLocale;
  }

  // Auto-detect from device
  const deviceLocales = Localization.getLocales();
  if (deviceLocales.length > 0) {
    const lang = deviceLocales[0].languageCode;
    if (lang === 'hi') {
      currentLocale = 'hi';
    }
  }

  return currentLocale;
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set locale and persist
 */
export async function setLocale(locale: Locale): Promise<void> {
  currentLocale = locale;
  await storage.setItem('app_locale', locale);
}

/**
 * Translate a key
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[currentLocale]?.[key] || translations.en[key] || key;

  // Replace {{param}} placeholders
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{{${k}}}`, String(v));
    }
  }

  return text;
}

/**
 * Get all available locales for UI picker
 */
export function getAvailableLocales(): { code: Locale; name: string; nativeName: string }[] {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ];
}
