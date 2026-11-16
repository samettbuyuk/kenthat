import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type {
  LatLngPoint,
  TransferEndpoint,
  TransferJourneyOption,
  TransferStepItem,
} from '../types/transit';
import {
  calculateWalkingMinutes,
  inferTransitModeFromVehicle,
} from '../utils/transitUtils';

interface UseTransitTransferRoutesResult {
  journeys: TransferJourneyOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function toLatLngArray(
  path?: google.maps.LatLngAltitude[] | null
): LatLngPoint[] | undefined {
  if (!path || path.length === 0) return undefined;
  return path.map((pt) => ({ lat: pt.lat, lng: pt.lng }));
}

export function useTransitTransferRoutes(
  origin: TransferEndpoint | null,
  destination: TransferEndpoint | null,
  walkingSpeedKmh: number
): UseTransitTransferRoutesResult {
  const routesLib = useMapsLibrary('routes');

  const [rawRoutes, setRawRoutes] = useState<google.maps.routes.Route[]>([]);
  const [journeys, setJourneys] = useState<TransferJourneyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reqRef = useRef(0);

  const refresh = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  // Fetch live multi-modal TRANSIT journeys whenever origin or destination changes
  useEffect(() => {
    if (!origin || !destination || !routesLib?.Route) {
      setRawRoutes([]);
      setJourneys([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const reqId = ++reqRef.current;
    let cancelled = false;

    async function computeTransfers() {
      if (!origin || !destination || !routesLib?.Route) return;
      setIsLoading(true);
      setError(null);

      try {
        const { routes } = await routesLib.Route.computeRoutes({
          origin: origin.location,
          destination: destination.location,
          travelMode: 'TRANSIT' as google.maps.TravelModeString,
          computeAlternativeRoutes: true,
          departureTime: new Date(),
          fields: [
            'path',
            'distanceMeters',
            'durationMillis',
            'viewport',
            'legs',
          ],
          language: 'tr',
          region: 'TR',
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        if (cancelled || reqRef.current !== reqId) return;

        if (!routes || routes.length === 0) {
          setRawRoutes([]);
          setJourneys([]);
          setError(
            'Seçilen noktalar arasında şu an aktif toplu taşıma aktarma rotası bulunamadı.'
          );
        } else {
          setRawRoutes(routes.slice(0, 4));
        }
      } catch (err) {
        if (cancelled || reqRef.current !== reqId) return;
        console.error('Transfer route compute error:', err);
        setRawRoutes([]);
        setJourneys([]);
        setError('Aktarma rotaları hesaplanırken bir hata oluştu.');
      } finally {
        if (!cancelled && reqRef.current === reqId) {
          setIsLoading(false);
        }
      }
    }

    void computeTransfers();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, routesLib, reloadTick]);

  // Re-compute walking segment durations & total durations smoothly when walkingSpeedKmh slider moves
  useEffect(() => {
    if (rawRoutes.length === 0) {
      setJourneys([]);
      return;
    }

    const parsed: TransferJourneyOption[] = rawRoutes.map((route, rIdx) => {
      const rawSteps = route.legs?.[0]?.steps || [];
      const collapsedSteps: TransferStepItem[] = [];

      let walkDistanceAcc = 0;
      let walkPathAcc: LatLngPoint[] = [];

      const flushWalkingAccumulator = (idx: number) => {
        if (walkDistanceAcc <= 0 && walkPathAcc.length === 0) return;
        const mins = calculateWalkingMinutes(walkDistanceAcc, walkingSpeedKmh);
        collapsedSteps.push({
          id: `walk-${rIdx}-${idx}`,
          kind: 'WALKING',
          instruction: 'Yürüyüş',
          distanceMeters: walkDistanceAcc,
          durationMinutes: mins,
          path: walkPathAcc.length > 0 ? walkPathAcc : undefined,
        });
        walkDistanceAcc = 0;
        walkPathAcc = [];
      };

      rawSteps.forEach((step, sIdx) => {
        const td = step.transitDetails;
        if (td && td.transitLine) {
          flushWalkingAccumulator(sIdx);

          const line = td.transitLine;
          const lineCode = (line.shortName || line.name || 'Hat').trim();
          const lineName = (line.name || lineCode).trim();
          const mode = inferTransitModeFromVehicle(
            line.vehicle?.vehicleType,
            lineCode,
            lineName
          );
          const depMs = td.departureTime?.getTime();
          const arrMs = td.arrivalTime?.getTime();
          const transitMinutes =
            depMs && arrMs && arrMs > depMs
              ? Math.max(1, Math.round((arrMs - depMs) / 60000))
              : Math.max(
                  1,
                  Math.round((step.staticDurationMillis || 300000) / 60000)
                );

          collapsedSteps.push({
            id: `transit-${rIdx}-${sIdx}`,
            kind: 'TRANSIT',
            instruction: step.instructions || lineName,
            distanceMeters: step.distanceMeters || 0,
            durationMinutes: transitMinutes,
            mode,
            lineCode,
            lineName,
            headsign: td.headsign || undefined,
            departureStopName: td.departureStop?.name || undefined,
            arrivalStopName: td.arrivalStop?.name || undefined,
            departureTimeIso: td.departureTime?.toISOString(),
            arrivalTimeIso: td.arrivalTime?.toISOString(),
            stopCount:
              typeof td.stopCount === 'number' ? td.stopCount : undefined,
            color: line.color || undefined,
            textColor: line.textColor || undefined,
            path: toLatLngArray(step.path),
          });
        } else {
          walkDistanceAcc += step.distanceMeters || 0;
          const stepPath = toLatLngArray(step.path);
          if (stepPath) {
            walkPathAcc.push(...stepPath);
          }
        }
      });

      flushWalkingAccumulator(rawSteps.length);

      const transitLegs = collapsedSteps.filter((s) => s.kind === 'TRANSIT');
      const transferCount = Math.max(0, transitLegs.length - 1);

      const totalWalkMinsBase = rawSteps
        .filter((s) => !s.transitDetails)
        .reduce(
          (acc, s) =>
            acc + Math.max(1, Math.round((s.staticDurationMillis || 60000) / 60000)),
          0
        );
      const totalWalkMinsAdjusted = collapsedSteps
        .filter((s) => s.kind === 'WALKING')
        .reduce((acc, s) => acc + s.durationMinutes, 0);

      const baseRouteMins = Math.max(
        1,
        Math.round((route.durationMillis || 600000) / 60000)
      );
      const adjustedTotalMins = Math.max(
        1,
        baseRouteMins - totalWalkMinsBase + totalWalkMinsAdjusted
      );

      const firstTransit = transitLegs[0];
      const lastTransit = transitLegs[transitLegs.length - 1];

      return {
        id: `journey-${rIdx}`,
        totalDurationMinutes: adjustedTotalMins,
        totalDistanceMeters: route.distanceMeters || 0,
        transferCount,
        departureTimeIso: firstTransit?.departureTimeIso,
        arrivalTimeIso: lastTransit?.arrivalTimeIso,
        steps: collapsedSteps,
        viewport: route.viewport || undefined,
        overallPath: toLatLngArray(route.path),
      };
    });

    setJourneys(parsed);
  }, [rawRoutes, walkingSpeedKmh]);

  return {
    journeys,
    isLoading,
    error,
    refresh,
  };
}
