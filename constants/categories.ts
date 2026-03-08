export const BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  hotel: 'Hotel & Resort',
  restaurant: 'Restaurant & Dining',
  warehouse: 'Warehouse & Distribution',
  hospital: 'Hospital & Medical',
  shopping: 'Shopping Centre',
  factory: 'Factory & Manufacturing',
  port: 'Port & Terminal',
  supermarket: 'Supermarket & Retail',
  fuel: 'Fuel & Truck Stop',
  construction: 'Construction Site',
  office: 'Office Building',
  other: 'Other',
};

export const BUSINESS_CATEGORY_ICONS: Record<string, string> = {
  hotel: 'bed',
  restaurant: 'utensils',
  warehouse: 'warehouse',
  hospital: 'heart-pulse',
  shopping: 'shopping-bag',
  factory: 'factory',
  port: 'anchor',
  supermarket: 'shopping-cart',
  fuel: 'fuel',
  construction: 'hard-hat',
  office: 'building-2',
  other: 'map-pin',
};

export const TRUCK_TYPES = [
  { label: 'Semi-Trailer', value: 'semi_trailer' as const, defaultHeight: 4.3, defaultWeight: 42.5, defaultWidth: 2.5 },
  { label: 'B-Double', value: 'b_double' as const, defaultHeight: 4.3, defaultWeight: 62.5, defaultWidth: 2.5 },
  { label: 'Rigid Truck', value: 'rigid' as const, defaultHeight: 3.5, defaultWeight: 22.5, defaultWidth: 2.5 },
  { label: 'Delivery Van', value: 'delivery_van' as const, defaultHeight: 3.0, defaultWeight: 4.5, defaultWidth: 2.1 },
  { label: 'Road Train', value: 'road_train' as const, defaultHeight: 4.3, defaultWeight: 79.0, defaultWidth: 2.5 },
  { label: 'Custom', value: 'custom' as const, defaultHeight: 4.0, defaultWeight: 20.0, defaultWidth: 2.5 },
];

export const DEFAULT_LOCATION = { latitude: -33.8688, longitude: 151.2093 };

export const AUSTRALIAN_CITIES = [
  'Sydney, NSW',
  'Melbourne, VIC',
  'Brisbane, QLD',
  'Perth, WA',
  'Adelaide, SA',
  'Hobart, TAS',
  'Darwin, NT',
  'Canberra, ACT',
  'Gold Coast, QLD',
  'Newcastle, NSW',
  'Wollongong, NSW',
  'Geelong, VIC',
  'Townsville, QLD',
  'Cairns, QLD',
  'Toowoomba, QLD',
];
