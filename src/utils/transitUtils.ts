import type { LatLngPoint, TransitMode } from '../types/transit';

export interface TransitModeConfig {
  mode: TransitMode;
  label: string;
  shortLabel: string;
  lineHint: string;
  color: string;
}

export const TRANSIT_MODE_ORDER: TransitMode[] = [
  'bus',
  'metrobus',
  'metro',
  'marmaray',
  'tram',
  'ferry',
];

export const TRANSIT_MODE_META: Record<TransitMode, TransitModeConfig> = {
  bus: {
    mode: 'bus',
    label: 'Otobüs (İETT)',
    shortLabel: 'Otobüs',
    lineHint: 'İETT hatları',
    color: '#E11D48',
  },
  metrobus: {
    mode: 'metrobus',
    label: 'Metrobüs',
    shortLabel: 'Metrobüs',
    lineHint: '34 · 34AS · 34BZ · 34G',
    color: '#D97706',
  },
  metro: {
    mode: 'metro',
    label: 'Metro',
    shortLabel: 'Metro',
    lineHint: 'M1 – M11 hatları',
    color: '#2563EB',
  },
  marmaray: {
    mode: 'marmaray',
    label: 'Marmaray',
    shortLabel: 'Marmaray',
    lineHint: 'B1 Halkalı – Gebze',
    color: '#0D9488',
  },
  tram: {
    mode: 'tram',
    label: 'Tramvay',
    shortLabel: 'Tramvay',
    lineHint: 'T1, T3, T4, T5 & Füniküler',
    color: '#7C3AED',
  },
  ferry: {
    mode: 'ferry',
    label: 'Vapur / İskele',
    shortLabel: 'Vapur',
    lineHint: 'Şehir Hatları & İDO',
    color: '#0284C7',
  },
};

const VALID_TRANSIT_PLACE_TYPES: Record<string, boolean> = {
  transit_station: true,
  bus_station: true,
  bus_stop: true,
  subway_station: true,
  train_station: true,
  light_rail_station: true,
  ferry_terminal: true,
};

export function isTransitPlaceEntity(
  primaryType?: string | null,
  types: string[] = []
): boolean {
  if (primaryType && VALID_TRANSIT_PLACE_TYPES[primaryType]) {
    return true;
  }
  return types.some((t) => Boolean(VALID_TRANSIT_PLACE_TYPES[t]));
}

export function isStationExitOrNonStop(displayName: string): boolean {
  const normalized = displayName.toLocaleLowerCase('tr-TR');
  return /\b(çıkış|çıkışı|giriş|girişi|exit|entrance|asansör|asansörü|otopark|müdürlüğü|biletmatik|gişe|istanbulkart|taksi|büfe|cafe|restoran|otel|market|avm|mağaza)\b/.test(
    normalized
  );
}

