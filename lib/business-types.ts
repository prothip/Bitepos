// Business types and their feature flags
// Each business type enables/disables specific POS features

export type BusinessType = 
  | 'restaurant'
  | 'cafe'
  | 'retail'
  | 'fresh_meat'
  | 'gift_shop'
  | 'stationery'
  | 'home_pro'
  | 'bakery'
  | 'salon'
  | 'pharmacy'
  | 'laundry'
  | 'grocery'
  | 'bar_pub'
  | 'food_truck'
  | 'boutique'
  | 'convenience'
  | 'spa_wellness'
  | 'bookstore'

export interface FeatureFlags {
  // Core POS
  orders: boolean            // Order management
  tables: boolean           // Dine-in table management
  kitchenDisplay: boolean   // KDS for kitchen orders
  modifiers: boolean        // Item modifiers (size, spice level, etc.)
  tips: boolean             // Tip/gratuity on checkout
  reservations: boolean     // Table reservations
  
  // Inventory
  trackStock: boolean       // Stock quantity tracking
  barcode: boolean          // Barcode scanning
  weightPricing: boolean    // Price per kg/g (scales)
  expiryTracking: boolean  // Expiry date tracking
  batchTracking: boolean    // Batch/lot tracking
  recipes: boolean          // Recipe/BOM (bill of materials)
  purchaseOrders: boolean  // Purchase orders to suppliers
  shelfLabels: boolean     // Print shelf price labels
  
  // Products
  variants: boolean         // Product variants (size, color)
  measurement: boolean     // Custom measurements/dimensions
  customOrders: boolean    // Custom/pre-order items
  giftWrap: boolean        // Gift wrapping option
  prescriptions: boolean   // Prescription tracking
  
  // Sales
  delivery: boolean        // Delivery orders
  happyHour: boolean       // Time-based pricing
  tabs: boolean            // Open tabs / run tabs
  ageVerify: boolean       // Age verification prompt
  servicePackages: boolean // Package deals / bundles
  projectOrders: boolean  // Project-based orders with deposits
  
  // Customer
  loyalty: boolean         // Loyalty points
  appointments: boolean    // Booking/appointments
  memberTiers: boolean     // Member tier levels
  
  // Kitchen
  kitchenNotes: boolean    // Special instructions to kitchen
  prepTime: boolean        // Estimated prep time
  courseSequencing: boolean // Serve courses in order
  
  // Reporting
  wasteLog: boolean        // Waste/spoilage logging
  supplierReport: boolean  // Supplier purchase reports
  commission: boolean      // Staff commission tracking
}

export const DEFAULT_FEATURES: FeatureFlags = {
  orders: false, tables: false, kitchenDisplay: false, modifiers: false, tips: false, reservations: false,
  trackStock: false, barcode: false, weightPricing: false, expiryTracking: false, batchTracking: false,
  recipes: false, purchaseOrders: false, shelfLabels: false,
  variants: false, measurement: false, customOrders: false, giftWrap: false, prescriptions: false,
  delivery: false, happyHour: false, tabs: false, ageVerify: false, servicePackages: false, projectOrders: false,
  loyalty: false, appointments: false, memberTiers: false,
  kitchenNotes: false, prepTime: false, courseSequencing: false,
  wasteLog: false, supplierReport: false, commission: false,
}

