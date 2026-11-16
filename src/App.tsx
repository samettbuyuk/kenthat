import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Clock,
  Compass,
  Footprints,
  ListFilter,
  LocateFixed,
  Map as MapIcon,
  Moon,
  RefreshCw,
  Repeat2,
  Sun,
  Users,
} from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { CrowdednessMeter } from './components/CrowdednessMeter';
import { IstanbulMapCanvas } from './components/IstanbulMapCanvas';
import { IstanbulTransitHeader } from './components/IstanbulTransitHeader';
import { ModeSummaryGrid } from './components/ModeSummaryGrid';
import { Night24HoursPanel } from './components/Night24HoursPanel';
import { PlaceSearchBox } from './components/PlaceSearchBox';
import { StopLinesPanel } from './components/StopLinesPanel';
import { TransferPlannerPanel } from './components/TransferPlannerPanel';
import { WeatherClockStrip } from './components/WeatherClockStrip';
import { useCrowdednessOverlay } from './hooks/useCrowdednessOverlay';
import { useIstanbulWeather } from './hooks/useIstanbulWeather';
import { useNearbyIstanbulTransit } from './hooks/useNearbyIstanbulTransit';
import { useStopTransitDetails } from './hooks/useStopTransitDetails';
import { useTransitTransferRoutes } from './hooks/useTransitTransferRoutes';
import {
  DEFAULT_WALKING_SPEED_KMH,
  ISTANBUL_REFERENCE_POINTS,
  type LatLngPoint,
  type Night24LineInfo,
  type ThemeMode,
  type TransferEndpoint,
  type TransferJourneyOption,
  type TransitMode,
  type TransitStop,
} from './types/transit';
import {
  TRANSIT_MODE_ORDER,
  calculateWalkingMinutes,
  getWalkingSpeedLabel,
} from './utils/transitUtils';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  (typeof process !== 'undefined'
    ? process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
    : '') ||
  '';

const WALKING_SPEED_PRESETS = [
  { label: 'Yavaş', value: 3.0 },
  { label: 'Normal', value: 4.5 },
  { label: 'Hızlı', value: 6.5 },
];

