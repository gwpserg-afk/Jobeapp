// Distance calculation utilities for location-based features

// Mock user location - Dakar center (for demo purposes)
export const USER_LOCATION = {
  latitude: 14.6937,
  longitude: -17.4441,
};

/**
 * Calculate straight-line distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance from user's location to a job location
 * @param jobLat - Job latitude
 * @param jobLon - Job longitude
 * @param userLocation - Optional user location (defaults to USER_LOCATION)
 * @returns Distance in kilometers
 */
export function getDistanceFromUser(
  jobLat: number,
  jobLon: number,
  userLocation?: { latitude: number; longitude: number } | null
): number {
  const loc = userLocation ?? USER_LOCATION;
  return calculateDistance(loc.latitude, loc.longitude, jobLat, jobLon);
}

/**
 * Format distance for display
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string (e.g., "3.2 km" or "800 m")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Get formatted distance from user to a job location
 * @param jobLat - Job latitude (optional)
 * @param jobLon - Job longitude (optional)
 * @param userLocation - Optional user location (defaults to USER_LOCATION)
 * @returns Formatted distance string or null if coordinates not available
 */
export function getFormattedDistanceFromUser(
  jobLat?: number | null,
  jobLon?: number | null,
  userLocation?: { latitude: number; longitude: number } | null
): string | null {
  if (jobLat == null || jobLon == null) {
    return null;
  }
  const distance = getDistanceFromUser(jobLat, jobLon, userLocation);
  return formatDistance(distance);
}

/**
 * Build Apple Maps URL for directions
 * @param destLat - Destination latitude
 * @param destLon - Destination longitude
 * @param destName - Optional destination name
 * @returns Apple Maps URL string
 */
export function buildAppleMapsDirectionsUrl(
  destLat: number,
  destLon: number,
  destName?: string
): string {
  const daddr = `${destLat},${destLon}`;
  const name = destName ? encodeURIComponent(destName) : "";
  // Use maps:// scheme for iOS native Apple Maps
  return `maps://?daddr=${daddr}&dirflg=d${name ? `&q=${name}` : ""}`;
}

/**
 * Build Google Maps URL fallback for Android
 * @param destLat - Destination latitude
 * @param destLon - Destination longitude
 * @returns Google Maps URL string
 */
export function buildGoogleMapsDirectionsUrl(
  destLat: number,
  destLon: number
): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}`;
}

/**
 * Coordinates for major cities in Senegal
 * Used for demo purposes when exact coordinates are not available
 */
export const SENEGAL_CITY_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  Dakar: { latitude: 14.6928, longitude: -17.4467 },
  Thies: { latitude: 14.7886, longitude: -16.926 },
  Thiès: { latitude: 14.7886, longitude: -16.926 },
  "Saint-Louis": { latitude: 16.0326, longitude: -16.502 },
  Kaolack: { latitude: 14.15, longitude: -16.0667 },
  Ziguinchor: { latitude: 12.5667, longitude: -16.2667 },
  Mbour: { latitude: 14.4167, longitude: -16.9667 },
  Rufisque: { latitude: 14.7167, longitude: -17.2667 },
  Touba: { latitude: 14.85, longitude: -15.8833 },
};

/**
 * Get coordinates for a Senegal city
 * @param cityName - Name of the city (case-insensitive)
 * @returns Coordinates object or null if city not found
 */
export function getCityCoordinates(
  cityName: string
): { latitude: number; longitude: number } | null {
  // Try exact match first
  if (SENEGAL_CITY_COORDINATES[cityName]) {
    return SENEGAL_CITY_COORDINATES[cityName];
  }

  // Try case-insensitive match
  const lowerCity = cityName.toLowerCase();
  for (const [city, coords] of Object.entries(SENEGAL_CITY_COORDINATES)) {
    if (city.toLowerCase() === lowerCity) {
      return coords;
    }
  }

  // Default to Dakar if city not found
  return SENEGAL_CITY_COORDINATES.Dakar;
}
