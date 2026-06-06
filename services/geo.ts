import { fetchWithAppCheck } from '@/lib/appcheck-fetch';

export async function fetchAddress(lat: number, lng: number): Promise<{
  display_name?: string;
  address?: {
    state_district?: string;
    county?: string;
    city_district?: string;
    postcode?: string;
  };
} | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Nominatim reverse geocoding failed:", err);
    return null;
  }
}

export async function fetchRoadClassification(lat: number, lng: number): Promise<{
  highwayTag: string;
  roadAuthority: string;
} | null> {
  try {
    const res = await fetchWithAppCheck(`/api/road-classification?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Road classification API failed:", err);
    return null;
  }
}
