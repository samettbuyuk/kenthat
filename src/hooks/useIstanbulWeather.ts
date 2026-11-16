import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ISTANBUL_CENTER,
  type IstanbulWeatherData,
  type LatLngPoint,
} from '../types/transit';

function mapWmoWeatherLabel(code: number): string {
  if (code === 0) return 'Açık';
  if (code === 1) return 'Az Bulutlu';
  if (code === 2) return 'Parçalı Bulutlu';
  if (code === 3) return 'Çok Bulutlu';
  if (code === 45 || code === 48) return 'Sisli';
  if (code >= 51 && code <= 57) return 'Çisenti';
  if (code >= 61 && code <= 67) return 'Yağmurlu';
  if (code >= 71 && code <= 77) return 'Karlı';
  if (code >= 80 && code <= 82) return 'Sağanak';
  if (code >= 85 && code <= 86) return 'Kar Sağanağı';
  if (code >= 95) return 'Fırtınalı';
  return 'Bulutlu';
}

export function useIstanbulWeather(location: LatLngPoint | null) {
  const [weather, setWeather] = useState<IstanbulWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastCoordKeyRef = useRef<string | null>(null);

  const target = location || ISTANBUL_CENTER;

  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(
        4
      )}&longitude=${lng.toFixed(
        4
      )}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=Europe%2FIstanbul`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
      const json = await res.json();
      const cur = json?.current;
      if (cur && typeof cur.temperature_2m === 'number') {
        const code = Number(cur.weather_code ?? 2);
        setWeather({
          temperatureC: Math.round(cur.temperature_2m),
          apparentTempC: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
          windSpeedKmh: Math.round(cur.wind_speed_10m ?? 0),
          weatherCode: code,
          conditionLabel: mapWmoWeatherLabel(code),
          isDay: cur.is_day === 1,
          fetchedAtIso: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only refetch if moved meaningfully (~0.02 deg ≈ 2 km) or first load
    const roundedKey = `${target.lat.toFixed(2)},${target.lng.toFixed(2)}`;
    if (lastCoordKeyRef.current !== roundedKey) {
      lastCoordKeyRef.current = roundedKey;
      void fetchWeather(target.lat, target.lng);
    }

    const timer = window.setInterval(() => {
      void fetchWeather(target.lat, target.lng);
    }, 10 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, [target.lat, target.lng, fetchWeather]);

  return {
    weather,
    isLoading,
    refreshWeather: () => fetchWeather(target.lat, target.lng),
  };
}
