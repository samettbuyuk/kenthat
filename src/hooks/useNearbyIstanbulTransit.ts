import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  ISTANBUL_MARMARAY_STATIONS,
  ISTANBUL_METROBUS_STATIONS,
  ISTANBUL_METRO_STATIONS,
  ISTANBUL_TRAM_STATIONS,
  type IstanbulStationSeed,
} from '../data/istanbulStations';
import type { LatLngPoint, TransitMode, TransitStop } from '../types/transit';
import {
  TRANSIT_MODE_ORDER,
  classifyIstanbulTransitMode,
  estimateWalkingMinutes,
  haversineDistanceMeters,
  isStationExitOrNonStop,
  isTransitPlaceEntity,
} from '../utils/transitUtils';

interface UseNearbyIstanbulTransitResult {
  closestByMode: Partial<Record<TransitMode, TransitStop>>;
  stopsForMap: TransitStop[];
  isLoading: boolean;
  isComputingWalking: boolean;
  error: string | null;
  refreshStops: () => void;
}

const PLACE_FIELDS = [
  'id',
  'displayName',
  'location',
  'shortFormattedAddress',
  'formattedAddress',
  'primaryType',
  'types',
  'googleMapsURI',
];

function isFünikülerOrMarmarayName(normalized: string): boolean {
  return (
    normalized.includes('marmaray') ||
    normalized.includes('füniküler') ||
    normalized.includes('funikuler') ||
    normalized.includes('tünel')
  );
}

function hasTramNameOrCode(normalized: string): boolean {
  return (
    normalized.includes('tramvay') ||
    normalized.includes('nostaljik') ||
    /\b(t1|t2|t3|t4|t5|tram)\b/.test(normalized)
  );
}

function hasMetroNameOrCode(normalized: string): boolean {
  return (
    normalized.includes('metro') ||
    /\b(m1|m1a|m1b|m2|m3|m4|m5|m6|m7|m8|m9|m11)\b/.test(normalized)
  );
}

function parsePlaceToStop(
  place: google.maps.places.Place,
  origin: LatLngPoint,
  expectedMode?: TransitMode
): TransitStop | null {
  if (!place.location || !place.id) return null;
  const name = place.displayName || '';
  const primaryType = place.primaryType;
  const types = place.types || [];

  if (!isTransitPlaceEntity(primaryType, types)) {
    return null;
  }

  if (isStationExitOrNonStop(name)) {
    return null;
  }

  const normalized = name.toLocaleLowerCase('tr-TR');
  let mode: TransitMode | null = null;

  if (expectedMode === 'metrobus') {
    if (normalized.includes('metrobüs') || normalized.includes('metrobus')) {
      mode = 'metrobus';
    } else {
      return null;
    }
  } else if (expectedMode === 'marmaray') {
    const isOtherStationType =
      primaryType === 'subway_station' ||
      primaryType === 'light_rail_station' ||
      primaryType === 'ferry_terminal' ||
      primaryType === 'bus_stop' ||
      primaryType === 'bus_station' ||
      types.includes('subway_station') ||
      types.includes('light_rail_station') ||
      types.includes('ferry_terminal');

    const hasOtherModeWord =
      normalized.includes('metrobüs') ||
      normalized.includes('metrobus') ||
      normalized.includes('tramvay') ||
      normalized.includes('vapur') ||
      normalized.includes('iskele') ||
      normalized.includes('haydarpaşa') ||
      normalized.includes('yht') ||
      (normalized.includes('metro') && !normalized.includes('marmaray'));

    if (
      !isOtherStationType &&
      !hasOtherModeWord &&
      (normalized.includes('marmaray') ||
        primaryType === 'train_station' ||
        types.includes('train_station'))
    ) {
      mode = 'marmaray';
    } else {
      return null;
    }
  } else if (expectedMode === 'metro') {
    if (
      primaryType !== 'bus_stop' &&
      primaryType !== 'light_rail_station' &&
      !isFünikülerOrMarmarayName(normalized) &&
      !hasTramNameOrCode(normalized) &&
      !normalized.includes('metrobüs') &&
      !normalized.includes('metrobus') &&
      (primaryType === 'subway_station' ||
        types.includes('subway_station') ||
        hasMetroNameOrCode(normalized))
    ) {
      mode = 'metro';
    } else {
      return null;
    }
  } else if (expectedMode === 'tram') {
    const isSubwayPrimaryOrOnly =
      primaryType === 'subway_station' || types.includes('subway_station');
    if (
      primaryType !== 'bus_stop' &&
      !isSubwayPrimaryOrOnly &&
      !normalized.includes('marmaray') &&
      !normalized.includes('metrobüs') &&
      !normalized.includes('metrobus') &&
      (!hasMetroNameOrCode(normalized) || normalized.includes('tramvay')) &&
      (hasTramNameOrCode(normalized) ||
        normalized.includes('füniküler') ||
        normalized.includes('funikuler'))
    ) {
      mode = 'tram';
    } else {
      return null;
    }
  } else if (expectedMode === 'ferry') {
    if (
      primaryType === 'ferry_terminal' ||
      types.includes('ferry_terminal') ||
      (primaryType !== 'bus_stop' &&
        /\b(vapur|iskele|iskelesi|ido|i̇do|şehir hatları|turyol|dentur|feribot)\b/.test(
          normalized
        ))
    ) {
      mode = 'ferry';
    } else {
      return null;
    }
  } else if (expectedMode === 'bus') {
    if (
      !normalized.includes('metrobüs') &&
      !normalized.includes('metrobus') &&
      (primaryType === 'bus_stop' ||
        (!normalized.includes('marmaray') &&
          !normalized.includes('metro') &&
          !normalized.includes('tramvay')))
    ) {
      mode = 'bus';
    } else {
      return null;
    }
  } else {
    mode = classifyIstanbulTransitMode(name, primaryType, types);
  }

  if (!mode) return null;

  const lat = place.location.lat();
  const lng = place.location.lng();
  const distanceMeters = haversineDistanceMeters(origin, { lat, lng });

  return {
    id: place.id,
    name: name || 'Toplu Taşıma Durağı',
    address: place.shortFormattedAddress || place.formattedAddress || 'İstanbul',
    location: { lat, lng },
    mode,
    placeTypes: types,
    googleMapsUri: place.googleMapsURI || undefined,
    distanceMeters,
    walkingMinutes: estimateWalkingMinutes(distanceMeters),
    isExactRouteMatrix: false,
    isWalkable: true,
  };
}