export const BUSINESS_FEATURES: Record<BusinessType, Partial<FeatureFlags>> = {
  restaurant: {
    orders: true, tables: true, kitchenDisplay: true, modifiers: true, tips: true, reservations: true,
    delivery: true, kitchenNotes: true, prepTime: true, courseSequencing: true,
    loyalty: true, wasteLog: true, commission: true,
    trackStock: true, expiryTracking: true,
  },
  cafe: {
    orders: true, tables: true, kitchenDisplay: true, modifiers: true, tips: true,
    loyalty: true, customOrders: true, kitchenNotes: true, prepTime: true,
    trackStock: true, expiryTracking: true, happyHour: true,
  },
  retail: {
    orders: true, barcode: true, trackStock: true, variants: true, shelfLabels: true,
    purchaseOrders: true, supplierReport: true, loyalty: true, memberTiers: true,
  },
  fresh_meat: {
    orders: true, weightPricing: true, expiryTracking: true, batchTracking: true, trackStock: true,
    kitchenNotes: true, wasteLog: true, supplierReport: true, shelfLabels: true,
    barcode: true, purchaseOrders: true, modifiers: true,
  },
  gift_shop: {
    orders: true, giftWrap: true, customOrders: true, variants: true, trackStock: true,
    barcode: true, loyalty: true, purchaseOrders: true,
  },
  stationery: {
    orders: true, barcode: true, trackStock: true, variants: true, shelfLabels: true,
    purchaseOrders: true, supplierReport: true,
  },
  home_pro: {
    orders: true, projectOrders: true, measurement: true, delivery: true, trackStock: true,
    barcode: true, purchaseOrders: true, supplierReport: true, shelfLabels: true,
    commission: true,
  },
  bakery: {
    orders: true, customOrders: true, recipes: true, expiryTracking: true, trackStock: true,
    kitchenDisplay: true, kitchenNotes: true, prepTime: true, wasteLog: true,
    modifiers: true, barcode: true, shelfLabels: true,
  },
  salon: {
    orders: true, appointments: true, servicePackages: true, tips: true, commission: true,
    loyalty: true, memberTiers: true, modifiers: true,
  },
  pharmacy: {
    orders: true, prescriptions: true, expiryTracking: true, batchTracking: true, trackStock: true,
    barcode: true, purchaseOrders: true, supplierReport: true, shelfLabels: true,
  },
  laundry: {
    orders: true, servicePackages: true, delivery: true, trackStock: true, loyalty: true,
    customOrders: true,
  },
  grocery: {
    orders: true, barcode: true, weightPricing: true, trackStock: true, expiryTracking: true,
    shelfLabels: true, purchaseOrders: true, supplierReport: true, wasteLog: true,
    loyalty: true, memberTiers: true,
  },
  bar_pub: {
    orders: true, tabs: true, ageVerify: true, happyHour: true, tips: true, commission: true,
    trackStock: true, wasteLog: true, modifiers: true, kitchenDisplay: true,
    prepTime: true,
  },
  food_truck: {
    orders: true, kitchenDisplay: true, modifiers: true, kitchenNotes: true, prepTime: true,
    trackStock: true, wasteLog: true, happyHour: true,
  },
  boutique: {
    orders: true, variants: true, giftWrap: true, loyalty: true, memberTiers: true,
    trackStock: true, barcode: true, purchaseOrders: true,
  },
  convenience: {
    orders: true, barcode: true, trackStock: true, expiryTracking: true, shelfLabels: true,
    purchaseOrders: true, loyalty: true,
  },
  spa_wellness: {
    orders: true, appointments: true, servicePackages: true, tips: true, commission: true,
    loyalty: true, memberTiers: true, modifiers: true,
  },
  bookstore: {
    orders: true, barcode: true, trackStock: true, shelfLabels: true, purchaseOrders: true,
    supplierReport: true, loyalty: true, memberTiers: true,
  },
}

export const BUSINESS_LABELS: Record<BusinessType, { en: string; th: string; my: string; zh: string; icon: string; description: string }> = {
  restaurant: { en: 'Restaurant', th: 'ร้านอาหาร', my: 'စားသောက်ဆိုင်', zh: '餐厅', icon: '🍽️', description: 'Full-service dining with tables, kitchen, and reservations' },
  cafe: { en: 'Café', th: 'คาเฟ่', my: 'ကဖေး', zh: '咖啡店', icon: '☕', description: 'Coffee shop with orders and loyalty' },
  retail: { en: 'Retail Store', th: 'ร้านค้าปลีก', my: 'လက်လီဆိုင်', zh: '零售店', icon: '🛍️', description: 'General retail with barcode and inventory' },
  fresh_meat: { en: 'Fresh Meat & Seafood', th: 'เนื้อสดและอาหารทะเล', my: 'အသားနှင့်ပင်လယ်စာ', zh: '鲜肉海鲜', icon: '🥩', description: 'Weight-based pricing, expiry and batch tracking' },
  gift_shop: { en: 'Gift Shop', th: 'ร้านของขวัญ', my: 'လက်ဆောင်ဆိုင်', zh: '礼品店', icon: '🎁', description: 'Gifts with wrapping and custom orders' },
  stationery: { en: 'Stationery', th: 'เครื่องเขียน', my: 'စာရေးကိရိယာ', zh: '文具店', icon: '✏️', description: 'Office and school supplies with bulk pricing' },
  home_pro: { en: 'Home & Hardware', th: 'บ้านและฮาร์ดแวร์', my: 'အိမ်တွင်းသုံးပစ္စည်း', zh: '家装五金', icon: '🏠', description: 'Home improvement with project orders and delivery' },
  bakery: { en: 'Bakery', th: 'เบเกอรี่', my: 'ဘိကင်ဆိုင်', zh: '面包店', icon: '🥐', description: 'Baked goods with custom orders and recipes' },
  salon: { en: 'Salon & Barber', th: 'ร้านเสริมสวย', my: 'ဆံသာဆိုင်', zh: '美发店', icon: '💇', description: 'Hair and beauty with appointments and packages' },
  pharmacy: { en: 'Pharmacy', th: 'ร้านขายยา', my: 'ဆေးဆိုင်', zh: '药房', icon: '💊', description: 'Medicine with prescriptions and expiry tracking' },
  laundry: { en: 'Laundry & Dry Clean', th: 'ร้านซักรีด', my: 'လျှပ်စစ်လျှော်စက်', zh: '洗衣店', icon: '👔', description: 'Service-based with delivery and packages' },
  grocery: { en: 'Grocery & Supermarket', th: 'ร้านขายของชำ', my: 'စားသောက်ကုန်ဆိုင်', zh: '杂货超市', icon: '🛒', description: 'Full grocery with scales, barcode and expiry' },
  bar_pub: { en: 'Bar & Pub', th: 'บาร์และผับ', my: 'ဘားနှင့်ပဘ်', zh: '酒吧', icon: '🍺', description: 'Drinks with tabs, age verification and happy hour' },
  food_truck: { en: 'Food Truck & Stall', th: 'รถขายอาหาร', my: 'အစားအသောက်တခု', zh: '餐车', icon: '🚚', description: 'Mobile food service with quick ordering' },
  boutique: { en: 'Boutique & Fashion', th: 'บูติกและแฟชั่น', my: 'ဘူတိက်နှင့်ဖက်ရှင်', zh: '精品时装', icon: '👗', description: 'Clothing with sizes, colors and variants' },
  convenience: { en: 'Convenience Store', th: 'ร้านสะดวกซื้อ', my: 'အလွယ်တကူဈေးဆိုင်', zh: '便利店', icon: '🏪', description: 'Quick service retail with barcode scanning' },
  spa_wellness: { en: 'Spa & Wellness', th: 'สปาและเวลเนส', my: 'စပါးနှင့်ကျန်းမာရေး', zh: '水疗养生', icon: '🧖', description: 'Spa services with appointments and packages' },
  bookstore: { en: 'Bookstore', th: 'ร้านหนังสือ', my: 'စာအုပ်ဆိုင်', zh: '书店', icon: '📚', description: 'Books with ISBN/barcode and loyalty' },
}

