import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMapView,
  type MapMouseEvent,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'motion/react';
import {
  Clock,
  ExternalLink,
  Footprints,
  Layers,
  ListFilter,
  LocateFixed,
  Maximize2,
  Minimize2,
  Navigation,
  Repeat2,
  X,
} from 'lucide-react';
import {
  type ActiveWalkingRoute,
  ISTANBUL_CENTER,
  type LatLngPoint,
  type ThemeMode,
  type TransferJourneyOption,
  type TransitStop,
  type WalkingRouteStep,
} from '../types/transit';
import {
  TRANSIT_MODE_META,
  buildGoogleMapsWalkingUrl,
  calculateWalkingMinutes,
  formatDistanceKm,
  formatDistanceMeters,
  formatWalkingDuration,
  getIstanbulLineColors,
} from '../utils/transitUtils';
import { TransitModeIcon } from './TransitModeIcon';

interface IstanbulMapCanvasProps {
  theme: ThemeMode;
  walkingSpeedKmh: number;
  userLocation: LatLngPoint | null;
  stops: TransitStop[];
  selectedStop: TransitStop | null;
  hoveredStopId: string | null;
  routeTargetStop: TransitStop | null;
  activeTransferJourney: TransferJourneyOption | null;
  isLocating: boolean;
  isMobileExpanded: boolean;
  onToggleMobileExpand: () => void;
  onRequestLocation: () => void;
  onMapClickLocation: (point: LatLngPoint) => void;
  onInspectLines: (stop: TransitStop) => void;
  onRequestDirections: (stop: TransitStop) => void;
  onClearRoute: () => void;
  onClearTransferJourney: () => void;
}

function MapCameraSync({
  userLocation,
  selectedStop,
  hasActiveRoute,
}: {
  userLocation: LatLngPoint | null;
  selectedStop: TransitStop | null;
  hasActiveRoute: boolean;
}) {
  const map = useMap();
  const prevLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !userLocation) return;
    const key = `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`;
    if (prevLocationRef.current !== key) {
      prevLocationRef.current = key;
      map.panTo(userLocation);
      if ((map.getZoom() || 12) < 14) {
        map.setZoom(15);
      }
    }
  }, [map, userLocation]);

  useEffect(() => {
    if (!map || !selectedStop || hasActiveRoute) return;
    map.panTo(selectedStop.location);
  }, [map, selectedStop, hasActiveRoute]);

  return null;
}

function TransitLayerControl({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const layerRef = useRef<google.maps.TransitLayer | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;
    if (!layerRef.current) {
      layerRef.current = new google.maps.TransitLayer();
    }
    layerRef.current.setMap(enabled ? map : null);
    return () => {
      layerRef.current?.setMap(null);
    };
  }, [map, mapsLib, enabled]);

  return null;
}

