import { useCallback, useEffect, useState } from 'react';
import { fetchStopCrowdednessOverlay } from '../services/crowdednessService';
import type { StopCrowdednessInfo, TransitStop } from '../types/transit';

export function useCrowdednessOverlay(
  nearbyStops: TransitStop[],
  weatherCode?: number
) {
  const [majorHubs, setMajorHubs] = useState<StopCrowdednessInfo[]>([]);
  const [byStopId, setByStopId] = useState<Record<string, StopCrowdednessInfo>>({});
  const [isLoading, setIsLoading] = useState(false);

  const isRainy =
    typeof weatherCode === 'number' && weatherCode >= 51 && weatherCode <= 99;

  const loadOverlay = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchStopCrowdednessOverlay({
        nearbyStops,
        isRainy,
      });
      setMajorHubs(result.majorHubs);
      setByStopId(result.byStopId);
    } finally {
      setIsLoading(false);
    }
  }, [nearbyStops, isRainy]);

  useEffect(() => {
    void loadOverlay();
    const interval = window.setInterval(() => {
      void loadOverlay();
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadOverlay]);

  return {
    majorHubs,
    byStopId,
    isLoading,
    refreshCrowdedness: loadOverlay,
  };
}
