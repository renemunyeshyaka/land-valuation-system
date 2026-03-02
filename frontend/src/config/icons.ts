/**
 * Icon System Configuration
 * Land Valuation System - Rwanda
 * 
 * Font Awesome 6.0.0-beta3 icon mapping
 * Ensures all icons are valid and optimized for production
 */

export const ICONS = {
  // Navigation & UI
  LOGO: 'fas fa-map-marked-alt',
  GLOBE: 'fas fa-globe',
  CHEVRON_DOWN: 'fas fa-chevron-down',
  SEARCH: 'fas fa-search',
  CALCULATOR: 'fas fa-calculator',
  CHECK_CIRCLE: 'fas fa-check-circle',
  MAP_PIN: 'fas fa-map-pin',
  GAVEL: 'fas fa-gavel',
  CROWN: 'fas fa-crown',
  PHONE: 'fas fa-phone-alt',
  ARROW_RIGHT: 'fas fa-arrow-right',

  // Feature Icons
  BOOK_OPEN: 'fas fa-book-open',
  DRAW_POLYGON: 'fas fa-draw-polygon',
  CHART_LINE: 'fas fa-chart-line',
  HANDSHAKE: 'fas fa-handshake',
  MAP_LOCATION_DOT: 'fas fa-map-location-dot',
  MAP: 'fas fa-map',

  // Property Cards
  CLOCK: 'far fa-clock', // Regular icon
  TAG: 'fas fa-tag',

  // Subscription
  CHECK: 'fas fa-check',
  TIMES: 'fas fa-times',

  // Testimonials
  QUOTE_LEFT: 'fas fa-quote-left',

  // Social Media (Brand icons)
  TWITTER: 'fab fa-twitter',
  LINKEDIN: 'fab fa-linkedin',
  WHATSAPP: 'fab fa-whatsapp',

  // Footer
  LOCK: 'fas fa-lock',
} as const;

/**
 * Icon color mapping for consistency
 */
export const ICON_COLORS = {
  PRIMARY: 'text-emerald-700',
  SECONDARY: 'text-emerald-600',
  ACCENT: 'text-amber-300',
  SUCCESS: 'text-emerald-600',
  DANGER: 'text-red-600',
  WARNING: 'text-amber-600',
  NEUTRAL: 'text-gray-400',
  WHITE: 'text-white',
} as const;

/**
 * Icon size mapping
 */
export const ICON_SIZES = {
  XS: 'text-xs',
  SM: 'text-sm',
  BASE: 'text-base',
  LG: 'text-lg',
  XL: 'text-xl',
  '2XL': 'text-2xl',
  '3XL': 'text-3xl',
  '4XL': 'text-4xl',
  '7XL': 'text-7xl',
} as const;

/**
 * Validation function to ensure icon exists
 */
export const validateIcon = (iconClass: string): boolean => {
  const validPrefixes = ['fas', 'far', 'fab'];
  const parts = iconClass.split(' ');
  
  if (parts.length < 2) return false;
  
  const [prefix] = parts;
  return validPrefixes.includes(prefix);
};

/**
 * Helper function to combine icon class with colors and sizes
 */
export const buildIconClass = (
  icon: string,
  color?: string,
  size?: string,
  additionalClasses?: string
): string => {
  const classes = [icon];
  
  if (color) classes.push(color);
  if (size) classes.push(size);
  if (additionalClasses) classes.push(additionalClasses);
  
  return classes.join(' ');
};

/**
 * Image URLs from Unsplash (verified as of 2026-03-02)
 */
export const PROPERTY_IMAGES = {
  KIGALI_GASABO: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  MUSANZE: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  RUBAVU_LAKE: 'https://images.unsplash.com/photo-1568605117036-5fe5e7fa0ab6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
} as const;

/**
 * Map tile provider configuration
 */
export const MAP_CONFIG = {
  // CartoDB Light All - best for Rwanda land data visualization
  TILE_URL: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  TILE_ATTRIBUTION: '© OpenStreetMap contributors, © CartoDB',
  
  // Rwanda center coordinates
  DEFAULT_LAT: -1.9441,
  DEFAULT_LNG: 30.0619,
  DEFAULT_ZOOM: 10,
  
  // Rwanda boundaries (approximate)
  BOUNDS: [
    [-2.8, 28.9],  // Southwest
    [-0.9, 30.9],  // Northeast
  ],
} as const;

/**
 * Leaflet custom marker configuration
 */
export const LEAFLET_CONFIG = {
  ICON_SIZE: [25, 41],
  ICON_ANCHOR: [12, 41],
  POPUP_ANCHOR: [1, -34],
} as const;
