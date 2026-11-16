import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Clock,
  ExternalLink,
  Footprints,
  LocateFixed,
  Map as MapIcon,
  RefreshCw,
  Repeat2,
} from 'lucide-react';
import {
  ISTANBUL_REFERENCE_POINTS,
  type LatLngPoint,
  type TransferEndpoint,
  type TransferJourneyOption,
  type TransitMode,
  type TransitStop,
} from '../types/transit';
import {
  TRANSIT_MODE_META,
  TRANSIT_MODE_ORDER,
  buildGoogleMapsTransitUrl,
  formatClockTime,
  formatDistanceKm,
  formatDistanceMeters,
  formatWalkingDuration,
  getIstanbulLineColors,
} from '../utils/transitUtils';
import { PlaceSearchBox } from './PlaceSearchBox';
import { TransitModeIcon } from './TransitModeIcon';

interface TransferPlannerPanelProps {
  userLocation: LatLngPoint | null;
  locationLabel: string;
  isLocating: boolean;
  isLoadingStops: boolean;
  locationError: string | null;
  closestByMode: Partial<Record<TransitMode, TransitStop>>;
  origin: TransferEndpoint | null;
  destination: TransferEndpoint | null;
  journeys: TransferJourneyOption[];
  selectedJourneyId: string | null;
  isLoading: boolean;
  error: string | null;
  onRequestLiveLocation: () => void;
  onChangeOrigin: (endpoint: TransferEndpoint) => void;
  onChangeDestination: (endpoint: TransferEndpoint) => void;
  onSwapEndpoints: () => void;
  onSelectJourney: (journey: TransferJourneyOption) => void;
  onShowOnMap: (journey: TransferJourneyOption) => void;
  onRefresh: () => void;
}

