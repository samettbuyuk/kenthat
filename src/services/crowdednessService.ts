import type {
  CrowdednessLevel,
  LatLngPoint,
  StopCrowdednessInfo,
  TransitMode,
  TransitStop,
} from '../types/transit';
import { getIstanbulClockParts } from '../data/istanbul24HourLines';

export interface MajorTransitHubSeed {
  id: string;
  name: string;
  mode: TransitMode;
  location: LatLngPoint;
  baseLoadOffset: number;
}

export const MAJOR_ISTANBUL_HUBS: MajorTransitHubSeed[] = [
  {
    id: 'hub-zincirlikuyu',
    name: 'Zincirlikuyu Aktarma',
    mode: 'metrobus',
    location: { lat: 41.0672, lng: 29.0138 },
    baseLoadOffset: 16,
  },
  {
    id: 'hub-mecidiyekoy',
    name: 'Şişli – Mecidiyeköy',
    mode: 'metro',
    location: { lat: 41.0655, lng: 28.9932 },
    baseLoadOffset: 15,
  },
  {
    id: 'hub-yenikapi',
    name: 'Yenikapı Marmaray & Metro',
    mode: 'marmaray',
    location: { lat: 41.0052, lng: 28.9519 },
    baseLoadOffset: 14,
  },
  {
    id: 'hub-uskudar',
    name: 'Üsküdar Marmaray & İskele',
    mode: 'marmaray',
    location: { lat: 41.0262, lng: 29.0154 },
    baseLoadOffset: 12,
  },
  {
    id: 'hub-ayrilik-cesmesi',
    name: 'Ayrılık Çeşmesi',
    mode: 'marmaray',
    location: { lat: 41.0001, lng: 29.0303 },
    baseLoadOffset: 13,
  },
  {
    id: 'hub-sogutlucesme',
    name: 'Söğütlüçeşme Metrobüs',
    mode: 'metrobus',
    location: { lat: 40.9912, lng: 29.0367 },
    baseLoadOffset: 14,
  },
  {
    id: 'hub-taksim',
    name: 'Taksim Meydan Metro',
    mode: 'metro',
    location: { lat: 41.0372, lng: 28.9854 },
    baseLoadOffset: 11,
  },
  {
    id: 'hub-kadikoy',
    name: 'Kadıköy Rıhtım & İskele',
    mode: 'ferry',
    location: { lat: 40.9921, lng: 29.0231 },
    baseLoadOffset: 10,
  },
  {
    id: 'hub-eminonu',
    name: 'Eminönü Tramvay & İskele',
    mode: 'tram',
    location: { lat: 41.0175, lng: 28.9708 },
    baseLoadOffset: 12,
  },
  {
    id: 'hub-cevizlibag',
    name: 'Cevizlibağ Metrobüs & T1',
    mode: 'metrobus',
    location: { lat: 41.0155, lng: 28.9144 },
    baseLoadOffset: 13,
  },
];

function deterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) % 997;
  }
  return hash;
}

function getLevelMeta(percent: number): {
  level: CrowdednessLevel;
  label: string;
} {
  if (percent < 40) return { level: 'low', label: 'Sakin' };
  if (percent < 68) return { level: 'moderate', label: 'Orta Yoğunluk' };
  if (percent < 85) return { level: 'high', label: 'Yoğun' };
  return { level: 'very_high', label: 'Çok Yoğun' };
}

function buildAdvice(
  level: CrowdednessLevel,
  mode: TransitMode,
  isRainy: boolean
): string {
  if (level === 'very_high') {
    return isRainy
      ? 'Yağış ve yoğun saat nedeniyle ek sefer bekleme veya alternatif hat önerilir.'
      : mode === 'metrobus'
      ? 'Peronda yoğunluk yüksek; arka araç kapılarına yönelmek binişi hızlandırır.'
      : 'Pik saat yoğunluğu; vagon uç bölümleri nispeten daha rahattır.';
  }
  if (level === 'high') {
    return 'Hareketli saat dilimi; biniş için bir sonraki aracı beklemek konforu artırabilir.';
  }
  if (level === 'moderate') {
    return 'Dengeli yolcu akışı; normal bekleme süresiyle rahat biniş bekleniyor.';
  }
  return 'Durak sakin; doğrudan biniş için uygun zaman.';
}