function WalkingRouteRenderer({
  origin,
  targetStop,
  theme,
  onRouteComputed,
  onRouteError,
  onRouteLoading,
}: {
  origin: LatLngPoint;
  targetStop: TransitStop;
  theme: ThemeMode;
  onRouteComputed: (route: ActiveWalkingRoute) => void;
  onRouteError: (msg: string) => void;
  onRouteLoading: (loading: boolean) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !routesLib || !origin || !targetStop) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteLoading(true);

    let cancelled = false;

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin,
      destination: targetStop.location,
      travelMode: 'WALKING' as google.maps.TravelModeString,
      fields: [
        'path',
        'distanceMeters',
        'durationMillis',
        'viewport',
        'legs',
        'localizedValues',
      ],
      language: 'tr',
      region: 'TR',
      internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
    };

    routesLib.Route.computeRoutes(request)
      .then(({ routes }) => {
        if (cancelled) return;
        onRouteLoading(false);

        if (!routes || routes.length === 0) {
          onRouteError(
            'Bu durağa doğrudan yaya rotası bulunamadı (Boğaz karşı yakada olabilir).'
          );
          return;
        }

        const primaryRoute = routes[0];
        const strokeColor = theme === 'dark' ? '#38BDF8' : '#1D4ED8';
        const newPolylines = primaryRoute.createPolylines({
          polylineOptions: {
            strokeColor,
            strokeWeight: 6,
            strokeOpacity: 0.94,
          },
        });

        newPolylines.forEach((polyline) => {
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 68);
        }

        const distanceMeters =
          primaryRoute.distanceMeters ?? targetStop.distanceMeters;
        const durationMillis =
          primaryRoute.durationMillis ?? targetStop.walkingMinutes * 60000;

        const legSteps = primaryRoute.legs?.[0]?.steps || [];
        const steps: WalkingRouteStep[] = legSteps
          .filter((s) => Boolean(s.instructions))
          .map((s) => ({
            instruction: s.instructions || '',
            distanceText:
              s.localizedValues?.distance ||
              formatDistanceMeters(s.distanceMeters || 0),
            durationText:
              s.localizedValues?.staticDuration ||
              `${Math.max(1, Math.round((s.staticDurationMillis || 60000) / 60000))} dk`,
            maneuver: s.maneuver || undefined,
          }));

        onRouteComputed({
          stop: targetStop,
          distanceMeters,
          durationMillis,
          distanceText:
            primaryRoute.localizedValues?.distance ||
            formatDistanceKm(distanceMeters),
          durationText:
            primaryRoute.localizedValues?.duration ||
            formatWalkingDuration(Math.max(1, Math.round(durationMillis / 60000))),
          steps,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        onRouteLoading(false);
        console.error('Route.computeRoutes error:', err);
        onRouteError('Yürüyüş yol tarifi hesaplanırken bir hata oluştu.');
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, origin, targetStop, theme, onRouteComputed, onRouteError, onRouteLoading]);

  return null;
}

function TransferRouteRenderer({
  journey,
  theme,
}: {
  journey: TransferJourneyOption;
  theme: ThemeMode;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !mapsLib || !journey) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const created: google.maps.Polyline[] = [];
    const bounds = new google.maps.LatLngBounds();
    let hasBoundsPoints = false;

    for (const step of journey.steps) {
      if (!step.path || step.path.length < 2) continue;

      for (const pt of step.path) {
        bounds.extend(pt);
        hasBoundsPoints = true;
      }

      if (step.kind === 'WALKING') {
        const walkStroke = theme === 'dark' ? '#94A3B8' : '#475569';
        const line = new google.maps.Polyline({
          path: step.path,
          geodesic: true,
          strokeOpacity: 0,
          strokeWeight: 4,
          zIndex: 25,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 0.9,
                strokeColor: walkStroke,
                scale: 3,
              },
              offset: '0',
              repeat: '12px',
            },
          ],
          map,
        });
        created.push(line);
      } else {
        const mode = step.mode || 'bus';
        const badge = getIstanbulLineColors(
          step.lineCode || 'Hat',
          mode,
          step.color,
          step.textColor
        );
        const line = new google.maps.Polyline({
          path: step.path,
          geodesic: true,
          strokeColor: badge.bg,
          strokeWeight: 6,
          strokeOpacity: 0.94,
          zIndex: 30,
          map,
        });
        created.push(line);
      }
    }

    if (created.length === 0 && journey.overallPath && journey.overallPath.length >= 2) {
      for (const pt of journey.overallPath) {
        bounds.extend(pt);
        hasBoundsPoints = true;
      }
      const fallback = new google.maps.Polyline({
        path: journey.overallPath,
        geodesic: true,
        strokeColor: theme === 'dark' ? '#38BDF8' : '#2563EB',
        strokeWeight: 6,
        strokeOpacity: 0.94,
        zIndex: 28,
        map,
      });
      created.push(fallback);
    }

    polylinesRef.current = created;

    if (journey.viewport) {
      map.fitBounds(journey.viewport, 68);
    } else if (hasBoundsPoints) {
      map.fitBounds(bounds, 68);
    }

    return () => {
      created.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, mapsLib, journey, theme]);

  return null;
}

