export interface CountryRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface CountryConfig {
  code: string;
  name: string;
  demonym: string;
  userAgent: string;
  voiceLanguage: string;
  locale: string;
  defaultRegion: CountryRegion;
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  { code: 'au', name: 'Australia', demonym: 'Australian', userAgent: 'TruckDockFinder-AU/1.0', voiceLanguage: 'en-AU', locale: 'en-AU', defaultRegion: { latitude: -28.0, longitude: 134.0, latitudeDelta: 30, longitudeDelta: 30 } },
  { code: 'nz', name: 'New Zealand', demonym: 'New Zealand', userAgent: 'TruckDockFinder-NZ/1.0', voiceLanguage: 'en-NZ', locale: 'en-NZ', defaultRegion: { latitude: -41.0, longitude: 174.0, latitudeDelta: 10, longitudeDelta: 10 } },
  { code: 'us', name: 'United States', demonym: 'American', userAgent: 'TruckDockFinder-US/1.0', voiceLanguage: 'en-US', locale: 'en-US', defaultRegion: { latitude: 39.0, longitude: -98.0, latitudeDelta: 30, longitudeDelta: 30 } },
  { code: 'gb', name: 'United Kingdom', demonym: 'UK', userAgent: 'TruckDockFinder-GB/1.0', voiceLanguage: 'en-GB', locale: 'en-GB', defaultRegion: { latitude: 54.0, longitude: -2.0, latitudeDelta: 10, longitudeDelta: 10 } },
  { code: 'ca', name: 'Canada', demonym: 'Canadian', userAgent: 'TruckDockFinder-CA/1.0', voiceLanguage: 'en-CA', locale: 'en-CA', defaultRegion: { latitude: 56.0, longitude: -96.0, latitudeDelta: 30, longitudeDelta: 30 } },
  { code: 'ie', name: 'Ireland', demonym: 'Irish', userAgent: 'TruckDockFinder-IE/1.0', voiceLanguage: 'en-IE', locale: 'en-IE', defaultRegion: { latitude: 53.4, longitude: -7.9, latitudeDelta: 5, longitudeDelta: 5 } },
  { code: 'za', name: 'South Africa', demonym: 'South African', userAgent: 'TruckDockFinder-ZA/1.0', voiceLanguage: 'en-ZA', locale: 'en-ZA', defaultRegion: { latitude: -29.0, longitude: 25.0, latitudeDelta: 15, longitudeDelta: 15 } },
  { code: 'de', name: 'Germany', demonym: 'German', userAgent: 'TruckDockFinder-DE/1.0', voiceLanguage: 'de-DE', locale: 'de-DE', defaultRegion: { latitude: 51.0, longitude: 10.0, latitudeDelta: 8, longitudeDelta: 8 } },
  { code: 'fr', name: 'France', demonym: 'French', userAgent: 'TruckDockFinder-FR/1.0', voiceLanguage: 'fr-FR', locale: 'fr-FR', defaultRegion: { latitude: 46.6, longitude: 2.3, latitudeDelta: 10, longitudeDelta: 10 } },
  { code: 'in', name: 'India', demonym: 'Indian', userAgent: 'TruckDockFinder-IN/1.0', voiceLanguage: 'en-IN', locale: 'en-IN', defaultRegion: { latitude: 22.0, longitude: 78.0, latitudeDelta: 20, longitudeDelta: 20 } },
];

export const DEFAULT_COUNTRY_CODE = 'au';

export function getCountryByCode(code: string): CountryConfig {
  return SUPPORTED_COUNTRIES.find(c => c.code === code) ?? SUPPORTED_COUNTRIES[0];
}
