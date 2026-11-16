import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type {
  LatLngPoint,
  StopTransitDetails,
  TransitLineDeparture,
  TransitMode,
  TransitPlatformInfo,
  TransitStop,
} from '../types/transit';
import { haversineDistanceMeters } from '../utils/transitUtils';

interface UseStopTransitDetailsResult {
  details: StopTransitDetails | null;
  isLoading: boolean;
  error: string | null;
  refreshDetails: () => void;
}

const MODE_REGIONAL_HUBS: Record<
  TransitMode,
  Array<{ name: string; location: LatLngPoint }>
> = {
  metrobus: [
    { name: 'Beylikdüzü Sondurak', location: { lat: 41.0235, lng: 28.6256 } },
    { name: 'Cevizlibağ', location: { lat: 41.0155, lng: 28.9144 } },
    { name: 'Zincirlikuyu', location: { lat: 41.0672, lng: 29.0138 } },
    { name: 'Söğütlüçeşme', location: { lat: 40.9912, lng: 29.0367 } },
  ],
  marmaray: [
    { name: 'Halkalı', location: { lat: 41.0169, lng: 28.7654 } },
    { name: 'Yenikapı', location: { lat: 41.0049, lng: 28.9517 } },
    { name: 'Üsküdar', location: { lat: 41.0262, lng: 29.0154 } },
    { name: 'Pendik', location: { lat: 40.8781, lng: 29.2335 } },
  ],
  metro: [
    { name: 'Taksim', location: { lat: 41.0372, lng: 28.9854 } },
    { name: 'Yenikapı', location: { lat: 41.0056, lng: 28.9519 } },
    { name: 'Levent', location: { lat: 41.0772, lng: 29.0124 } },
    { name: 'Kadıköy', location: { lat: 40.9904, lng: 29.0226 } },
    { name: 'Ümraniye', location: { lat: 41.0251, lng: 29.0954 } },
    { name: 'Otogar', location: { lat: 41.0394, lng: 28.8944 } },
  ],
  tram: [
    { name: 'Kabataş', location: { lat: 41.0338, lng: 28.9921 } },
    { name: 'Bağcılar', location: { lat: 41.0341, lng: 28.8569 } },
    { name: 'Eminönü', location: { lat: 41.0175, lng: 28.9708 } },
    { name: 'Alibeyköy Cep Otogarı', location: { lat: 41.0872, lng: 28.9478 } },
    { name: 'Topkapı', location: { lat: 41.0183, lng: 28.9203 } },
    { name: 'Mescid-i Selam', location: { lat: 41.1195, lng: 28.8672 } },
    { name: 'Moda Caddesi', location: { lat: 40.9825, lng: 29.0269 } },
    { name: 'Tünel Meydanı', location: { lat: 41.0285, lng: 28.9739 } },
  ],
  ferry: [
    { name: 'Kadıköy İskele', location: { lat: 40.9921, lng: 29.0231 } },
    { name: 'Beşiktaş İskele', location: { lat: 41.0414, lng: 29.0074 } },
    { name: 'Eminönü İskele', location: { lat: 41.0177, lng: 28.9742 } },
    { name: 'Üsküdar İskele', location: { lat: 41.0273, lng: 29.0152 } },
  ],
  bus: [
    { name: 'Taksim', location: { lat: 41.037, lng: 28.985 } },
    { name: 'Kadıköy', location: { lat: 40.9906, lng: 29.0235 } },
    { name: 'Yenikapı', location: { lat: 41.0052, lng: 28.9519 } },
    { name: 'Mecidiyeköy', location: { lat: 41.0668, lng: 28.9949 } },
    { name: 'Bakırköy', location: { lat: 40.9804, lng: 28.8726 } },
    { name: 'Üsküdar', location: { lat: 41.0261, lng: 29.0152 } },
  ],
};

function getAllowedTransitModes(
  mode: TransitMode
): google.maps.TransitModeString[] | undefined {
  switch (mode) {
    case 'bus':
    case 'metrobus':
      return ['BUS'];
    case 'metro':
      return ['SUBWAY'];
    case 'marmaray':
      return ['TRAIN', 'RAIL'];
    case 'tram':
      return ['TRAM'];
    case 'ferry':
      return undefined;
  }
}

function isGooglePlaceId(id: string): boolean {
  return (
    id.length > 14 &&
    !id.startsWith('mb-') &&
    !id.startsWith('mr-') &&
    !id.startsWith('m1-') &&
    !id.startsWith('m2-') &&
    !id.startsWith('m4-') &&
    !id.startsWith('m5-') &&
    !id.startsWith('m6-') &&
    !id.startsWith('m7-') &&
    !id.startsWith('m8-') &&
    !id.startsWith('t1-') &&
    !id.startsWith('t2-') &&
    !id.startsWith('t3-') &&
    !id.startsWith('t4-') &&
    !id.startsWith('t5-')
  );
}

