export interface CountryConfig {
  code: string;
  name: string;
  demonym: string;
  userAgent: string;
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  { code: 'au', name: 'Australia', demonym: 'Australian', userAgent: 'TruckDockFinder-AU/1.0' },
  { code: 'nz', name: 'New Zealand', demonym: 'New Zealand', userAgent: 'TruckDockFinder-NZ/1.0' },
  { code: 'us', name: 'United States', demonym: 'American', userAgent: 'TruckDockFinder-US/1.0' },
  { code: 'gb', name: 'United Kingdom', demonym: 'UK', userAgent: 'TruckDockFinder-GB/1.0' },
  { code: 'ca', name: 'Canada', demonym: 'Canadian', userAgent: 'TruckDockFinder-CA/1.0' },
  { code: 'ie', name: 'Ireland', demonym: 'Irish', userAgent: 'TruckDockFinder-IE/1.0' },
  { code: 'za', name: 'South Africa', demonym: 'South African', userAgent: 'TruckDockFinder-ZA/1.0' },
  { code: 'de', name: 'Germany', demonym: 'German', userAgent: 'TruckDockFinder-DE/1.0' },
  { code: 'fr', name: 'France', demonym: 'French', userAgent: 'TruckDockFinder-FR/1.0' },
  { code: 'in', name: 'India', demonym: 'Indian', userAgent: 'TruckDockFinder-IN/1.0' },
];

export const DEFAULT_COUNTRY_CODE = 'au';

export function getCountryByCode(code: string): CountryConfig {
  return SUPPORTED_COUNTRIES.find(c => c.code === code) ?? SUPPORTED_COUNTRIES[0];
}
