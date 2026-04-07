export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=sv&zoom=14`,
      { headers: { 'User-Agent': 'kryssa.nu/1.0' }, signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    const parts = [
      addr?.village || addr?.town || addr?.city,
      addr?.municipality || addr?.county,
    ].filter(Boolean);
    return parts.join(', ') || data.display_name || null;
  } catch {
    return null;
  }
}