function computeSimulatedLoad(params: {
  id: string;
  name: string;
  mode: TransitMode;
  location: LatLngPoint;
  baseOffset: number;
  isMajorHub?: boolean;
  isRainy?: boolean;
}): StopCrowdednessInfo {
  const now = new Date();
  const { hour, minute, weekdayIndex } = getIstanbulClockParts(now);
  const timeFloat = hour + minute / 60;
  const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;

  // Base Istanbul rush-hour curve
  let rushBase = 34;
  let trend: 'rising' | 'steady' | 'falling' = 'steady';

  if (!isWeekend) {
    if (timeFloat >= 7.0 && timeFloat < 10.0) {
      rushBase = timeFloat >= 7.75 && timeFloat <= 9.25 ? 78 : 66;
      trend = timeFloat < 8.6 ? 'rising' : 'falling';
    } else if (timeFloat >= 10.0 && timeFloat < 16.25) {
      rushBase = 48;
      trend = timeFloat > 15.5 ? 'rising' : 'steady';
    } else if (timeFloat >= 16.25 && timeFloat < 20.25) {
      rushBase = timeFloat >= 17.25 && timeFloat <= 19.25 ? 81 : 70;
      trend = timeFloat < 18.4 ? 'rising' : 'falling';
    } else if (timeFloat >= 20.25 && timeFloat < 23.5) {
      rushBase = 38;
      trend = 'falling';
    } else {
      rushBase = 18;
      trend = 'steady';
    }
  } else {
    if (timeFloat >= 11.5 && timeFloat < 20.5) {
      rushBase = 58;
      trend = timeFloat < 16 ? 'rising' : 'steady';
    } else if (timeFloat >= 20.5 && timeFloat < 23.5) {
      rushBase = 40;
      trend = 'falling';
    } else {
      rushBase = 20;
      trend = 'steady';
    }
  }

  const modeModifier: Record<TransitMode, number> = {
    metrobus: 10,
    metro: 7,
    marmaray: 6,
    tram: 4,
    bus: 2,
    ferry: -5,
  };

  const weatherModifier = params.isRainy ? (params.mode === 'ferry' ? -4 : 8) : 0;
  const jitter = (deterministicHash(`${params.id}-${hour}`) % 13) - 6;

  const rawPercent =
    rushBase +
    (modeModifier[params.mode] || 0) +
    params.baseOffset +
    weatherModifier +
    jitter;
  const occupancyPercent = Math.max(8, Math.min(98, Math.round(rawPercent)));
  const { level, label } = getLevelMeta(occupancyPercent);

  const baseWait =
    params.mode === 'metrobus'
      ? 2
      : params.mode === 'metro'
      ? 4
      : params.mode === 'tram'
      ? 5
      : params.mode === 'marmaray'
      ? 7
      : params.mode === 'ferry'
      ? 14
      : 8;

  const estimatedWaitMinutes =
    level === 'very_high' ? baseWait + 3 : level === 'high' ? baseWait + 1 : baseWait;

  return {
    stopId: params.id,
    stopName: params.name,
    mode: params.mode,
    location: params.location,
    occupancyPercent,
    level,
    label,
    trend,
    estimatedWaitMinutes,
    advice: buildAdvice(level, params.mode, Boolean(params.isRainy)),
    updatedAtIso: now.toISOString(),
    isMajorHub: params.isMajorHub,
  };
}

/**
 * Simulates an asynchronous Istanbul transit crowdedness telemetry endpoint
 * covering both major Istanbul interchange hubs and active nearby stops.
 */
export async function fetchStopCrowdednessOverlay(options: {
  nearbyStops: TransitStop[];
  isRainy?: boolean;
}): Promise<{
  majorHubs: StopCrowdednessInfo[];
  byStopId: Record<string, StopCrowdednessInfo>;
}> {
  // Brief simulated network latency
  await new Promise((resolve) => window.setTimeout(resolve, 140));

  const majorHubs = MAJOR_ISTANBUL_HUBS.map((hub) =>
    computeSimulatedLoad({
      id: hub.id,
      name: hub.name,
      mode: hub.mode,
      location: hub.location,
      baseOffset: hub.baseLoadOffset,
      isMajorHub: true,
      isRainy: options.isRainy,
    })
  );

  const byStopId: Record<string, StopCrowdednessInfo> = {};
  for (const hub of majorHubs) {
    byStopId[hub.stopId] = hub;
  }

  for (const stop of options.nearbyStops) {
    const isHubName = /taksim|kadıköy|üsküdar|yenikapı|zincirlikuyu|mecidiyeköy|eminönü|cevizlibağ|söğütlüçeşme|bostancı|bakırköy|beşiktaş/i.test(
      stop.name
    );
    byStopId[stop.id] = computeSimulatedLoad({
      id: stop.id,
      name: stop.name,
      mode: stop.mode,
      location: stop.location,
      baseOffset: isHubName ? 10 : 0,
      isMajorHub: isHubName,
      isRainy: options.isRainy,
    });
  }

  return { majorHubs, byStopId };
}