export function haversineDistanceMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return Math.round(2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function calculateWalkingMinutes(
  distanceMeters: number,
  speedKmh = 4.5
): number {
  const safeSpeed = Math.max(2.0, Math.min(8.5, speedKmh));
  const metersPerMinute = (safeSpeed * 1000) / 60;
  return Math.max(1, Math.round(distanceMeters / metersPerMinute));
}

export function estimateWalkingMinutes(distanceMeters: number): number {
  return calculateWalkingMinutes(distanceMeters, 4.5);
}

export function getWalkingSpeedLabel(speedKmh: number): string {
  if (speedKmh < 3.8) return 'Yavaş';
  if (speedKmh <= 5.2) return 'Normal';
  return 'Hızlı';
}

export function formatDistanceKm(meters: number): string {
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(2)} km`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatWalkingDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} dk`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} sa ${rem} dk` : `${hours} sa`;
}

export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMinutesUntilDeparture(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return 'Kalkıyor';
  if (diffMin < 60) return `${diffMin} dk sonra`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
}

export function classifyIstanbulTransitMode(
  displayName: string,
  primaryType?: string | null,
  types: string[] = []
): TransitMode | null {
  if (!isTransitPlaceEntity(primaryType, types)) {
    return null;
  }

  if (isStationExitOrNonStop(displayName)) {
    return null;
  }

  const normalized = displayName.toLocaleLowerCase('tr-TR');

  if (normalized.includes('metrobüs') || normalized.includes('metrobus')) {
    return 'metrobus';
  }
  if (normalized.includes('marmaray')) {
    return 'marmaray';
  }
  if (
    primaryType === 'ferry_terminal' ||
    types.includes('ferry_terminal') ||
    (primaryType !== 'bus_stop' &&
      /\b(vapur|iskele|iskelesi|ido|i̇do|şehir hatları|turyol|dentur|feribot)\b/.test(
        normalized
      ))
  ) {
    return 'ferry';
  }
  if (
    primaryType === 'light_rail_station' ||
    types.includes('light_rail_station') ||
    (primaryType !== 'bus_stop' &&
      (normalized.includes('tramvay') ||
        normalized.includes('füniküler') ||
        normalized.includes('funikuler') ||
        /\b(t1|t3|t4|t5|f1|f2|f3|f4)\b/.test(normalized)))
  ) {
    return 'tram';
  }
  if (
    primaryType === 'subway_station' ||
    types.includes('subway_station') ||
    (primaryType !== 'bus_stop' &&
      (normalized.includes('metro') ||
        /\b(m1|m1a|m1b|m2|m3|m4|m5|m6|m7|m8|m9|m11)\b/.test(normalized)))
  ) {
    return 'metro';
  }
  if (primaryType === 'train_station' || types.includes('train_station')) {
    return 'marmaray';
  }
  if (
    primaryType === 'bus_stop' ||
    primaryType === 'bus_station' ||
    types.includes('bus_stop') ||
    types.includes('bus_station') ||
    primaryType === 'transit_station'
  ) {
    return 'bus';
  }
  return null;
}

export function getIstanbulLineColors(
  lineCode: string,
  mode: TransitMode,
  apiColor?: string | null,
  apiTextColor?: string | null
): { bg: string; text: string } {
  if (apiColor && /^#[0-9a-fA-F]{3,8}$/.test(apiColor)) {
    return {
      bg: apiColor,
      text:
        apiTextColor && /^#[0-9a-fA-F]{3,8}$/.test(apiTextColor)
          ? apiTextColor
          : '#FFFFFF',
    };
  }
  const code = lineCode.toUpperCase();
  if (code.startsWith('M1')) return { bg: '#E30613', text: '#FFFFFF' };
  if (code.startsWith('M2')) return { bg: '#009E49', text: '#FFFFFF' };
  if (code.startsWith('M3')) return { bg: '#00A1E0', text: '#FFFFFF' };
  if (code.startsWith('M4')) return { bg: '#E5007D', text: '#FFFFFF' };
  if (code.startsWith('M5')) return { bg: '#682D8F', text: '#FFFFFF' };
  if (code.startsWith('M6')) return { bg: '#C69F68', text: '#0F172A' };
  if (code.startsWith('M7')) return { bg: '#F294B6', text: '#0F172A' };
  if (code.startsWith('M8')) return { bg: '#1D5CA8', text: '#FFFFFF' };
  if (code.startsWith('M9')) return { bg: '#F7D117', text: '#0F172A' };
  if (code.startsWith('M11')) return { bg: '#8B5CF6', text: '#FFFFFF' };
  if (code.startsWith('34')) return { bg: '#D97706', text: '#FFFFFF' };
  if (code === 'B1' || code.includes('MARMARAY')) return { bg: '#0D9488', text: '#FFFFFF' };
  if (code.startsWith('T')) return { bg: '#7C3AED', text: '#FFFFFF' };
  return { bg: TRANSIT_MODE_META[mode].color, text: '#FFFFFF' };
}

export function inferTransitModeFromVehicle(
  vehicleType?: string | null,
  lineCode?: string | null,
  lineName?: string | null
): TransitMode {
  const code = (lineCode || '').trim().toUpperCase();
  const name = (lineName || '').toLocaleLowerCase('tr-TR');
  const vt = (vehicleType || '').toUpperCase();

  if (code.startsWith('34') || name.includes('metrobüs') || name.includes('metrobus')) {
    return 'metrobus';
  }
  if (
    code === 'B1' ||
    code.includes('MARMARAY') ||
    name.includes('marmaray') ||
    vt === 'COMMUTER_TRAIN' ||
    vt === 'HEAVY_RAIL' ||
    vt === 'RAIL'
  ) {
    return 'marmaray';
  }
  if (vt === 'FERRY' || name.includes('vapur') || name.includes('ido') || name.includes('hatları')) {
    return 'ferry';
  }
  if (
    /^[TF]\d+/.test(code) ||
    vt === 'TRAM' ||
    vt === 'FUNICULAR' ||
    name.includes('tramvay') ||
    name.includes('füniküler')
  ) {
    return 'tram';
  }
  if (/^M\d+/.test(code) || vt === 'SUBWAY' || vt === 'METRO_RAIL' || name.includes('metro')) {
    return 'metro';
  }
  return 'bus';
}

export function buildGoogleMapsWalkingUrl(
  origin: LatLngPoint,
  destination: LatLngPoint
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=walking`;
}

export function buildGoogleMapsTransitUrl(
  origin: LatLngPoint,
  destination: LatLngPoint
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=transit`;
}