export function TransferPlannerPanel({
  userLocation,
  locationLabel,
  isLocating,
  isLoadingStops,
  locationError,
  closestByMode,
  origin,
  destination,
  journeys,
  selectedJourneyId,
  isLoading,
  error,
  onRequestLiveLocation,
  onChangeOrigin,
  onChangeDestination,
  onSwapEndpoints,
  onSelectJourney,
  onShowOnMap,
  onRefresh,
}: TransferPlannerPanelProps) {
  const [showOriginSearch, setShowOriginSearch] = useState(false);
  const [showDestSearch, setShowDestSearch] = useState(false);

  const availableNearbyStops = TRANSIT_MODE_ORDER.map((m) => closestByMode[m])
    .filter((s): s is TransitStop => Boolean(s))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const externalTransitUrl =
    origin && destination
      ? buildGoogleMapsTransitUrl(origin.location, destination.location)
      : null;

  return (
    <section
      id="aktarma-planlayici"
      aria-label="Toplu taşıma aktarma planlayıcısı"
      className="space-y-4"
    >
      {/* Route Origin / Destination Selector Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Repeat2
                className="w-4 h-4 text-blue-600 dark:text-sky-400"
                aria-hidden="true"
              />
              <span>Toplu Taşıma Aktarma Planla</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Bir duraktan veya konumdan diğer toplu taşımaya hangi hatlarla
              aktarma yapacağınızı görün.
            </p>
          </div>

          {origin && destination && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Aktarma rotalarını yenile"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        {/* Origin Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nereden (Başlangıç)
            </span>
            <button
              type="button"
              onClick={() => setShowOriginSearch((v) => !v)}
              className="text-xs font-semibold text-blue-600 dark:text-sky-400 hover:underline"
            >
              {showOriginSearch ? 'Aramayı Kapat' : 'Yer Ara'}
            </button>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {origin?.label || 'Başlangıç noktası seçin'}
              </div>
              {origin?.subtitle && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {origin.subtitle}
                </div>
              )}
            </div>
            {userLocation &&
              (origin?.location.lat !== userLocation.lat ||
                origin?.location.lng !== userLocation.lng) && (
                <button
                  type="button"
                  onClick={() =>
                    onChangeOrigin({
                      label: locationLabel || 'Mevcut Konumum',
                      subtitle: 'Aktif konum',
                      location: userLocation,
                    })
                  }
                  className="text-[11px] font-semibold text-blue-600 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
                >
                  Konumumu Kullan
                </button>
              )}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isLocating}
            onClick={onRequestLiveLocation}
            className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-blue-200 dark:border-sky-800/70 bg-blue-50/90 hover:bg-blue-100/90 dark:bg-sky-950/40 dark:hover:bg-sky-950/70 text-blue-700 dark:text-sky-300 transition-colors disabled:opacity-60"
          >
            <LocateFixed
              className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>
              {isLocating
                ? 'Anlık GPS Konumu Alınıyor...'
                : 'Başlangıç İçin Anlık Konumu Al'}
            </span>
          </motion.button>

          {locationError && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-[11px] text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{locationError}</span>
            </div>
          )}

          {showOriginSearch && (
            <PlaceSearchBox
              onSelectLocation={(point, label) => {
                onChangeOrigin({ label, location: point });
                setShowOriginSearch(false);
              }}
            />
          )}

          {availableNearbyStops.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableNearbyStops.map((stop) => {
                const isActive =
                  origin?.location.lat === stop.location.lat &&
                  origin?.location.lng === stop.location.lng;
                return (
                  <button
                    key={`orig-${stop.id}`}
                    type="button"
                    title={`${stop.name} (${formatDistanceMeters(stop.distanceMeters)})`}
                    onClick={() =>
                      onChangeOrigin({
                        label: stop.name,
                        subtitle: TRANSIT_MODE_META[stop.mode].label,
                        location: stop.location,
                        mode: stop.mode,
                      })
                    }
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'border-blue-600 dark:border-sky-400 bg-blue-50 dark:bg-sky-950/50 text-blue-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <TransitModeIcon mode={stop.mode} className="w-3.5 h-3.5" />
                    <span>{TRANSIT_MODE_META[stop.mode].shortLabel}</span>
                    {stop.isWalkable !== false && (
                      <span className="text-[10px] font-mono-tabular opacity-75">
                        · {formatWalkingDuration(stop.walkingMinutes)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Swap Divider */}
        <div className="relative flex items-center justify-center">
          <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />
          <motion.button
            type="button"
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={onSwapEndpoints}
            disabled={!origin || !destination}
            aria-label="Başlangıç ve varış noktalarını değiştir"
            className="absolute px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white inline-flex items-center gap-1 shadow-xs disabled:opacity-40"
          >
            <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Değiştir</span>
          </motion.button>
        </div>

        {/* Destination Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nereye / Hangi Toplu Taşımaya?
            </span>
            <button
              type="button"
              onClick={() => setShowDestSearch((v) => !v)}
              className="text-xs font-semibold text-blue-600 dark:text-sky-400 hover:underline"
            >
              {showDestSearch ? 'Aramayı Kapat' : 'İstasyon / Semt Ara'}
            </button>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {destination?.label || 'Hedef durak veya semt seçin'}
            </div>
            {destination?.subtitle && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {destination.subtitle}
              </div>
            )}
          </div>

          {showDestSearch && (
            <PlaceSearchBox
              onSelectLocation={(point, label) => {
                onChangeDestination({ label, location: point });
                setShowDestSearch(false);
              }}
            />
          )}

          {/* Closest Transit Options for Live/Active Location */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {locationLabel
                  ? `${locationLabel} İçin En Yakın Toplu Taşıma Seçenekleri`
                  : 'Anlık Konuma En Yakın Toplu Taşıma Seçenekleri'}
              </span>
              {availableNearbyStops.length > 0 && (
                <span className="font-mono-tabular whitespace-nowrap">
                  Yakından uzağa
                </span>
              )}
            </div>

            {!userLocation && !isLoadingStops ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span>
                  Anlık konumu aldığınızda size en yakın otobüs, metrobüs, metro,
                  Marmaray, tramvay ve vapur durakları burada sıralanır.
                </span>
                <button
                  type="button"
                  disabled={isLocating}
                  onClick={onRequestLiveLocation}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-semibold text-[11px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  <LocateFixed
                    className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Konuma Göre Göster</span>
                </button>
              </div>
            ) : isLoadingStops && availableNearbyStops.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-busy="true">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="h-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 animate-pulse flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-2.5 w-28 rounded bg-slate-100 dark:bg-slate-800/80" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableNearbyStops.map((stop) => {
                  const meta = TRANSIT_MODE_META[stop.mode];
                  const isActive =
                    destination?.location.lat === stop.location.lat &&
                    destination?.location.lng === stop.location.lng;

                  return (
                    <button
                      key={`dest-${stop.id}`}
                      type="button"
                      onClick={() =>
                        onChangeDestination({
                          label: stop.name,
                          subtitle: `${meta.label} · ${
                            stop.isWalkable === false
                              ? 'Karşı yaka'
                              : `${formatWalkingDuration(stop.walkingMinutes)} (${formatDistanceKm(stop.distanceMeters)})`
                          }`,
                          location: stop.location,
                          mode: stop.mode,
                        })
                      }
                      className={`p-2.5 text-left rounded-xl border transition-colors flex items-center gap-2.5 min-w-0 ${
                        isActive
                          ? 'border-slate-900 dark:border-sky-400 bg-slate-900 text-white dark:bg-sky-500/15 dark:text-white ring-1 ring-slate-900 dark:ring-sky-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-blue-500 dark:hover:border-sky-500'
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: meta.color }}
                      >
                        <TransitModeIcon mode={stop.mode} className="w-4 h-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`text-[11px] font-bold truncate ${
                              isActive
                                ? 'text-sky-300 dark:text-sky-300'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {meta.shortLabel}
                          </span>
                          <span
                            className={`text-[11px] font-mono-tabular font-bold whitespace-nowrap shrink-0 ${
                              isActive
                                ? 'text-emerald-300 dark:text-emerald-300'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {stop.isWalkable === false
                              ? 'Karşı yaka'
                              : `${formatWalkingDuration(stop.walkingMinutes)} · ${
                                  stop.distanceMeters < 1000
                                    ? formatDistanceMeters(stop.distanceMeters)
                                    : formatDistanceKm(stop.distanceMeters)
                                }`}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate mt-0.5">
                          {stop.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              İstanbul Ana Aktarma Merkezleri
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ISTANBUL_REFERENCE_POINTS.map((hub) => {
                const isActive =
                  destination?.location.lat === hub.location.lat &&
                  destination?.location.lng === hub.location.lng;
                return (
                  <button
                    key={`hub-${hub.id}`}
                    type="button"
                    onClick={() =>
                      onChangeDestination({
                        label: `${hub.name} (${hub.subtitle})`,
                        subtitle: 'İstanbul Aktarma Merkezi',
                        location: hub.location,
                      })
                    }
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-blue-600 dark:border-sky-400 bg-blue-50 dark:bg-sky-950/40 text-blue-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-500'
                    }`}
                  >
                    {hub.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Journey Options List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-8 w-full rounded-xl bg-slate-100 dark:bg-slate-800/80" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200">
            {error}
          </div>
        ) : journeys.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Aktarma önerilerini görmek için yukarıdan bir başlangıç ve hedef durak
            veya aktarma merkezi seçin.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {journeys.map((journey, jIdx) => {
              const isSelected = selectedJourneyId === journey.id;
              const transitSteps = journey.steps.filter(
                (s) => s.kind === 'TRANSIT'
              );

              return (
                <motion.article
                  key={journey.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.24,
                    delay: jIdx * 0.05,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`rounded-2xl border transition-colors overflow-hidden ${
                    isSelected
                      ? 'border-slate-900 dark:border-sky-400 bg-white dark:bg-slate-900 ring-1 ring-slate-900 dark:ring-sky-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectJourney(journey)}
                    className="w-full p-4 text-left space-y-3 focus-visible:outline-none"
                  >
                    {/* Top Summary Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {journey.transferCount === 0
                              ? 'Aktarmasız Direkt Hat'
                              : `${journey.transferCount} Aktarmalı Rota`}
                          </span>
                          {jIdx === 0 && (
                            <>
                              <span
                                className="text-slate-300 dark:text-slate-700"
                                aria-hidden="true"
                              >
                                ·
                              </span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                En Hızlı
                              </span>
                            </>
                          )}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular flex items-center gap-1.5">
                          {journey.departureTimeIso && journey.arrivalTimeIso && (
                            <>
                              <span>
                                {formatClockTime(journey.departureTimeIso)} –{' '}
                                {formatClockTime(journey.arrivalTimeIso)}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>{formatDistanceKm(journey.totalDistanceMeters)}</span>
                        </div>
                      </div>

                      <div className="text-right font-mono-tabular shrink-0">
                        <div className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                          {formatWalkingDuration(journey.totalDurationMinutes)}
                        </div>
                      </div>
                    </div>

                    {/* Visual Transfer Chain Strip */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {journey.steps.map((step, sIdx) => (
                        <div
                          key={step.id}
                          className="inline-flex items-center gap-1.5"
                        >
                          {sIdx > 0 && (
                            <ArrowRight
                              className="w-3 h-3 text-slate-400 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          {step.kind === 'WALKING' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
                              <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{step.durationMinutes} dk</span>
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
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold font-mono-tabular shadow-xs"
                                  style={{
                                    backgroundColor: badge.bg,
                                    color: badge.text,
                                  }}
                                >
                                  <TransitModeIcon
                                    mode={mode}
                                    className="w-3.5 h-3.5"
                                  />
                                  <span>{step.lineCode}</span>
                                </span>
                              );
                            })()
                          )}
                        </div>
                      ))}
                    </div>
                  </button>

                  {/* Expanded Step-by-Step Transfer Instructions */}
                  {isSelected && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <ol className="space-y-2.5">
                        {journey.steps.map((step, idx) => {
                          const prevStep = journey.steps[idx - 1];
                          const isTransferWalk =
                            step.kind === 'WALKING' &&
                            prevStep?.kind === 'TRANSIT' &&
                            idx < journey.steps.length - 1;

                          if (step.kind === 'WALKING') {
                            return (
                              <li
                                key={step.id}
                                className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300"
                              >
                                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <Footprints
                                    className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300"
                                    aria-hidden="true"
                                  />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {isTransferWalk
                                      ? 'Aktarma Yürüyüşü'
                                      : idx === 0
                                      ? 'Durağa Yürüyüş'
                                      : 'Varış Yürüyüşü'}
                                  </div>
                                  <div className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                                    {formatWalkingDuration(step.durationMinutes)} ·{' '}
                                    {formatDistanceMeters(step.distanceMeters)}
                                  </div>
                                </div>
                              </li>
                            );
                          }

                          const mode = step.mode || 'bus';
                          const badge = getIstanbulLineColors(
                            step.lineCode || 'Hat',
                            mode,
                            step.color,
                            step.textColor
                          );

                          return (
                            <li
                              key={step.id}
                              className="flex items-start gap-2.5 text-xs"
                            >
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5"
                                style={{ backgroundColor: badge.bg, color: badge.text }}
                              >
                                <TransitModeIcon mode={mode} className="w-4 h-4" />
                              </span>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-bold text-slate-900 dark:text-white truncate">
                                    {TRANSIT_MODE_META[mode].shortLabel}{' '}
                                    <span className="font-mono-tabular">
                                      {step.lineCode}
                                    </span>
                                    {step.headsign ? ` → ${step.headsign}` : ''}
                                  </div>
                                  <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                                    {step.durationMinutes} dk
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                  <span>
                                    Biniş: <strong>{step.departureStopName || 'Durak'}</strong>
                                  </span>
                                  {step.arrivalStopName && (
                                    <>
                                      <span className="mx-1 text-slate-400">→</span>
                                      <span>
                                        İniş: <strong>{step.arrivalStopName}</strong>
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular flex items-center gap-2">
                                  {step.departureTimeIso && (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                      <Clock className="w-3 h-3" aria-hidden="true" />
                                      {formatClockTime(step.departureTimeIso)}
                                    </span>
                                  )}
                                  {typeof step.stopCount === 'number' &&
                                    step.stopCount > 0 && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span>{step.stopCount} durak</span>
                                      </>
                                    )}
                                  {transitSteps.length > 1 &&
                                    step !== transitSteps[transitSteps.length - 1] && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-blue-600 dark:text-sky-400 font-medium">
                                          Sonrasında aktarma
                                        </span>
                                      </>
                                    )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>

                      <div className="flex items-center gap-2 pt-1">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onShowOnMap(journey)}
                          className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 transition-colors whitespace-nowrap"
                        >
                          <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Aktarmayı Haritada Göster</span>
                        </motion.button>

                        {externalTransitUrl && (
                          <a
                            href={externalTransitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Haritada Aç</span>
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