function getNearestSeeds(
  seeds: IstanbulStationSeed[],
  origin: LatLngPoint,
  limit: number
): IstanbulStationSeed[] {
  return [...seeds]
    .sort(
      (a, b) =>
        haversineDistanceMeters(origin, a.location) -
        haversineDistanceMeters(origin, b.location)
    )
    .slice(0, limit);
}

async function resolveSeedWithPlaces(
  placesLib: google.maps.PlacesLibrary,
  seed: IstanbulStationSeed,
  origin: LatLngPoint
): Promise<TransitStop> {
  const fallbackDist = haversineDistanceMeters(origin, seed.location);
  const fallbackStop: TransitStop = {
    id: seed.id,
    name: seed.name,
    address: `İstanbul · ${seed.lines.join(', ')}`,
    location: seed.location,
    mode: seed.mode,
    placeTypes:
      seed.mode === 'metro'
        ? ['subway_station', 'transit_station']
        : seed.mode === 'tram'
        ? ['light_rail_station', 'transit_station']
        : seed.mode === 'marmaray'
        ? ['train_station', 'transit_station']
        : ['bus_station', 'transit_station'],
    distanceMeters: fallbackDist,
    walkingMinutes: estimateWalkingMinutes(fallbackDist),
    isExactRouteMatrix: false,
    isWalkable: true,
    lineHintLabel: seed.lines.join(' · '),
  };

  try {
    const { places } = await placesLib.Place.searchByText({
      fields: PLACE_FIELDS,
      textQuery: seed.searchQuery,
      locationBias: { center: seed.location, radius: 650 },
      maxResultCount: 4,
      language: 'tr',
      region: 'TR',
      internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
    });

    if (places && places.length > 0) {
      for (const p of places) {
        if (!p.location || !p.id) continue;
        const pLoc = { lat: p.location.lat(), lng: p.location.lng() };
        const offsetFromSeed = haversineDistanceMeters(seed.location, pLoc);
        const pName = (p.displayName || '').toLocaleLowerCase('tr-TR');
        const pTypes = p.types || [];

        const maxSeedOffset = seed.mode === 'marmaray' ? 450 : 900;
        if (offsetFromSeed > maxSeedOffset) continue;
        if (!isTransitPlaceEntity(p.primaryType, pTypes)) continue;
        if (isStationExitOrNonStop(p.displayName || '')) continue;
        if (p.primaryType === 'bus_stop') continue;

        if (seed.mode === 'metrobus' && p.primaryType === 'subway_station') continue;
        if (seed.mode === 'marmaray') {
          const isWrongStationType =
            p.primaryType === 'subway_station' ||
            p.primaryType === 'light_rail_station' ||
            p.primaryType === 'ferry_terminal' ||
            p.primaryType === 'bus_station' ||
            pTypes.includes('subway_station') ||
            pTypes.includes('light_rail_station') ||
            pTypes.includes('ferry_terminal');
          if (
            isWrongStationType ||
            pName.includes('metrobüs') ||
            pName.includes('metrobus') ||
            hasTramNameOrCode(pName) ||
            (pName.includes('metro') && !pName.includes('marmaray')) ||
            pName.includes('vapur') ||
            pName.includes('iskele')
          ) {
            continue;
          }
        }
        if (
          seed.mode === 'metro' &&
          (pName.includes('metrobüs') ||
            hasTramNameOrCode(pName) ||
            p.primaryType === 'light_rail_station')
        ) {
          continue;
        }
        if (
          seed.mode === 'tram' &&
          (p.primaryType === 'subway_station' ||
            pTypes.includes('subway_station') ||
            (hasMetroNameOrCode(pName) && !pName.includes('tramvay')) ||
            pName.includes('marmaray') ||
            pName.includes('metrobüs'))
        ) {
          continue;
        }

        const resolvedName =
          seed.mode === 'marmaray' && !pName.includes('marmaray')
            ? seed.name
            : p.displayName || seed.name;

        const dist = haversineDistanceMeters(origin, pLoc);
        return {
          id: p.id,
          name: resolvedName,
          address: p.shortFormattedAddress || p.formattedAddress || 'İstanbul',
          location: pLoc,
          mode: seed.mode,
          placeTypes: pTypes.length > 0 ? pTypes : fallbackStop.placeTypes,
          googleMapsUri: p.googleMapsURI || undefined,
          distanceMeters: dist,
          walkingMinutes: estimateWalkingMinutes(dist),
          isExactRouteMatrix: false,
          isWalkable: true,
          lineHintLabel: seed.lines.join(' · '),
        };
      }
    }
  } catch (err) {
    console.warn(`Station resolve fallback for ${seed.name}:`, err);
  }

  return fallbackStop;
}