function matchesModeLine(
  stopMode: TransitMode,
  lineCode: string,
  lineName: string,
  vehicleType?: string | null
): boolean {
  const codeUp = lineCode.toUpperCase();
  const nameLow = lineName.toLocaleLowerCase('tr-TR');
  const vt = (vehicleType || '').toUpperCase();

  if (stopMode === 'metrobus') {
    return codeUp.startsWith('34') || nameLow.includes('metrobüs');
  }
  if (stopMode === 'marmaray') {
    return (
      codeUp === 'B1' ||
      codeUp.includes('MARMARAY') ||
      nameLow.includes('marmaray') ||
      vt === 'COMMUTER_TRAIN' ||
      vt === 'RAIL' ||
      vt === 'HEAVY_RAIL'
    );
  }
  if (stopMode === 'metro') {
    if (
      nameLow.includes('marmaray') ||
      nameLow.includes('tramvay') ||
      nameLow.includes('nostaljik') ||
      codeUp.startsWith('34') ||
      /^[TF]\d+/.test(codeUp) ||
      vt === 'TRAM' ||
      vt === 'FUNICULAR'
    ) {
      return false;
    }
    return /^M\d+/.test(codeUp) || vt === 'SUBWAY' || vt === 'METRO_RAIL';
  }
  if (stopMode === 'tram') {
    if (
      /^M\d+/.test(codeUp) ||
      vt === 'SUBWAY' ||
      vt === 'METRO_RAIL' ||
      nameLow.includes('marmaray') ||
      codeUp.startsWith('34') ||
      (nameLow.includes('metro') && !nameLow.includes('tramvay'))
    ) {
      return false;
    }
    return (
      /^[TF]\d+/.test(codeUp) ||
      vt === 'TRAM' ||
      vt === 'LIGHT_RAIL' ||
      vt === 'FUNICULAR' ||
      nameLow.includes('tramvay') ||
      nameLow.includes('füniküler')
    );
  }
  if (stopMode === 'ferry') {
    return (
      vt === 'FERRY' ||
      nameLow.includes('vapur') ||
      nameLow.includes('hatları') ||
      nameLow.includes('ido') ||
      nameLow.includes('iskele')
    );
  }
  return true;
}