export function getFeaturesForBusiness(type: BusinessType): FeatureFlags {
  return { ...DEFAULT_FEATURES, ...BUSINESS_FEATURES[type] }
}

export const FEATURE_LABELS: Record<keyof FeatureFlags, { label: string; group: string }> = {
  orders: { label: 'Order Management', group: 'Dining' },
  tables: { label: 'Table Management', group: 'Dining' },
  kitchenDisplay: { label: 'Kitchen Display (KDS)', group: 'Dining' },
  modifiers: { label: 'Item Modifiers', group: 'Dining' },
  tips: { label: 'Tips / Gratuity', group: 'Dining' },
  reservations: { label: 'Reservations', group: 'Dining' },
  trackStock: { label: 'Stock Tracking', group: 'Inventory' },
  barcode: { label: 'Barcode Scanning', group: 'Inventory' },
  weightPricing: { label: 'Weight Pricing (Scales)', group: 'Inventory' },
  expiryTracking: { label: 'Expiry Date Tracking', group: 'Inventory' },
  batchTracking: { label: 'Batch / Lot Tracking', group: 'Inventory' },
  recipes: { label: 'Recipes / BOM', group: 'Inventory' },
  purchaseOrders: { label: 'Purchase Orders', group: 'Inventory' },
  shelfLabels: { label: 'Shelf Price Labels', group: 'Inventory' },
  variants: { label: 'Product Variants', group: 'Products' },
  measurement: { label: 'Custom Measurements', group: 'Products' },
  customOrders: { label: 'Custom / Pre-orders', group: 'Products' },
  giftWrap: { label: 'Gift Wrapping', group: 'Products' },
  prescriptions: { label: 'Prescription Tracking', group: 'Products' },
  delivery: { label: 'Delivery Orders', group: 'Sales' },
  happyHour: { label: 'Happy Hour Pricing', group: 'Sales' },
  tabs: { label: 'Open Tabs / Run Tab', group: 'Sales' },
  ageVerify: { label: 'Age Verification', group: 'Sales' },
  servicePackages: { label: 'Service Packages', group: 'Sales' },
  projectOrders: { label: 'Project Orders', group: 'Sales' },
  loyalty: { label: 'Loyalty Points', group: 'Customer' },
  appointments: { label: 'Appointments / Booking', group: 'Customer' },
  memberTiers: { label: 'Member Tiers', group: 'Customer' },
  kitchenNotes: { label: 'Kitchen Notes', group: 'Kitchen' },
  prepTime: { label: 'Prep Time Estimates', group: 'Kitchen' },
  courseSequencing: { label: 'Course Sequencing', group: 'Kitchen' },
  wasteLog: { label: 'Waste / Spoilage Log', group: 'Reporting' },
  supplierReport: { label: 'Supplier Reports', group: 'Reporting' },
  commission: { label: 'Staff Commission', group: 'Reporting' },
}