function selectBestStopPerMode(
  candidatesByMode: Record<TransitMode, TransitStop[]>
): Partial<Record<TransitMode, TransitStop>> {
  const result: Partial<Record<TransitMode, TransitStop>> = {};
  const usedIds = new Set<string>();

  // Prioritize distinct rail/BRT modes before tram & bus so shared hub IDs never repeat across Metro and Tramvay
  const priorityOrder: TransitMode[] = [
    'metro',
    'marmaray',
    'metrobus',
    'tram',
    'ferry',
    'bus',
  ];

  for (const mode of priorityOrder) {
    const list = candidatesByMode[mode];
    if (!list || list.length === 0) continue;

    const sorted = [...list].sort((a, b) => {
      const aWalk = a.isWalkable !== false ? 0 : 1;
      const bWalk = b.isWalkable !== false ? 0 : 1;
      if (aWalk !== bWalk) return aWalk - bWalk;

      if (mode === 'tram') {
        const aTram = a.lineHintLabel || a.name.toLocaleLowerCase('tr-TR').includes('tramvay') ? 0 : 1;
        const bTram = b.lineHintLabel || b.name.toLocaleLowerCase('tr-TR').includes('tramvay') ? 0 : 1;
        if (aTram !== bTram) return aTram - bTram;
      }

      const aExact = a.isExactRouteMatrix ? 0 : 1;
      const bExact = b.isExactRouteMatrix ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      return a.distanceMeters - b.distanceMeters;
    });

    const chosen = sorted.find((s) => !usedIds.has(s.id)) || sorted[0];
    usedIds.add(chosen.id);
    result[mode] = chosen;
  }
  return result;
}