export function useStopTransitDetails(
  stop: TransitStop | null
): UseStopTransitDetailsResult {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [details, setDetails] = useState<StopTransitDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const requestRef = useRef(0);

  const refreshDetails = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!stop) {
      setDetails(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const activeStop = stop;
    const reqId = ++requestRef.current;
    let cancelled = false;

    async function fetchLiveStopData() {
      setIsLoading(true);
      setError(null);

      const agenciesSet = new Set<string>();
      const platforms: TransitPlatformInfo[] = [];
      const lineMap: Record<string, TransitLineDeparture> = {};

      // 1. Live Google Places TransitStation metadata (registered lines, colors, platforms)
      const stationMetaPromise = (async () => {
        if (!placesLib || !isGooglePlaceId(activeStop.id)) return;
        try {
          const place = new placesLib.Place({ id: activeStop.id });
          await place.fetchFields({
            fields: [
              'transitStation',
              'displayName',
              'shortFormattedAddress',
              'googleMapsURI',
            ],
          });
          if (cancelled || requestRef.current !== reqId) return;

          const ts = place.transitStation;
          if (ts) {
            for (const agency of ts.agencies || []) {
              if (agency.displayName) agenciesSet.add(agency.displayName);
              for (const line of agency.lines || []) {
                const code = (
                  line.shortDisplayName ||
                  line.displayName ||
                  ''
                ).trim();
                const fullName = (line.displayName || code).trim();
                if (!code) continue;
                if (
                  !matchesModeLine(
                    activeStop.mode,
                    code,
                    fullName,
                    line.vehicleType
                  )
                ) {
                  continue;
                }
                const key = `reg:${code.toUpperCase()}`;
                if (!lineMap[key]) {
                  lineMap[key] = {
                    id: key,
                    lineCode: code,
                    lineName: fullName,
                    vehicleType: line.vehicleType || undefined,
                    agencyName: agency.displayName || undefined,
                    color: line.backgroundColor || undefined,
                    textColor: line.textColor || undefined,
                    source: 'station-registry',
                  };
                }
              }
            }

            for (const p of ts.stops || []) {
              platforms.push({
                name: p.displayName || activeStop.name,
                stopCode: p.stopCode || undefined,
                platformCode: p.platformCode || undefined,
                signageText: p.signageText || undefined,
                wheelchairAccessible:
                  typeof p.hasWheelchairAccessibleEntrance === 'boolean'
                    ? p.hasWheelchairAccessibleEntrance
                    : undefined,
              });
            }
          }
        } catch (err) {
          // Non-fatal: some stops or API configs may not expose transitStation directly
          console.info('Place transitStation field skipped:', err);
        }
      })();

      // 2. Live Google Routes API TRANSIT queries to multiple directional hubs -> live departures, headsigns & headways
      const liveDeparturesPromise = (async () => {
        if (!routesLib?.Route) return;

        const minHubDistance = activeStop.mode === 'tram' ? 600 : 1200;
        const candidateHubs = MODE_REGIONAL_HUBS[activeStop.mode]
          .map((hub) => ({
            ...hub,
            dist: haversineDistanceMeters(activeStop.location, hub.location),
          }))
          .filter((hub) => hub.dist > minHubDistance)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 4);

        const allowedTransitModes = getAllowedTransitModes(activeStop.mode);
        const now = new Date();

        const results = await Promise.allSettled(
          candidateHubs.map((hub) =>
            routesLib.Route.computeRoutes({
              origin: activeStop.location,
              destination: hub.location,
              travelMode: 'TRANSIT' as google.maps.TravelModeString,
              computeAlternativeRoutes: true,
              departureTime: now,
              transitPreference: allowedTransitModes
                ? { allowedTransitModes }
                : undefined,
              fields: ['legs.steps.transitDetails', 'legs.steps.travelMode'],
              language: 'tr',
              region: 'TR',
              internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
            })
          )
        );

        if (cancelled || requestRef.current !== reqId) return;

        for (const res of results) {
          if (res.status !== 'fulfilled') continue;
          for (const route of res.value.routes || []) {
            const steps = route.legs?.[0]?.steps || [];
            for (const step of steps) {
              const td = step.transitDetails;
              if (!td || !td.transitLine) continue;

              // Ensure this transit boarding actually occurs at/near the selected stop
              const depLoc = td.departureStop?.location;
              if (depLoc) {
                const boardDist = haversineDistanceMeters(activeStop.location, {
                  lat: depLoc.lat,
                  lng: depLoc.lng,
                });
                if (boardDist > 600) continue;
              }

              const line = td.transitLine;
              const code = (line.shortName || line.name || '').trim();
              const fullName = (line.name || code).trim();
              if (!code) continue;

              const vt = line.vehicle?.vehicleType;
              if (!matchesModeLine(activeStop.mode, code, fullName, vt)) {
                continue;
              }

              const agencyName = line.agencies?.[0]?.name || undefined;
              if (agencyName) agenciesSet.add(agencyName);

              const headsign = (td.headsign || '').trim();
              const depTimeIso = td.departureTime
                ? td.departureTime.toISOString()
                : undefined;
              const headwayMinutes =
                typeof td.headwayMillis === 'number' &&
                Number.isFinite(td.headwayMillis) &&
                td.headwayMillis > 0 &&
                td.headwayMillis < 7200000
                  ? Math.max(1, Math.round(td.headwayMillis / 60000))
                  : undefined;

              const key = `live:${code.toUpperCase()}:${headsign.toLocaleLowerCase('tr-TR')}`;
              const existing = lineMap[key];

              // Keep earliest upcoming departure for same line+headsign
              if (
                !existing ||
                (depTimeIso &&
                  (!existing.departureTimeIso ||
                    depTimeIso < existing.departureTimeIso))
              ) {
                lineMap[key] = {
                  id: key,
                  lineCode: code,
                  lineName: fullName,
                  headsign: headsign || undefined,
                  vehicleType: vt || undefined,
                  agencyName,
                  color: line.color || undefined,
                  textColor: line.textColor || undefined,
                  departureTimeIso: depTimeIso,
                  headwayMinutes,
                  stopCount:
                    typeof td.stopCount === 'number' ? td.stopCount : undefined,
                  departureStopName: td.departureStop?.name || undefined,
                  source: 'live-route',
                };
              }

              // Remove generic registry duplicate for same lineCode once we have live directional departure(s)
              delete lineMap[`reg:${code.toUpperCase()}`];
            }
          }
        }
      })();

      try {
        await Promise.all([stationMetaPromise, liveDeparturesPromise]);
        if (cancelled || requestRef.current !== reqId) return;

        const mergedLines = Object.values(lineMap).sort((a, b) => {
          // Live routes with upcoming departure times first
          if (a.source !== b.source) {
            return a.source === 'live-route' ? -1 : 1;
          }
          if (a.departureTimeIso && b.departureTimeIso) {
            return a.departureTimeIso.localeCompare(b.departureTimeIso);
          }
          return a.lineCode.localeCompare(b.lineCode, 'tr');
        });

        setDetails({
          stopId: activeStop.id,
          stationName: activeStop.name,
          address: activeStop.address,
          googleMapsUri: activeStop.googleMapsUri,
          agencies: Array.from(agenciesSet),
          lines: mergedLines,
          platforms,
          fetchedAtIso: new Date().toISOString(),
        });
      } catch (err) {
        if (cancelled || requestRef.current !== reqId) return;
        console.error('Failed to load stop transit details:', err);
        setError('Duraktan geçen hat bilgileri şu anda alınamadı.');
      } finally {
        if (!cancelled && requestRef.current === reqId) {
          setIsLoading(false);
        }
      }
    }

    void fetchLiveStopData();

    return () => {
      cancelled = true;
    };
  }, [stop, placesLib, routesLib, reloadTick]);

  return {
    details,
    isLoading,
    error,
    refreshDetails,
  };
}