function TransitWorkspace({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const apiStatus = useApiLoadingStatus();

  const [userLocation, setUserLocation] = useState<LatLngPoint | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [walkingSpeedKmh, setWalkingSpeedKmh] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(window.localStorage.getItem('kenthat-walk-speed'));
      if (Number.isFinite(saved) && saved >= 2.5 && saved <= 7.0) {
        return saved;
      }
    }
    return DEFAULT_WALKING_SPEED_KMH;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('kenthat-walk-speed', String(walkingSpeedKmh));
    } catch {
      // Ignore storage failures
    }
  }, [walkingSpeedKmh]);

  const [selectedStop, setSelectedStop] = useState<TransitStop | null>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  const [routeTargetStop, setRouteTargetStop] = useState<TransitStop | null>(null);
  const [isMobileMapExpanded, setIsMobileMapExpanded] = useState(false);
  const [desktopPanelMode, setDesktopPanelMode] = useState<
    'stops' | 'transfer' | 'lines24'
  >('stops');
  const [mobileTab, setMobileTab] = useState<
    'stops' | 'lines' | 'transfer' | 'lines24' | 'map'
  >('stops');

  const [transferOrigin, setTransferOrigin] = useState<TransferEndpoint | null>(null);
  const [originFollowsUser, setOriginFollowsUser] = useState(true);
  const [transferDestination, setTransferDestination] = useState<TransferEndpoint | null>(null);
  const [selectedTransferJourneyId, setSelectedTransferJourneyId] = useState<string | null>(null);
  const [activeMapTransferJourney, setActiveMapTransferJourney] =
    useState<TransferJourneyOption | null>(null);

  const { weather, isLoading: isWeatherLoading } = useIstanbulWeather(userLocation);

  const {
    closestByMode,
    stopsForMap,
    isLoading,
    isComputingWalking,
    error: transitError,
    refreshStops,
  } = useNearbyIstanbulTransit(userLocation);

  const speedAdjustedClosestByMode = useMemo(() => {
    const next: Partial<Record<TransitMode, TransitStop>> = {};
    for (const mode of TRANSIT_MODE_ORDER) {
      const stop = closestByMode[mode];
      if (!stop) continue;
      next[mode] = {
        ...stop,
        walkingMinutes:
          stop.isWalkable === false
            ? stop.walkingMinutes
            : calculateWalkingMinutes(stop.distanceMeters, walkingSpeedKmh),
      };
    }
    return next;
  }, [closestByMode, walkingSpeedKmh]);

  const speedAdjustedStopsForMap = useMemo(
    () =>
      stopsForMap.map((stop) => ({
        ...stop,
        walkingMinutes:
          stop.isWalkable === false
            ? stop.walkingMinutes
            : calculateWalkingMinutes(stop.distanceMeters, walkingSpeedKmh),
      })),
    [stopsForMap, walkingSpeedKmh]
  );

  const speedAdjustedSelectedStop = useMemo(() => {
    if (!selectedStop) return null;
    return (
      speedAdjustedClosestByMode[selectedStop.mode] || {
        ...selectedStop,
        walkingMinutes:
          selectedStop.isWalkable === false
            ? selectedStop.walkingMinutes
            : calculateWalkingMinutes(selectedStop.distanceMeters, walkingSpeedKmh),
      }
    );
  }, [selectedStop, speedAdjustedClosestByMode, walkingSpeedKmh]);

  const speedAdjustedRouteTargetStop = useMemo(() => {
    if (!routeTargetStop) return null;
    return {
      ...routeTargetStop,
      walkingMinutes:
        routeTargetStop.isWalkable === false
          ? routeTargetStop.walkingMinutes
          : calculateWalkingMinutes(routeTargetStop.distanceMeters, walkingSpeedKmh),
    };
  }, [routeTargetStop, walkingSpeedKmh]);

  const {
    details: stopDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
    refreshDetails,
  } = useStopTransitDetails(speedAdjustedSelectedStop);

  const {
    majorHubs: majorHubCrowdedness,
    byStopId: crowdednessByStopId,
  } = useCrowdednessOverlay(speedAdjustedStopsForMap, weather?.weatherCode);

  const {
    journeys: transferJourneys,
    isLoading: isLoadingTransfers,
    error: transferError,
    refresh: refreshTransfers,
  } = useTransitTransferRoutes(transferOrigin, transferDestination, walkingSpeedKmh);

  useEffect(() => {
    if (userLocation && originFollowsUser) {
      setTransferOrigin({
        label: locationLabel || 'Mevcut Konumum',
        subtitle: 'Aktif konum',
        location: userLocation,
      });
    }
  }, [userLocation, locationLabel, originFollowsUser]);

  useEffect(() => {
    if (transferJourneys.length === 0) {
      setSelectedTransferJourneyId(null);
      return;
    }
    setSelectedTransferJourneyId((prev) =>
      prev && transferJourneys.some((j) => j.id === prev)
        ? prev
        : transferJourneys[0].id
    );
    setActiveMapTransferJourney((prev) => {
      if (!prev) return null;
      return transferJourneys.find((j) => j.id === prev.id) || null;
    });
  }, [transferJourneys]);

  const fastestStop = useMemo(() => {
    let best: TransitStop | null = null;
    let minMeters = Infinity;
    for (const mode of TRANSIT_MODE_ORDER) {
      const s = speedAdjustedClosestByMode[mode];
      if (s && s.isWalkable !== false && s.distanceMeters < minMeters) {
        minMeters = s.distanceMeters;
        best = s;
      }
    }
    return best;
  }, [speedAdjustedClosestByMode]);

  // Auto-select the fastest reachable stop once stops load for a location
  useEffect(() => {
    if (!selectedStop && fastestStop) {
      setSelectedStop(fastestStop);
    } else if (selectedStop) {
      const updated = speedAdjustedClosestByMode[selectedStop.mode];
      if (updated && updated.id === selectedStop.id && updated.walkingMinutes !== selectedStop.walkingMinutes) {
        setSelectedStop(updated);
      }
    }
  }, [fastestStop, selectedStop, speedAdjustedClosestByMode]);

  const handleRequestLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(
        'Tarayıcınız konum servisini desteklemiyor. Haritadan bir nokta veya İstanbul ilçesi seçebilirsiniz.'
      );
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPoint: LatLngPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(nextPoint);
        setLocationLabel('Anlık GPS Konumu');
        setSelectedStop(null);
        setRouteTargetStop(null);
        setActiveMapTransferJourney(null);
        setOriginFollowsUser(true);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            'Konum izni verilmedi. Tarayıcı izni verebilir veya aşağıdan İstanbul içi bir nokta seçebilirsiniz.'
          );
        } else if (err.code === err.TIMEOUT) {
          setLocationError(
            'Konum alma isteği zaman aşımına uğradı. Tekrar deneyebilir veya İstanbul noktalarından birini seçebilirsiniz.'
          );
        } else {
          setLocationError(
            'Anlık konum alınamadı. Harita üzerinden veya arama kutusundan konum seçebilirsiniz.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      }
    );
  }, []);

  const handleSelectCustomLocation = useCallback(
    (point: LatLngPoint, label: string) => {
      setLocationError(null);
      setUserLocation(point);
      setLocationLabel(label);
      setSelectedStop(null);
      setRouteTargetStop(null);
      setActiveMapTransferJourney(null);
      setOriginFollowsUser(true);
    },
    []
  );

  const handleMapClickLocation = useCallback((point: LatLngPoint) => {
    setLocationError(null);
    setUserLocation(point);
    setLocationLabel('Haritadan Seçilen Nokta');
    setSelectedStop(null);
    setRouteTargetStop(null);
    setActiveMapTransferJourney(null);
    setOriginFollowsUser(true);
  }, []);

  const handleInspectLines = useCallback((stop: TransitStop) => {
    setSelectedStop(stop);
    setDesktopPanelMode('stops');
    setRouteTargetStop((prev) => (prev && prev.id === stop.id ? prev : null));
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab('lines');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.setTimeout(() => {
        document
          .getElementById('durak-hatlari')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  }, []);

  const handleRequestDirections = useCallback((stop: TransitStop) => {
    setSelectedStop(stop);
    setActiveMapTransferJourney(null);
    setRouteTargetStop(stop);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab('map');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleClearRoute = useCallback(() => {
    setRouteTargetStop(null);
  }, []);

  const handleChangeTransferOrigin = useCallback((endpoint: TransferEndpoint) => {
    setOriginFollowsUser(false);
    setTransferOrigin(endpoint);
  }, []);

  const handleSwapTransferEndpoints = useCallback(() => {
    if (!transferOrigin || !transferDestination) return;
    setOriginFollowsUser(false);
    setTransferOrigin(transferDestination);
    setTransferDestination(transferOrigin);
  }, [transferOrigin, transferDestination]);

  const handleShowTransferOnMap = useCallback((journey: TransferJourneyOption) => {
    setRouteTargetStop(null);
    setSelectedTransferJourneyId(journey.id);
    setActiveMapTransferJourney(journey);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab('map');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const mapsFailed =
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          <BrandLogo className="w-7 h-7 shrink-0" />
          <span>KentHat</span>
        </a>

        <nav
          aria-label="Ana gezinme"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <a
            href="#ulasim-ozeti"
            onClick={() => {
              setDesktopPanelMode('stops');
              setMobileTab('stops');
            }}
            className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            En Yakın Duraklar
          </a>
          <a
            href="#durak-hatlari"
            onClick={() => {
              setDesktopPanelMode('stops');
              setMobileTab('lines');
            }}
            className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Geçen Hatlar
          </a>
          <a
            href="#aktarma-planlayici"
            onClick={() => {
              setDesktopPanelMode('transfer');
              setMobileTab('transfer');
            }}
            className={`hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              desktopPanelMode === 'transfer'
                ? 'text-blue-600 dark:text-sky-400 font-semibold'
                : ''
            }`}
          >
            Aktarma
          </a>
          <a
            href="#yirmi-dort-saat"
            onClick={() => {
              setDesktopPanelMode('lines24');
              setMobileTab('lines24');
            }}
            className={`hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              desktopPanelMode === 'lines24'
                ? 'text-blue-600 dark:text-sky-400 font-semibold'
                : ''
            }`}
          >
            24 Saat
          </a>
          <a
            href="#harita-gorunumu"
            onClick={() => setMobileTab('map')}
            className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Canlı Harita
          </a>
        </nav>

        <div className="shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={isLocating}
            onClick={handleRequestLiveLocation}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 shadow-xs transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <LocateFixed
              className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isLocating ? 'Konum Alınıyor' : 'Anlık Konumu Al'}</span>
          </motion.button>
        </div>
      </header>

      {/* Mobile Compact 5-Tab Switcher + Quick Theme Toggle */}
      <div className="lg:hidden px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Mobil görünüm seçici"
          className="flex-1 grid grid-cols-5 gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'stops'}
            onClick={() => setMobileTab('stops')}
            className={`relative min-h-[38px] py-1 px-0.5 text-[10px] sm:text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              mobileTab === 'stops'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {mobileTab === 'stops' && (
              <motion.span
                layoutId="mobile-view-tab"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-xs"
              />
            )}
            <Compass className="w-3 h-3 relative z-10 shrink-0" aria-hidden="true" />
            <span className="relative z-10 truncate">Duraklar</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'lines'}
            onClick={() => setMobileTab('lines')}
            className={`relative min-h-[38px] py-1 px-0.5 text-[10px] sm:text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              mobileTab === 'lines'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {mobileTab === 'lines' && (
              <motion.span
                layoutId="mobile-view-tab"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-xs"
              />
            )}
            <ListFilter className="w-3 h-3 relative z-10 shrink-0" aria-hidden="true" />
            <span className="relative z-10 truncate">Hatlar</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'transfer'}
            onClick={() => setMobileTab('transfer')}
            className={`relative min-h-[38px] py-1 px-0.5 text-[10px] sm:text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              mobileTab === 'transfer'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {mobileTab === 'transfer' && (
              <motion.span
                layoutId="mobile-view-tab"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-xs"
              />
            )}
            <Repeat2 className="w-3 h-3 relative z-10 shrink-0" aria-hidden="true" />
            <span className="relative z-10 truncate">Aktarma</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'lines24'}
            onClick={() => setMobileTab('lines24')}
            className={`relative min-h-[38px] py-1 px-0.5 text-[10px] sm:text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              mobileTab === 'lines24'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {mobileTab === 'lines24' && (
              <motion.span
                layoutId="mobile-view-tab"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-xs"
              />
            )}
            <Clock className="w-3 h-3 relative z-10 shrink-0" aria-hidden="true" />
            <span className="relative z-10 truncate">24 Saat</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'map'}
            onClick={() => setMobileTab('map')}
            className={`relative min-h-[38px] py-1 px-0.5 text-[10px] sm:text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              mobileTab === 'map'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {mobileTab === 'map' && (
              <motion.span
                layoutId="mobile-view-tab"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-xs"
              />
            )}
            <MapIcon className="w-3 h-3 relative z-10 shrink-0" aria-hidden="true" />
            <span className="relative z-10 truncate">Harita</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 shrink-0"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Main Responsive Split Workspace */}
      <main id="top" className="flex-1 flex flex-col lg:flex-row">
        {/* Left Scrollable Workspace */}
        <aside
          className={`w-full lg:w-[530px] xl:w-[570px] shrink-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 lg:h-[calc(100vh-65px)] lg:overflow-y-auto custom-scrollbar ${
            mobileTab === 'map' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="p-4 sm:p-5 space-y-4">
            {/* Minimal Live Weather & Clock Strip */}
            <WeatherClockStrip
              weather={weather}
              isWeatherLoading={isWeatherLoading}
            />

            {/* Mobile 'Duraklar' or Desktop Always Visible */}
            <div
              className={
                mobileTab === 'lines' ||
                mobileTab === 'transfer' ||
                mobileTab === 'lines24'
                  ? 'hidden lg:block space-y-4'
                  : 'space-y-4'
              }
            >
              <IstanbulTransitHeader
                fastestStop={fastestStop}
                locationLabel={locationLabel}
              />

              {/* Location & Theme Control Card */}
              <section
                aria-label="Konum ve tema kontrol paneli"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Konum ve Tema
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {userLocation ? (
                        <span className="font-mono-tabular">
                          {locationLabel} · {userLocation.lat.toFixed(4)},{' '}
                          {userLocation.lng.toFixed(4)}
                        </span>
                      ) : (
                        'Anlık GPS alın veya İstanbul içi bir nokta seçin'
                      )}
                    </p>
                  </div>

                  {/* Desktop Gece / Gündüz Modu Toggle */}
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-label={
                      theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'
                    }
                    className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-700/80 transition-colors whitespace-nowrap shrink-0"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {theme === 'dark' ? (
                        <motion.span
                          key="sun"
                          initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                          animate={{ rotate: 0, opacity: 1, scale: 1 }}
                          exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-1.5"
                        >
                          <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                          <span>Gündüz Modu</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="moon"
                          initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
                          animate={{ rotate: 0, opacity: 1, scale: 1 }}
                          exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-1.5"
                        >
                          <Moon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                          <span>Gece Modu</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={isLocating}
                    onClick={handleRequestLiveLocation}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 shadow-xs transition-colors disabled:opacity-60"
                  >
                    <LocateFixed
                      className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>
                      {isLocating
                        ? 'Aktif Konum Alınıyor...'
                        : userLocation
                        ? 'Anlık Konumu Güncelle'
                        : 'Anlık Konumu Al'}
                    </span>
                  </motion.button>

                  {userLocation && (
                    <button
                      type="button"
                      onClick={refreshStops}
                      disabled={isLoading}
                      title="Durakları yeniden hesapla"
                      aria-label="Durakları yenile"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>

                <PlaceSearchBox onSelectLocation={handleSelectCustomLocation} />

                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Hızlı İstanbul Noktaları
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ISTANBUL_REFERENCE_POINTS.map((pt) => (
                      <motion.button
                        key={pt.id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handleSelectCustomLocation(
                            pt.location,
                            `${pt.name} (${pt.subtitle})`
                          )
                        }
                        className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-blue-500 dark:hover:border-sky-500 hover:text-blue-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
                      >
                        {pt.name}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Walking Speed Slider */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label
                      htmlFor="walking-speed-slider"
                      className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200"
                    >
                      <Footprints
                        className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"
                        aria-hidden="true"
                      />
                      <span>Yürüyüş Hızı</span>
                    </label>
                    <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-300">
                      {getWalkingSpeedLabel(walkingSpeedKmh)} ·{' '}
                      {walkingSpeedKmh.toFixed(1)} km/sa
                    </span>
                  </div>

                  <input
                    id="walking-speed-slider"
                    type="range"
                    min={2.5}
                    max={7.0}
                    step={0.5}
                    value={walkingSpeedKmh}
                    onChange={(e) => setWalkingSpeedKmh(Number(e.target.value))}
                    aria-label="Yürüyüş hızı"
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-blue-600 dark:accent-sky-400"
                  />

                  <div className="grid grid-cols-3 gap-1.5">
                    {WALKING_SPEED_PRESETS.map((preset) => {
                      const isActive = Math.abs(walkingSpeedKmh - preset.value) < 0.01;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setWalkingSpeedKmh(preset.value)}
                          className={`min-h-[34px] px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap font-mono-tabular ${
                            isActive
                              ? 'border-blue-600 dark:border-sky-400 bg-blue-50 dark:bg-sky-950/50 text-blue-700 dark:text-sky-300'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {preset.label} ({preset.value.toFixed(1)})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence>
                  {(locationError || transitError || mapsFailed) && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        {mapsFailed
                          ? 'Harita servisi yüklenemedi. Lütfen ağ bağlantınızı veya API yapılandırmasını kontrol edin.'
                          : locationError || transitError}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Desktop Mode Switcher: Yakın Duraklar vs Aktarma vs 24 Saat */}
              <div
                role="tablist"
                aria-label="Masaüstü çalışma görünümü"
                className="hidden lg:grid grid-cols-3 gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopPanelMode === 'stops'}
                  onClick={() => setDesktopPanelMode('stops')}
                  className={`relative min-h-[40px] px-2.5 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    desktopPanelMode === 'stops'
                      ? 'text-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {desktopPanelMode === 'stops' && (
                    <motion.span
                      layoutId="desktop-workspace-tab"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-slate-900 dark:bg-sky-400"
                    />
                  )}
                  <Compass className="w-3.5 h-3.5 relative z-10 shrink-0" aria-hidden="true" />
                  <span className="relative z-10">Yakın Duraklar</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopPanelMode === 'transfer'}
                  onClick={() => setDesktopPanelMode('transfer')}
                  className={`relative min-h-[40px] px-2.5 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    desktopPanelMode === 'transfer'
                      ? 'text-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {desktopPanelMode === 'transfer' && (
                    <motion.span
                      layoutId="desktop-workspace-tab"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-slate-900 dark:bg-sky-400"
                    />
                  )}
                  <Repeat2 className="w-3.5 h-3.5 relative z-10 shrink-0" aria-hidden="true" />
                  <span className="relative z-10">Aktarma</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopPanelMode === 'lines24'}
                  onClick={() => setDesktopPanelMode('lines24')}
                  className={`relative min-h-[40px] px-2.5 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    desktopPanelMode === 'lines24'
                      ? 'text-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {desktopPanelMode === 'lines24' && (
                    <motion.span
                      layoutId="desktop-workspace-tab"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-slate-900 dark:bg-sky-400"
                    />
                  )}
                  <Clock className="w-3.5 h-3.5 relative z-10 shrink-0" aria-hidden="true" />
                  <span className="relative z-10">24 Saat Hatlar</span>
                </button>
              </div>

              {/* 6-Mode Closest Istanbul Stops */}
              <div className={desktopPanelMode !== 'stops' ? 'lg:hidden' : 'block'}>
                <ModeSummaryGrid
                  closestByMode={speedAdjustedClosestByMode}
                  crowdednessByStopId={crowdednessByStopId}
                  userLocation={userLocation}
                  selectedStopId={speedAdjustedSelectedStop?.id || null}
                  hoveredStopId={hoveredStopId}
                  isLoading={isLoading}
                  isComputingWalking={isComputingWalking}
                  onInspectLines={handleInspectLines}
                  onHoverStop={setHoveredStopId}
                  onRequestDirections={handleRequestDirections}
                />
              </div>
            </div>

            {/* Live Passing Lines & Departures Panel */}
            <div
              className={
                mobileTab === 'lines'
                  ? 'block'
                  : desktopPanelMode === 'stops'
                  ? 'hidden lg:block'
                  : 'hidden'
              }
            >
              {mobileTab === 'lines' && (
                <div className="lg:hidden mb-3">
                  <button
                    type="button"
                    onClick={() => setMobileTab('stops')}
                    className="text-xs font-semibold text-blue-600 dark:text-sky-400 hover:underline"
                  >
                    ← Tüm Yakın Duraklara Dön
                  </button>
                </div>
              )}

              <StopLinesPanel
                stop={speedAdjustedSelectedStop}
                crowdednessInfo={
                  speedAdjustedSelectedStop
                    ? crowdednessByStopId[speedAdjustedSelectedStop.id]
                    : undefined
                }
                details={stopDetails}
                isLoading={isLoadingDetails}
                error={detailsError}
                onRefresh={refreshDetails}
                onRequestDirections={handleRequestDirections}
              />
            </div>

            {/* Standalone Public Transit Transfer Planner (Aktarma) */}
            <div
              className={
                mobileTab === 'transfer'
                  ? 'block'
                  : desktopPanelMode === 'transfer'
                  ? 'hidden lg:block'
                  : 'hidden'
              }
            >
              <TransferPlannerPanel
                userLocation={userLocation}
                locationLabel={locationLabel}
                isLocating={isLocating}
                isLoadingStops={isLoading || isComputingWalking}
                locationError={locationError}
                closestByMode={speedAdjustedClosestByMode}
                origin={transferOrigin}
                destination={transferDestination}
                journeys={transferJourneys}
                selectedJourneyId={selectedTransferJourneyId}
                isLoading={isLoadingTransfers}
                error={transferError}
                onRequestLiveLocation={handleRequestLiveLocation}
                onChangeOrigin={handleChangeTransferOrigin}
                onChangeDestination={setTransferDestination}
                onSwapEndpoints={handleSwapTransferEndpoints}
                onSelectJourney={(journey) => setSelectedTransferJourneyId(journey.id)}
                onShowOnMap={handleShowTransferOnMap}
                onRefresh={refreshTransfers}
              />
            </div>

            {/* Dedicated 24-Hour Transit Lines Tab */}
            <div
              className={
                mobileTab === 'lines24'
                  ? 'block'
                  : desktopPanelMode === 'lines24'
                  ? 'hidden lg:block'
                  : 'hidden'
              }
            >
              <Night24HoursPanel
                onSelectHubLocation={(point, label) => {
                  handleSelectCustomLocation(point, label);
                  setDesktopPanelMode('stops');
                  setMobileTab('stops');
                }}
                onPlanTransferToHub={(line: Night24LineInfo) => {
                  setTransferDestination({
                    label: line.hubName,
                    subtitle: `${line.code} · ${line.name}`,
                    location: line.hubLocation,
                    mode: line.mode,
                  });
                  setDesktopPanelMode('transfer');
                  setMobileTab('transfer');
                }}
              />
            </div>
          </div>
        </aside>

        {/* Right Interactive Google Map Area */}
        <section
          id="harita-gorunumu"
          aria-label="İnteraktif İstanbul toplu taşıma haritası"
          className={`flex-1 min-w-0 ${
            mobileTab !== 'map' ? 'hidden lg:block' : 'block'
          }`}
        >
          <IstanbulMapCanvas
            theme={theme}
            walkingSpeedKmh={walkingSpeedKmh}
            userLocation={userLocation}
            stops={speedAdjustedStopsForMap}
            selectedStop={speedAdjustedSelectedStop}
            hoveredStopId={hoveredStopId}
            routeTargetStop={speedAdjustedRouteTargetStop}
            activeTransferJourney={activeMapTransferJourney}
            majorHubCrowdedness={majorHubCrowdedness}
            crowdednessByStopId={crowdednessByStopId}
            isLocating={isLocating}
            isMobileExpanded={isMobileMapExpanded || mobileTab === 'map'}
            onToggleMobileExpand={() => setIsMobileMapExpanded((v) => !v)}
            onRequestLocation={handleRequestLiveLocation}
            onMapClickLocation={handleMapClickLocation}
            onInspectLines={handleInspectLines}
            onRequestDirections={handleRequestDirections}
            onClearRoute={handleClearRoute}
            onClearTransferJourney={() => setActiveMapTransferJourney(null)}
            onSelectHubCenter={(point, label) => {
              handleSelectCustomLocation(point, label);
            }}
          />
        </section>
      </main>
    </div>
  );
}

function NoMapsKeyWorkspace({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const { weather, isLoading: isWeatherLoading } = useIstanbulWeather(null);
  const { majorHubs } = useCrowdednessOverlay([], weather?.weatherCode);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-30 h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
        <div className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          <BrandLogo className="w-7 h-7 shrink-0" />
          <span>KentHat</span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Gündüz Modu</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>Gece Modu</span>
            </>
          )}
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        <aside className="w-full lg:w-[530px] xl:w-[570px] shrink-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 lg:h-[calc(100vh-65px)] lg:overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-5 space-y-4">
            <WeatherClockStrip
              weather={weather}
              isWeatherLoading={isWeatherLoading}
            />

            <Night24HoursPanel
              onSelectHubLocation={() => {}}
              onPlanTransferToHub={() => {}}
            />
          </div>
        </aside>

        <section className="flex-1 min-w-0 p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Google Maps API Anahtarı Yapılandırması Gerekiyor
                </h1>
                <p>
                  Canlı harita ve durak verilerini yükleyebilmek için ortam
                  değişkeni olarak{' '}
                  <code className="font-mono-tabular px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    VITE_GOOGLE_MAPS_API_KEY
                  </code>{' '}
                  tanımlanmalıdır.
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    Ortam değişkenlerine (AI Studio Secrets /{' '}
                    <code className="font-mono-tabular">.env</code>) geçerli bir{' '}
                    <code className="font-mono-tabular">
                      VITE_GOOGLE_MAPS_API_KEY
                    </code>{' '}
                    ekleyin.
                  </li>
                  <li>
                    Google Cloud projesinde <strong>Maps JavaScript API</strong>,{' '}
                    <strong>Places API (New)</strong> ve{' '}
                    <strong>Routes API</strong> servislerini etkinleştirin.
                  </li>
                  <li>
                    Anahtar eklendikten sonra geliştirme sunucusunu yeniden
                    başlatın.
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users
                  className="w-4 h-4 text-blue-600 dark:text-sky-400"
                  aria-hidden="true"
                />
                <span>İstanbul Ana Aktarma Merkezleri Anlık Yoğunluk</span>
              </h2>
              <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                Simüle Canlı Veri
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {majorHubs.map((hub) => (
                <div
                  key={hub.stopId}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {hub.stopName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {hub.advice}
                    </div>
                  </div>
                  <CrowdednessMeter info={hub} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        window.localStorage.getItem('kenthat-theme') ||
        window.localStorage.getItem('istrota-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('kenthat-theme', theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  if (!GOOGLE_MAPS_API_KEY) {
    return <NoMapsKeyWorkspace theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places', 'routes', 'marker']}
      language="tr"
      region="TR"
    >
      <TransitWorkspace theme={theme} onToggleTheme={toggleTheme} />
    </APIProvider>
  );
}
