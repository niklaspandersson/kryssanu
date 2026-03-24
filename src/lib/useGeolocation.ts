import { createSignal } from 'solid-js';

type GeoState = {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
};

export function useGeolocation() {
  const [geo, setGeo] = createSignal<GeoState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
  });

  function requestPosition() {
    if (!navigator.geolocation) {
      setGeo((s) => ({ ...s, error: 'not-supported' }));
      return;
    }
    setGeo({ latitude: null, longitude: null, loading: true, error: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setGeo((s) => ({
          ...s,
          loading: false,
          error: err.code === 1 ? 'denied' : 'unavailable',
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return { geo, setGeo, requestPosition };
}
