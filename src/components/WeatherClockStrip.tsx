import { useEffect, useState } from 'react';
import {
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
  Wind,
} from 'lucide-react';
import type { IstanbulWeatherData } from '../types/transit';

function renderWeatherIcon(weather: IstanbulWeatherData | null) {
  if (!weather) {
    return <CloudSun className="w-4 h-4 text-amber-500 dark:text-sky-400" aria-hidden="true" />;
  }
  const code = weather.weatherCode;
  if (code === 0) {
    return weather.isDay ? (
      <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
    ) : (
      <Moon className="w-4 h-4 text-sky-300" aria-hidden="true" />
    );
  }
  if (code === 1 || code === 2) {
    return <CloudSun className="w-4 h-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />;
  }
  if (code === 3) {
    return <Cloud className="w-4 h-4 text-slate-500 dark:text-slate-300" aria-hidden="true" />;
  }
  if (code === 45 || code === 48) {
    return <CloudFog className="w-4 h-4 text-slate-400" aria-hidden="true" />;
  }
  if (code >= 51 && code <= 57) {
    return <CloudDrizzle className="w-4 h-4 text-sky-500" aria-hidden="true" />;
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain className="w-4 h-4 text-blue-500 dark:text-sky-400" aria-hidden="true" />;
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return <Snowflake className="w-4 h-4 text-cyan-500 dark:text-cyan-300" aria-hidden="true" />;
  }
  if (code >= 95) {
    return <CloudLightning className="w-4 h-4 text-amber-500" aria-hidden="true" />;
  }
  return <Cloud className="w-4 h-4 text-slate-500 dark:text-slate-300" aria-hidden="true" />;
}

export function WeatherClockStrip({
  weather,
  isWeatherLoading,
}: {
  weather: IstanbulWeatherData | null;
  isWeatherLoading: boolean;
}) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateText = now.toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });

  return (
    <section
      aria-label="Anlık İstanbul hava durumu ve saat"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 flex items-center justify-between gap-3 text-xs"
    >
      {/* Left: Live Weather */}
      <div className="flex items-center gap-2 min-w-0">
        {renderWeatherIcon(weather)}
        {weather ? (
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-mono-tabular font-extrabold text-slate-900 dark:text-white">
              {weather.temperatureC}°C
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
              {weather.conditionLabel}
            </span>
            <span
              className="hidden sm:inline text-slate-300 dark:text-slate-700"
              aria-hidden="true"
            >
              ·
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
              <Wind className="w-3 h-3" aria-hidden="true" />
              {weather.windSpeedKmh} km/sa
            </span>
          </div>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">
            {isWeatherLoading ? 'Hava durumu alınıyor...' : 'İstanbul Hava Durumu'}
          </span>
        )}
      </div>

      {/* Right: Live Clock */}
      <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
        <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400">
          {dateText}
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
          <Clock
            className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"
            aria-hidden="true"
          />
          <span>{timeText}</span>
        </span>
      </div>
    </section>
  );
}
