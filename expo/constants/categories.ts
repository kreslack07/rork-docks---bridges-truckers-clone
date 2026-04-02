import { BusinessCategory, TruckProfile } from '@/types';

export const TRUCK_TYPES: {
  value: TruckProfile['type'];
  label: string;
  defaultHeight: number;
  defaultWeight: number;
  defaultWidth: number;
}[] = [
  { value: 'semi_trailer', label: 'Semi Trailer', defaultHeight: 4.3, defaultWeight: 42.5, defaultWidth: 2.5 },
  { value: 'b_double', label: 'B-Double', defaultHeight: 4.3, defaultWeight: 62.5, defaultWidth: 2.5 },
  { value: 'rigid', label: 'Rigid', defaultHeight: 3.5, defaultWeight: 22.5, defaultWidth: 2.5 },
  { value: 'delivery_van', label: 'Delivery Van', defaultHeight: 2.8, defaultWeight: 4.5, defaultWidth: 2.1 },
  { value: 'road_train', label: 'Road Train', defaultHeight: 4.3, defaultWeight: 79.0, defaultWidth: 2.5 },
  { value: 'custom', label: 'Custom', defaultHeight: 4.0, defaultWeight: 20.0, defaultWidth: 2.5 },
];

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  warehouse: 'Warehouse',
  hospital: 'Hospital',
  shopping: 'Shopping',
  factory: 'Factory',
  port: 'Port',
  supermarket: 'Supermarket',
  fuel: 'Fuel Station',
  construction: 'Construction',
  office: 'Office',
  other: 'Other',
};