export function useNearbyIstanbulTransit(
  userLocation: LatLngPoint | null
): UseNearbyIstanbulTransitResult {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [closestByMode, setClosestByMode] = useState<
    Partial<Record<TransitMode, TransitStop>>
  >({});
  const [stopsForMap, setStopsForMap] = useState<TransitStop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComputingWalking, setIsComputingWalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const activeRequestRef = useRef(0);

  const refreshStops = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!userLocation || !placesLib) {
      if (!userLocation) {
        setClosestByMode({});
        setStopsForMap([]);
      }
      return;
    }

    const requestId = ++activeRequestRef.current;
    let cancelled = false;

    async function loadAccurateTransit() {
      if (!userLocation || !placesLib) return;
      setIsLoading(true);
      setError(null);

      const { Place, SearchNearbyRankPreference, SearchByTextRankPreference } =
        placesLib;

      const candidatesByMode: Record<TransitMode, Record<string, TransitStop>> = {
        bus: {},
        metrobus: {},
        metro: {},
        marmaray: {},
        tram: {},
        ferry: {},
      };

      const mergeStopCandidate = (stop: TransitStop) => {
        const bucket = candidatesByMode[stop.mode];
        if (bucket[stop.id]) {
          if (!bucket[stop.id].lineHintLabel && stop.lineHintLabel) {
            bucket[stop.id] = { ...bucket[stop.id], lineHintLabel: stop.lineHintLabel };
          }
          return;
        }
        const existingNearby = Object.values(bucket).find(
          (ex) => haversineDistanceMeters(ex.location, stop.location) < 85
        );
        if (existingNearby) {
          const existingIsSeed =
            existingNearby.id.startsWith('mb-') ||
            existingNearby.id.startsWith('mr-') ||
            existingNearby.id.startsWith('m') ||
            existingNearby.id.startsWith('t');
          const newIsRealPlace =
            !stop.id.startsWith('mb-') &&
            !stop.id.startsWith('mr-') &&
            !stop.id.startsWith('t1-') &&
            !stop.id.startsWith('t2-') &&
            !stop.id.startsWith('t3-') &&
            !stop.id.startsWith('t4-') &&
            !stop.id.startsWith('t5-') &&
            stop.id.length > 14;
          if (existingIsSeed && newIsRealPlace) {
            delete bucket[existingNearby.id];
            const keptName =
              stop.mode === 'marmaray' &&
              !stop.name.toLocaleLowerCase('tr-TR').includes('marmaray')
                ? existingNearby.name
                : stop.name;
            bucket[stop.id] = {
              ...stop,
              name: keptName,
              lineHintLabel: stop.lineHintLabel || existingNearby.lineHintLabel,
            };
          } else if (!existingNearby.lineHintLabel && stop.lineHintLabel) {
            bucket[existingNearby.id] = {
              ...existingNearby,
              lineHintLabel: stop.lineHintLabel,
            };
          }
          return;
        }
        bucket[stop.id] = stop;
      };

      const addPlaceCandidate = (
        place: google.maps.places.Place,
        expectedMode?: TransitMode
      ) => {
        const parsed = parsePlaceToStop(place, userLocation, expectedMode);
        if (parsed) mergeStopCandidate(parsed);
      };

      try {
        // 1. Authoritative nearest Metrobüs (3), Marmaray (3), Metro (3), Tramvay (3) resolved directly to Google Places
        const metrobusSeeds = getNearestSeeds(ISTANBUL_METROBUS_STATIONS, userLocation, 3);
        const marmaraySeeds = getNearestSeeds(ISTANBUL_MARMARAY_STATIONS, userLocation, 3);
        const metroSeeds = getNearestSeeds(ISTANBUL_METRO_STATIONS, userLocation, 3);
        const tramSeeds = getNearestSeeds(ISTANBUL_TRAM_STATIONS, userLocation, 3);

        const seedResolutionsPromise = Promise.allSettled([
          ...metrobusSeeds.map((seed) => resolveSeedWithPlaces(placesLib, seed, userLocation)),
          ...marmaraySeeds.map((seed) => resolveSeedWithPlaces(placesLib, seed, userLocation)),
          ...metroSeeds.map((seed) => resolveSeedWithPlaces(placesLib, seed, userLocation)),
          ...tramSeeds.map((seed) => resolveSeedWithPlaces(placesLib, seed, userLocation)),
        ]);

        // 2. Direct live Google Places queries for all 6 modes sorted strictly by DISTANCE
        const placeQueriesPromise = Promise.allSettled([
          // Otobüs (İETT)
          Place.searchNearby({
            fields: PLACE_FIELDS,
            locationRestriction: { center: userLocation, radius: 2200 },
            includedPrimaryTypes: ['bus_stop', 'bus_station'],
            maxResultCount: 10,
            rankPreference: SearchNearbyRankPreference.DISTANCE,
            language: 'tr',
            region: 'TR',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          }).then((r) => ({ mode: 'bus' as TransitMode, places: r.places || [] })),

          // Metro (strict subway_station, excluding light_rail / tram / marmaray)
          Place.searchNearby({
            fields: PLACE_FIELDS,
            locationRestriction: { center: userLocation, radius: 10000 },
            includedPrimaryTypes: ['subway_station'],
            maxResultCount: 10,
            rankPreference: SearchNearbyRankPreference.DISTANCE,
            language: 'tr',
            region: 'TR',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          }).then((r) => ({ mode: 'metro' as TransitMode, places: r.places || [] })),

          // Metrobüs text backup
          Place.searchByText({
            fields: PLACE_FIELDS,
            textQuery: 'Metrobüs',
            locationBias: { center: userLocation, radius: 18000 },
            rankPreference: SearchByTextRankPreference.DISTANCE,
            maxResultCount: 10,
            language: 'tr',
            region: 'TR',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          }).then((r) => ({ mode: 'metrobus' as TransitMode, places: r.places || [] })),

          // Marmaray text backup
          Place.searchByText({
            fields: PLACE_FIELDS,
            textQuery: 'Marmaray',
            locationBias: { center: userLocation, radius: 18000 },
            rankPreference: SearchByTextRankPreference.DISTANCE,
            maxResultCount: 10,
            language: 'tr',
            region: 'TR',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          }).then((r) => ({ mode: 'marmaray' as TransitMode, places: r.places || [] })),

          // Tramvay explicit text backup (strictly excludes subway_station & metro)
          Place.searchByText({
            fields: PLACE_FIELDS,
            textQuery: 'Tramvay Durağı',
            locationBias: { center: userLocation, radius: 16000 },
            rankPreference: SearchByTextRankPreference.DISTANCE,
            maxResultCount: 10,
            language: 'tr',
            region: 'TR',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          }).then((r) => ({ mode: 'tram' as TransitMode, places: r.places || [] })),

          // Vapur / İskele
          Place.searchNearby({
            fields: PLACE_FIELDS,
            locationRestriction: { center: userLocation, radius: 16000 },
            includedPrimaryTypes: ['ferry_terminal'],
            maxResultCount: 8,
            rankPreference: SearchNearbyRankPreference.DISTANCE,
            language: 'tr',
            region: 'TR',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          }).then((r) => ({ mode: 'ferry' as TransitMode, places: r.places || [] })),

          Place.searchByText({
            fields: PLACE_FIELDS,
            textQuery: 'Vapur İskelesi',
            includedType: 'ferry_terminal',
            locationBias: { center: userLocation, radius: 22000 },
            rankPreference: SearchByTextRankPreference.DISTANCE,
            maxResultCount: 6,
            language: 'tr',
            region: 'TR',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          }).then((r) => ({ mode: 'ferry' as TransitMode, places: r.places || [] })),
        ]);

        const [seedResolutions, placeQueries] = await Promise.all([
          seedResolutionsPromise,
          placeQueriesPromise,
        ]);

        if (cancelled || activeRequestRef.current !== requestId) return;

        for (const res of seedResolutions) {
          if (res.status === 'fulfilled') {
            mergeStopCandidate(res.value);
          }
        }

        for (const res of placeQueries) {
          if (res.status === 'fulfilled') {
            const { mode, places } = res.value;
            places.forEach((p) => addPlaceCandidate(p, mode));
          }
        }

        // Top 4 geodesic candidates per mode -> real WALKING route matrix
        const topCandidatesByMode: Record<TransitMode, TransitStop[]> = {
          bus: [],
          metrobus: [],
          metro: [],
          marmaray: [],
          tram: [],
          ferry: [],
        };

        const flatCandidates: TransitStop[] = [];
        for (const mode of TRANSIT_MODE_ORDER) {
          const sorted = Object.values(candidatesByMode[mode])
            .sort((a, b) => a.distanceMeters - b.distanceMeters)
            .slice(0, 4);
          topCandidatesByMode[mode] = sorted;
          flatCandidates.push(...sorted);
        }

        if (flatCandidates.length === 0) {
          setClosestByMode({});
          setStopsForMap([]);
          setError(
            'Bu konum çevresinde toplu taşıma durağı bulunamadı. Haritadan başka bir nokta seçebilirsiniz.'
          );
          setIsLoading(false);
          return;
        }

        const initialClosest = selectBestStopPerMode(topCandidatesByMode);
        setClosestByMode(initialClosest);
        setStopsForMap(
          Object.values(initialClosest).filter(
            (s): s is TransitStop => Boolean(s)
          )
        );
        setIsLoading(false);

        // Compute REAL WALKING routes (travelMode: 'WALKING') for all candidates
        if (routesLib) {
          setIsComputingWalking(true);

          const updatedMap: Record<string, TransitStop> = {};
          for (const c of flatCandidates) {
            updatedMap[c.id] = c;
          }

          let matrixSucceeded = false;

          if (routesLib.RouteMatrix) {
            try {
              const { matrix } = await routesLib.RouteMatrix.computeRouteMatrix({
                origins: [userLocation],
                destinations: flatCandidates.map((c) => c.location),
                travelMode: 'WALKING' as google.maps.TravelModeString,
                fields: ['distanceMeters', 'durationMillis', 'condition'],
                language: 'tr',
                region: 'TR',
                internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
              });

              if (cancelled || activeRequestRef.current !== requestId) return;

              const items = matrix.rows?.[0]?.items || [];
              if (items.length > 0) {
                matrixSucceeded = true;
                flatCandidates.forEach((cand, idx) => {
                  const item = items[idx];
                  if (
                    item &&
                    item.condition === 'ROUTE_EXISTS' &&
                    typeof item.distanceMeters === 'number' &&
                    typeof item.durationMillis === 'number'
                  ) {
                    updatedMap[cand.id] = {
                      ...cand,
                      distanceMeters: item.distanceMeters,
                      walkingMinutes: Math.max(
                        1,
                        Math.round(item.durationMillis / 60000)
                      ),
                      isExactRouteMatrix: true,
                      isWalkable: true,
                    };
                  } else if (item && item.condition === 'ROUTE_NOT_FOUND') {
                    updatedMap[cand.id] = {
                      ...cand,
                      isExactRouteMatrix: true,
                      isWalkable: false,
                    };
                  }
                });
              }
            } catch (matrixErr) {
              console.warn('RouteMatrix WALKING fallback to Route.computeRoutes:', matrixErr);
            }
          }

          if (!matrixSucceeded && routesLib.Route) {
            const perModeTargets: TransitStop[] = [];
            for (const mode of TRANSIT_MODE_ORDER) {
              perModeTargets.push(...topCandidatesByMode[mode].slice(0, 2));
            }

            const routeResults = await Promise.allSettled(
              perModeTargets.map((cand) =>
                routesLib.Route.computeRoutes({
                  origin: userLocation,
                  destination: cand.location,
                  travelMode: 'WALKING' as google.maps.TravelModeString,
                  fields: ['distanceMeters', 'durationMillis'],
                  language: 'tr',
                  region: 'TR',
                  internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
                }).then((res) => ({ cand, route: res.routes?.[0] }))
              )
            );

            if (cancelled || activeRequestRef.current !== requestId) return;

            for (const r of routeResults) {
              if (r.status === 'fulfilled') {
                const { cand, route } = r.value;
                if (
                  route &&
                  typeof route.distanceMeters === 'number' &&
                  typeof route.durationMillis === 'number'
                ) {
                  updatedMap[cand.id] = {
                    ...cand,
                    distanceMeters: route.distanceMeters,
                    walkingMinutes: Math.max(
                      1,
                      Math.round(route.durationMillis / 60000)
                    ),
                    isExactRouteMatrix: true,
                    isWalkable: true,
                  };
                }
              }
            }
          }

          const finalByMode: Record<TransitMode, TransitStop[]> = {
            bus: [],
            metrobus: [],
            metro: [],
            marmaray: [],
            tram: [],
            ferry: [],
          };

          for (const mode of TRANSIT_MODE_ORDER) {
            finalByMode[mode] = topCandidatesByMode[mode].map(
              (c) => updatedMap[c.id] || c
            );
          }

          const finalClosest = selectBestStopPerMode(finalByMode);
          setClosestByMode(finalClosest);
          setStopsForMap(
            Object.values(finalClosest).filter(
              (s): s is TransitStop => Boolean(s)
            )
          );
          setIsComputingWalking(false);
        }
      } catch (err) {
        if (cancelled || activeRequestRef.current !== requestId) return;
        console.error('Nearby Istanbul transit lookup error:', err);
        setError('Durak verileri alınırken bir hata oluştu. Lütfen tekrar deneyin.');
        setIsLoading(false);
        setIsComputingWalking(false);
      }
    }

    void loadAccurateTransit();

    return () => {
      cancelled = true;
    };
  }, [userLocation, placesLib, routesLib, reloadToken]);

  return {
    closestByMode,
    stopsForMap,
    isLoading,
    isComputingWalking,
    error,
    refreshStops,
  };
}
