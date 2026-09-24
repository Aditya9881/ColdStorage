/**
 * Commodity Image Map — ColdStorage Mobile
 *
 * Maps common Indian agricultural commodity names to:
 * - emoji (fallback for loading/error states)
 * - bg color
 * - accent color for prices
 * - imageUrl (real photo from Unsplash via source.unsplash.com — no API key needed)
 *
 * The map uses fuzzy matching (lowercase, trimmed) so "potato" matches "Potato".
 * Fallback: generic produce icon with green background.
 */

export interface CommodityVisual {
  emoji: string;
  bg: string;       // background color for the image area
  accent: string;   // accent color for price text
  imageUrl: string;  // real commodity photo URL
  category: 'vegetable' | 'fruit' | 'grain' | 'spice' | 'flower' | 'other';
}

const COMMODITY_MAP: Record<string, CommodityVisual> = {
  // Vegetables
  potato:     { emoji: '🥔', bg: '#F5E6C8', accent: '#8B6914', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82ber4e?w=400&q=80' },
  onion:      { emoji: '🧅', bg: '#F8E8F0', accent: '#9B2D5B', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&q=80' },
  tomato:     { emoji: '🍅', bg: '#FFE5E5', accent: '#CC3333', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80' },
  brinjal:    { emoji: '🍆', bg: '#E8E0F0', accent: '#6B3FA0', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400&q=80' },
  cabbage:    { emoji: '🥬', bg: '#E5F5E0', accent: '#2D7A2D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400&q=80' },
  cauliflower:{ emoji: '🥦', bg: '#E8F5E8', accent: '#3D8B3D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80' },
  capsicum:   { emoji: '🫑', bg: '#E8F5E0', accent: '#4A8A1E', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1563565375-3b171085b4e0?w=400&q=80' },
  carrot:     { emoji: '🥕', bg: '#FFF0E0', accent: '#D97706', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80' },
  peas:       { emoji: '🫛', bg: '#E0F5E0', accent: '#2D8B2D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400&q=80' },
  beans:      { emoji: '🫘', bg: '#F0E8D8', accent: '#7A5C2D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1567375698348-5d9d5ae1f07c?w=400&q=80' },
  cucumber:   { emoji: '🥒', bg: '#E5F5E5', accent: '#3A7A3A', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400&q=80' },
  pumpkin:    { emoji: '🎃', bg: '#FFF5E0', accent: '#CC7A00', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400&q=80' },
  'bitter gourd': { emoji: '🥒', bg: '#E0F0E0', accent: '#3A7A3A', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&q=80' },
  'bottle gourd': { emoji: '🥒', bg: '#E5F5EA', accent: '#2D7A4D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&q=80' },
  'ridge gourd':  { emoji: '🥒', bg: '#E0F5E5', accent: '#3A8A4A', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&q=80' },
  okra:       { emoji: '🌿', bg: '#E5F0E5', accent: '#3A7A3A', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=400&q=80' },
  'lady finger': { emoji: '🌿', bg: '#E5F0E5', accent: '#3A7A3A', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=400&q=80' },
  radish:     { emoji: '🥕', bg: '#FFE8E8', accent: '#CC4444', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=400&q=80' },
  spinach:    { emoji: '🥬', bg: '#E0F5E0', accent: '#2D7A2D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80' },
  'green chilli': { emoji: '🌶️', bg: '#E0F5E0', accent: '#2D8B2D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400&q=80' },
  chilli:     { emoji: '🌶️', bg: '#FFE0E0', accent: '#CC3333', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400&q=80' },
  garlic:     { emoji: '🧄', bg: '#F8F0E8', accent: '#8B7A5C', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2f85?w=400&q=80' },
  ginger:     { emoji: '🫚', bg: '#FFF0D8', accent: '#B8860B', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  mushroom:   { emoji: '🍄', bg: '#F5EDE0', accent: '#8B6914', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=400&q=80' },
  'sweet potato': { emoji: '🍠', bg: '#F5E0D0', accent: '#9B4D1F', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1596097635092-6d8e3c3c5e10?w=400&q=80' },
  drumstick:  { emoji: '🌿', bg: '#E0F0E0', accent: '#3A7A3A', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80' },
  amaranthus: { emoji: '🌿', bg: '#E8F0E0', accent: '#4A7A2D', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80' },
  coriander:  { emoji: '🌿', bg: '#E0F5E0', accent: '#2D7A2D', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=400&q=80' },
  mint:       { emoji: '🌿', bg: '#E0F8E8', accent: '#1A7A4A', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&q=80' },

  // Fruits
  apple:      { emoji: '🍎', bg: '#FFE5E5', accent: '#CC3333', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=80' },
  banana:     { emoji: '🍌', bg: '#FFF8E0', accent: '#B8960B', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80' },
  mango:      { emoji: '🥭', bg: '#FFF5E0', accent: '#CC8800', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80' },
  grapes:     { emoji: '🍇', bg: '#F0E0F5', accent: '#7A3D8B', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&q=80' },
  orange:     { emoji: '🍊', bg: '#FFF0E0', accent: '#CC7700', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&q=80' },
  lemon:      { emoji: '🍋', bg: '#FFFDE0', accent: '#A89200', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&q=80' },
  lime:       { emoji: '🍋', bg: '#E8F8E0', accent: '#4A8A1E', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&q=80' },
  papaya:     { emoji: '🍈', bg: '#FFF5E8', accent: '#CC8844', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&q=80' },
  watermelon: { emoji: '🍉', bg: '#FFE5E8', accent: '#CC3344', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=400&q=80' },
  pomegranate:{ emoji: '🫐', bg: '#FFE0E5', accent: '#CC2244', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  guava:      { emoji: '🍐', bg: '#E8F5E0', accent: '#4A8A2D', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400&q=80' },
  coconut:    { emoji: '🥥', bg: '#F0EBE0', accent: '#7A6A4A', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=400&q=80' },
  pineapple:  { emoji: '🍍', bg: '#FFF8E0', accent: '#B89600', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&q=80' },
  jackfruit:  { emoji: '🍈', bg: '#FFF5D0', accent: '#A88A00', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=400&q=80' },
  sapota:     { emoji: '🥝', bg: '#F0E8D8', accent: '#7A5C2D', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=400&q=80' },
  'custard apple': { emoji: '🍏', bg: '#E8F5E0', accent: '#4A8A2D', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=400&q=80' },
  fig:        { emoji: '🫐', bg: '#F0E0E8', accent: '#8B3D5C', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1601379760883-1bb497b56470?w=400&q=80' },
  litchi:     { emoji: '🍒', bg: '#FFE0E5', accent: '#CC2244', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=400&q=80' },

  // Grains & Pulses
  wheat:      { emoji: '🌾', bg: '#FFF5D0', accent: '#A88A00', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  rice:       { emoji: '🍚', bg: '#F8F5E8', accent: '#8B8A5C', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80' },
  paddy:      { emoji: '🌾', bg: '#F0F0D0', accent: '#8B8A00', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  maize:      { emoji: '🌽', bg: '#FFF8D0', accent: '#B89600', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80' },
  corn:       { emoji: '🌽', bg: '#FFF8D0', accent: '#B89600', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80' },
  bajra:      { emoji: '🌾', bg: '#F5F0D8', accent: '#8B8040', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  jowar:      { emoji: '🌾', bg: '#F5F0E0', accent: '#8B7A40', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  ragi:       { emoji: '🌾', bg: '#F0E8D8', accent: '#7A6A40', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  soyabean:   { emoji: '🫘', bg: '#F0F0D8', accent: '#7A7A2D', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  soybean:    { emoji: '🫘', bg: '#F0F0D8', accent: '#7A7A2D', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  'green gram':  { emoji: '🫘', bg: '#E0F0D8', accent: '#4A7A2D', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  'black gram':  { emoji: '🫘', bg: '#E8E0D8', accent: '#5C4A3A', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  'bengal gram':  { emoji: '🫘', bg: '#F5F0D8', accent: '#8B7A2D', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  arhar:      { emoji: '🫘', bg: '#FFF0D8', accent: '#B88A00', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  urad:       { emoji: '🫘', bg: '#E8E0D8', accent: '#5C4A3A', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  moong:      { emoji: '🫘', bg: '#E0F0D8', accent: '#4A7A2D', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  masoor:     { emoji: '🫘', bg: '#FFE8D8', accent: '#CC6644', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  chana:      { emoji: '🫘', bg: '#F5F0D0', accent: '#8B8000', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  groundnut:  { emoji: '🥜', bg: '#F5EDD8', accent: '#8B7A40', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400&q=80' },
  mustard:    { emoji: '🌻', bg: '#FFF8D0', accent: '#B89600', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  'sesame':   { emoji: '🌰', bg: '#F5EDD8', accent: '#7A6A40', category: 'grain', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  'cotton':   { emoji: '🧶', bg: '#F8F5F0', accent: '#8B8A7A', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1594731884638-8197c3102d1e?w=400&q=80' },
  jute:       { emoji: '🧶', bg: '#F5F0D8', accent: '#7A7A40', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1594731884638-8197c3102d1e?w=400&q=80' },
  sugarcane:  { emoji: '🎋', bg: '#E8F5E0', accent: '#3A7A2D', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400&q=80' },
  tobacco:    { emoji: '🍂', bg: '#F0E8D0', accent: '#7A6A2D', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },

  // Spices
  turmeric:   { emoji: '🟡', bg: '#FFF8D0', accent: '#B89600', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  'dry chillies': { emoji: '🌶️', bg: '#FFE0E0', accent: '#CC2222', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400&q=80' },
  'red chillies': { emoji: '🌶️', bg: '#FFE0E0', accent: '#CC2222', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400&q=80' },
  cumin:      { emoji: '🫚', bg: '#F5EDD8', accent: '#7A6A40', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  cinnamon:   { emoji: '🫚', bg: '#F0E0D0', accent: '#8B5C2D', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  cardamom:   { emoji: '🌿', bg: '#E8F5E8', accent: '#3D7A3D', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  pepper:     { emoji: '🫚', bg: '#E8E0D8', accent: '#4A4A3A', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  clove:      { emoji: '🫚', bg: '#F0E0D0', accent: '#7A4A2D', category: 'spice', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  'copra':    { emoji: '🥥', bg: '#F0EBE0', accent: '#7A6A4A', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=400&q=80' },
  'arecanut': { emoji: '🌰', bg: '#F0E8D0', accent: '#7A5C2D', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  cashewnut:  { emoji: '🥜', bg: '#F8F0D8', accent: '#8B7A40', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400&q=80' },

  // Flowers
  marigold:   { emoji: '🌼', bg: '#FFF8D0', accent: '#CC9900', category: 'flower', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&q=80' },
  jasmine:    { emoji: '🌸', bg: '#FFF0F5', accent: '#CC6688', category: 'flower', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&q=80' },
  rose:       { emoji: '🌹', bg: '#FFE0E5', accent: '#CC2244', category: 'flower', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&q=80' },

  // Others
  tea:        { emoji: '🍵', bg: '#E8F0E0', accent: '#4A7A2D', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80' },
  coffee:     { emoji: '☕', bg: '#F0E8D8', accent: '#5C4A2D', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80' },
  rubber:     { emoji: '🌳', bg: '#E0F0E0', accent: '#2D7A2D', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80' },
  'dry coconut': { emoji: '🥥', bg: '#F5EDE0', accent: '#7A6A4A', category: 'other', imageUrl: 'https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=400&q=80' },

  // Additional common Indian commodities
  'amla':     { emoji: '🟢', bg: '#E0F5E0', accent: '#2D8B2D', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80' },
  'amla(nelli kai)': { emoji: '🟢', bg: '#E0F5E0', accent: '#2D8B2D', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80' },
  'ashgourd':  { emoji: '🥒', bg: '#E0F5E5', accent: '#3A7A3A', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400&q=80' },
  'tamarind': { emoji: '🌰', bg: '#F0E8D0', accent: '#7A5C2D', category: 'fruit', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80' },
  'beetroot': { emoji: '🟣', bg: '#F0E0E8', accent: '#8B2D5C', category: 'vegetable', imageUrl: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=400&q=80' },
};

/**
 * Get visual info for a commodity name.
 * Does fuzzy matching — lowercases and trims the input.
 */
export function getCommodityVisual(commodityName: string): CommodityVisual {
  const key = commodityName.toLowerCase().trim();

  // Direct match
  if (COMMODITY_MAP[key]) return COMMODITY_MAP[key];

  // Partial match — check if any key is included in the commodity name
  for (const [mapKey, visual] of Object.entries(COMMODITY_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return visual;
    }
  }

  // Fallback
  return {
    emoji: '🥬', bg: '#E8F5E8', accent: '#2D7A3D',
    category: 'other',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
  };
}

/**
 * Get a large display emoji for a commodity (for card headers)
 */
export function getCommodityEmoji(commodityName: string): string {
  return getCommodityVisual(commodityName).emoji;
}

/**
 * Get the category label for a commodity
 */
export function getCommodityCategory(commodityName: string): string {
  const visual = getCommodityVisual(commodityName);
  const labels: Record<string, string> = {
    vegetable: 'Vegetable',
    fruit: 'Fruit',
    grain: 'Grain & Pulse',
    spice: 'Spice',
    flower: 'Flower',
    other: 'Produce',
  };
  return labels[visual.category] || 'Produce';
}
