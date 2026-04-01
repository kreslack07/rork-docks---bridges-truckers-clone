export type BusinessCategory =
  | 'hotel'
  | 'restaurant'
  | 'warehouse'
  | 'hospital'
  | 'shopping'
  | 'factory'
  | 'port'
  | 'supermarket'
  | 'fuel'
  | 'construction'
  | 'office'
  | 'other';

export interface Dock {
  id: string;
  name: string;
  business: string;
  businessCategory: BusinessCategory;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  description: string;
  dockType: 'loading' | 'unloading' | 'both';
  accessNotes: string;
  isOffRoad: boolean;
  operatingHours?: string;
  phone?: string;
}

export interface Hazard {
  id: string;
  type: 'bridge' | 'wire' | 'weight_limit';
  name: string;
  clearanceHeight: number;
  road: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  description: string;
  lastVerified: string;
  weightLimit?: number;
  widthLimit?: number;
}

export interface TruckProfile {
  name: string;
  height: number;
  weight: number;
  width: number;
  type: 'semi_trailer' | 'b_double' | 'rigid' | 'delivery_van' | 'road_train' | 'custom';
  plateNumber: string;
}

export interface RouteResult {
  destination: string;
  hazardsOnRoute: Hazard[];
  safeHazards: Hazard[];
  blockedHazards: Hazard[];
  estimatedDistance: string;
  estimatedTime: string;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
}

export type HazardFilter = 'all' | 'bridge' | 'wire' | 'weight_limit';
