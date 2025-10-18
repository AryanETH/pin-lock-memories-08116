export interface City {
  name: string;
  lat: number;
  lng: number;
}

// Lightweight world cities subset for label surfacing.
// Add or adjust as needed for better coverage.
export const cities: City[] = [
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332 },
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780 },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074 },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  { name: 'Auckland', lat: -36.8485, lng: 174.7633 },
];