function StopMarkerItem({
  stop,
  isSelected,
  isHovered,
  isInfoOpen,
  onClick,
  onCloseInfo,
  onInspectLines,
  onRequestDirections,
}: {
  stop: TransitStop;
  isSelected: boolean;
  isHovered: boolean;
  isInfoOpen: boolean;
  onClick: () => void;
  onCloseInfo: () => void;
  onInspectLines: () => void;
  onRequestDirections: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const meta = TRANSIT_MODE_META[stop.mode];
  const emphasized = isSelected || isHovered;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={stop.location}
        title={`${stop.name} (${meta.shortLabel})`}
        zIndex={emphasized ? 40 : 10}
        onClick={onClick}
      >
        <div
          className="transition-transform duration-150 cursor-pointer flex flex-col items-center"
          style={{
            transform: emphasized ? 'scale(1.18)' : 'scale(1)',
          }}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg border-2 ${
              emphasized
                ? 'border-white ring-4 ring-blue-500/35'
                : 'border-white/95 dark:border-slate-900'
            }`}
            style={{ backgroundColor: meta.color }}
          >
            <TransitModeIcon mode={stop.mode} className="w-4 h-4" />
          </div>
          <span className="mt-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-slate-900/95 text-[10px] font-bold text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700/80 whitespace-nowrap max-w-[125px] truncate">
            {meta.shortLabel} ·{' '}
            {stop.isWalkable === false
              ? 'Karşı yaka'
              : formatWalkingDuration(stop.walkingMinutes)}
          </span>
        </div>
      </AdvancedMarker>

      {isInfoOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={270}>
          <div className="p-1 text-slate-900">
            <div className="text-xs font-bold" style={{ color: meta.color }}>
              {meta.label}
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
              {stop.name}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-mono-tabular">
              {stop.isWalkable === false
                ? 'Yaya rotası bulunamadı'
                : `Yürüyerek ${formatWalkingDuration(stop.walkingMinutes)} · ${formatDistanceKm(stop.distanceMeters)}`}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={onInspectLines}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
                Hatları Gör
              </button>
              <button
                type="button"
                onClick={onRequestDirections}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                Yol Tarifi
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function IstanbulMapCanvas({
  theme,
  walkingSpeedKmh,
  userLocation,
  stops,
  selectedStop,
  hoveredStopId,
  routeTargetStop,
  activeTransferJourney,
  isLocating,
  isMobileExpanded,
  onToggleMobileExpand,
  onRequestLocation,
  onMapClickLocation,
  onInspectLines,
  onRequestDirections,
  onClearRoute,
  onClearTransferJourney,
}: IstanbulMapCanvasProps) {
  const [showTransitLayer, setShowTransitLayer] = useState(true);
  const [infoStopId, setInfoStopId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveWalkingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeTargetStop) {
      setActiveRoute(null);
      setRouteError(null);
      setRouteLoading(false);
    }
  }, [routeTargetStop]);

  const handleMapClick = useCallback(
    (ev: MapMouseEvent) => {
      setInfoStopId(null);
      if (ev.detail.latLng) {
        onMapClickLocation({
          lat: ev.detail.latLng.lat,
          lng: ev.detail.latLng.lng,
        });
      }
    },
    [onMapClickLocation]
  );

  const handleRouteComputed = useCallback((route: ActiveWalkingRoute) => {
    setActiveRoute(route);
    setRouteError(null);
  }, []);

  const handleRouteError = useCallback((msg: string) => {
    setRouteError(msg);
  }, []);

  const handleRouteLoading = useCallback((loading: boolean) => {
    setRouteLoading(loading);
  }, []);

  const externalMapsUrl =
    userLocation && routeTargetStop
      ? buildGoogleMapsWalkingUrl(userLocation, routeTargetStop.location)
      : null;

  return (
    <div
      className={`relative w-full overflow-hidden bg-slate-200 dark:bg-slate-900 ${
        isMobileExpanded
          ? 'h-[calc(100vh-116px)] lg:h-[calc(100vh-65px)]'
          : 'h-[340px] sm:h-[400px] lg:h-[calc(100vh-65px)]'
      }`}
    >
      <GoogleMapView
        mapId="DEMO_MAP_ID"
        colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
        defaultCenter={ISTANBUL_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        onClick={handleMapClick}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <MapCameraSync
          userLocation={userLocation}
          selectedStop={selectedStop}
          hasActiveRoute={Boolean(routeTargetStop || activeTransferJourney)}
        />
        <TransitLayerControl enabled={showTransitLayer} />

        {/* Live User Location Marker */}
        {userLocation && (
          <AdvancedMarker
            position={userLocation}
            title="Aktif Konumunuz"
            zIndex={50}
          >
            <div className="relative flex items-center justify-center w-12 h-12">
              <motion.span
                animate={{ scale: [1, 2.3], opacity: [0.65, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute w-5 h-5 rounded-full bg-blue-500/50 dark:bg-sky-400/50"
              />
              <motion.span
                animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
                transition={{
                  duration: 2,
                  delay: 0.7,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute w-5 h-5 rounded-full bg-blue-500/40 dark:bg-sky-400/40"
              />
              <span className="relative w-4 h-4 rounded-full bg-blue-600 dark:bg-sky-400 border-[2.5px] border-white dark:border-slate-950 shadow-md" />
            </div>
          </AdvancedMarker>
        )}

        {/* Transit Stop Markers */}
        {stops.map((stop) => (
          <StopMarkerItem
            key={stop.id}
            stop={stop}
            isSelected={
              selectedStop?.id === stop.id || routeTargetStop?.id === stop.id
            }
            isHovered={hoveredStopId === stop.id}
            isInfoOpen={infoStopId === stop.id}
            onClick={() => {
              setInfoStopId(stop.id);
              onInspectLines(stop);
            }}
            onCloseInfo={() => setInfoStopId(null)}
            onInspectLines={() => {
              setInfoStopId(null);
              onInspectLines(stop);
            }}
            onRequestDirections={() => {
              setInfoStopId(null);
              onRequestDirections(stop);
            }}
          />
        ))}

        {/* Walking Route Polyline & Computation */}
        {userLocation && routeTargetStop && (
          <WalkingRouteRenderer
            origin={userLocation}
            targetStop={routeTargetStop}
            theme={theme}
            onRouteComputed={handleRouteComputed}
            onRouteError={handleRouteError}
            onRouteLoading={handleRouteLoading}
          />
        )}

        {/* Multi-Modal Transit Transfer Route Polylines */}
        {!routeTargetStop && activeTransferJourney && (
          <TransferRouteRenderer
            journey={activeTransferJourney}
            theme={theme}
          />
        )}
      </GoogleMapView>

      {/* Top Map Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <button
          type="button"
          onClick={() => setShowTransitLayer((v) => !v)}
          className={`pointer-events-auto inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border shadow-md backdrop-blur-md transition-colors ${
            showTransitLayer
              ? 'bg-slate-900/90 dark:bg-sky-500/95 text-white dark:text-slate-950 border-slate-800 dark:border-sky-400'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{showTransitLayer ? 'Hatlar Açık' : 'Hatları Göster'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMobileExpand}
          className="lg:hidden pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-md backdrop-blur-md"
        >
          {isMobileExpanded ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Küçült</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tam Harita</span>
            </>
          )}
        </button>
      </div>

      {/* Onboarding Card when user hasn't picked a location */}
      <AnimatePresence>
        {!userLocation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/35 dark:bg-slate-950/55 backdrop-blur-[2px] pointer-events-auto"
          >
            <div className="max-w-sm w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl text-center">
              <div className="relative mx-auto w-14 h-14 flex items-center justify-center mb-3.5">
                <motion.span
                  animate={{ scale: [1, 1.8], opacity: [0.45, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-blue-500/30 dark:bg-sky-400/30"
                />
                <div className="relative w-12 h-12 rounded-2xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center shadow-lg">
                  <LocateFixed className="w-6 h-6" aria-hidden="true" />
                </div>
              </div>

              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Anlık Konumunuzla Başlayın
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                İstanbul’daki en yakın otobüs, metrobüs, metro, Marmaray,
                tramvay ve vapur duraklarını, yürüyüş süresini ve duraktan
                geçen anlık hatları görün.
              </p>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={isLocating}
                onClick={onRequestLocation}
                className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 shadow-md transition-colors disabled:opacity-60"
              >
                <LocateFixed
                  className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isLocating ? 'Konum Alınıyor...' : 'Anlık Konumu Al'}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Walking Route Panel */}
      <AnimatePresence>
        {routeTargetStop && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{
                      backgroundColor:
                        TRANSIT_MODE_META[routeTargetStop.mode].color,
                    }}
                  >
                    <TransitModeIcon
                      mode={routeTargetStop.mode}
                      className="w-4 h-4"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {TRANSIT_MODE_META[routeTargetStop.mode].label} · Yürüyüş
                      Rotası
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {routeTargetStop.name}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClearRoute}
                  aria-label="Yol tarifini kapat"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {routeLoading ? (
                <div className="mt-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <motion.span
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  >
                    <Footprints className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  </motion.span>
                  <span>Yürüyüş rotası hesaplanıyor...</span>
                </div>
              ) : routeError ? (
                <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                  {routeError}
                </div>
              ) : (
                <>
                  <div className="mt-3 flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 font-mono-tabular">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <Clock
                        className="w-4 h-4 text-blue-600 dark:text-sky-400"
                        aria-hidden="true"
                      />
                      <span>
                        {activeRoute
                          ? formatWalkingDuration(
                              calculateWalkingMinutes(
                                activeRoute.distanceMeters,
                                walkingSpeedKmh
                              )
                            )
                          : formatWalkingDuration(routeTargetStop.walkingMinutes)}
                      </span>
                    </div>
                    <span
                      className="text-slate-300 dark:text-slate-600"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <Footprints className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {activeRoute
                          ? `${formatDistanceKm(activeRoute.distanceMeters)} (${formatDistanceMeters(activeRoute.distanceMeters)})`
                          : formatDistanceKm(routeTargetStop.distanceMeters)}
                      </span>
                    </div>
                  </div>

                  {activeRoute && activeRoute.steps.length > 0 && (
                    <div className="mt-2.5 max-h-28 sm:max-h-36 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                      {activeRoute.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="font-mono-tabular text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="leading-relaxed">
                              {step.instruction}
                            </span>
                          </div>
                          <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                            {step.distanceText}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {externalMapsUrl && (
                    <a
                      href={externalMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
                    >
                      <span>Google Haritalar’da Yürüyerek Git</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Transit Transfer Route Summary Overlay */}
      <AnimatePresence>
        {!routeTargetStop && activeTransferJourney && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center shrink-0">
                    <Repeat2 className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {activeTransferJourney.transferCount === 0
                        ? 'Aktarmasız Direkt Rota'
                        : `${activeTransferJourney.transferCount} Aktarmalı Toplu Taşıma Rotası`}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono-tabular">
                      {formatWalkingDuration(
                        activeTransferJourney.totalDurationMinutes
                      )}{' '}
                      ·{' '}
                      {formatDistanceKm(
                        activeTransferJourney.totalDistanceMeters
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClearTransferJourney}
                  aria-label="Aktarma rotasını kapat"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                {activeTransferJourney.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="inline-flex items-center gap-1.5"
                  >
                    {idx > 0 && (
                      <span
                        aria-hidden="true"
                        className="text-xs text-slate-400"
                      >
                        →
                      </span>
                    )}
                    {step.kind === 'WALKING' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-slate-600 dark:text-slate-300">
                        <Footprints className="w-3 h-3" aria-hidden="true" />
                        {step.durationMinutes} dk
                      </span>
                    ) : (
                      (() => {
                        const mode = step.mode || 'bus';
                        const badge = getIstanbulLineColors(
                          step.lineCode || 'Hat',
                          mode,
                          step.color,
                          step.textColor
                        );
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold font-mono-tabular"
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.text,
                            }}
                          >
                            <TransitModeIcon
                              mode={mode}
                              className="w-3 h-3"
                            />
                            <span>{step.lineCode}</span>
                          </span>
                        );
                      })()
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
