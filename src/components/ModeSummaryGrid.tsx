import { motion } from 'motion/react';
import {
  ChevronRight,
  ExternalLink,
  Footprints,
  ListFilter,
  MapPin,
  Navigation,
} from 'lucide-react';
import type {
  LatLngPoint,
  StopCrowdednessInfo,
  TransitMode,
  TransitStop,
} from '../types/transit';
import {
  TRANSIT_MODE_META,
  TRANSIT_MODE_ORDER,
  buildGoogleMapsWalkingUrl,
  formatDistanceKm,
  formatDistanceMeters,
  formatWalkingDuration,
} from '../utils/transitUtils';
import { CrowdednessMeter } from './CrowdednessMeter';
import { TransitModeIcon } from './TransitModeIcon';

interface ModeSummaryGridProps {
  closestByMode: Partial<Record<TransitMode, TransitStop>>;
  crowdednessByStopId?: Record<string, StopCrowdednessInfo>;
  userLocation: LatLngPoint | null;
  selectedStopId: string | null;
  hoveredStopId: string | null;
  isLoading: boolean;
  isComputingWalking: boolean;
  onInspectLines: (stop: TransitStop) => void;
  onHoverStop: (stopId: string | null) => void;
  onRequestDirections: (stop: TransitStop) => void;
}

export function ModeSummaryGrid({
  closestByMode,
  crowdednessByStopId,
  userLocation,
  selectedStopId,
  hoveredStopId,
  isLoading,
  isComputingWalking,
  onInspectLines,
  onHoverStop,
  onRequestDirections,
}: ModeSummaryGridProps) {
  if (!userLocation && !isLoading) {
    return null;
  }

  let fastestStopId: string | null = null;
  let minWalkingMeters = Infinity;
  for (const mode of TRANSIT_MODE_ORDER) {
    const s = closestByMode[mode];
    if (s && s.isWalkable !== false && s.distanceMeters < minWalkingMeters) {
      minWalkingMeters = s.distanceMeters;
      fastestStopId = s.id;
    }
  }

  return (
    <section
      id="ulasim-ozeti"
      aria-label="İstanbul toplu taşıma türlerine göre en yakın duraklar"
      className="space-y-3"
    >
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          En Yakın İstanbul Durakları
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isComputingWalking
            ? 'Yaya rotası hesaplanıyor...'
            : 'Hatları görmek için durağa dokunun'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {TRANSIT_MODE_ORDER.map((mode, idx) => {
          const meta = TRANSIT_MODE_META[mode];
          const stop = closestByMode[mode];

          if (isLoading && !stop) {
            return (
              <div
                key={mode}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-44 rounded bg-slate-100 dark:bg-slate-800/70" />
                  </div>
                </div>
                <div className="h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800/80" />
              </div>
            );
          }

          const isSelected = Boolean(stop && selectedStopId === stop.id);
          const isHovered = Boolean(stop && hoveredStopId === stop.id);
          const isFastest = Boolean(stop && fastestStopId === stop.id);

          const proximityRatio = stop
            ? Math.max(0.1, Math.min(1, 1 - stop.distanceMeters / 3500))
            : 0;

          const externalWalkUrl =
            stop && userLocation
              ? buildGoogleMapsWalkingUrl(userLocation, stop.location)
              : stop?.googleMapsUri;

          return (
            <motion.article
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: idx * 0.045,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -2 }}
              onMouseEnter={() => stop && onHoverStop(stop.id)}
              onMouseLeave={() => onHoverStop(null)}
              className={`rounded-2xl border p-3.5 sm:p-4 transition-colors ${
                isSelected
                  ? 'border-slate-900 dark:border-sky-400 bg-white dark:bg-slate-900 ring-1 ring-slate-900 dark:ring-sky-400 shadow-sm'
                  : isHovered
                  ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              {/* Main clickable header selects stop & fetches live passing lines */}
              <button
                type="button"
                disabled={!stop}
                onClick={() => stop && onInspectLines(stop)}
                className="w-full flex items-start justify-between gap-3 text-left focus-visible:outline-none disabled:cursor-default group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <motion.div
                    whileHover={{ scale: 1.07, rotate: -3 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: meta.color }}
                  >
                    <TransitModeIcon mode={mode} className="w-5 h-5" />
                  </motion.div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {meta.label}
                      </span>
                      <span
                        className="text-slate-300 dark:text-slate-700"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                        {stop?.lineHintLabel || meta.lineHint}
                      </span>
                      {isFastest && (
                        <>
                          <span
                            className="text-slate-300 dark:text-slate-700"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            En Yakın
                          </span>
                        </>
                      )}
                    </div>

                    {stop ? (
                      <>
                        <h3 className="mt-0.5 text-sm font-extrabold text-slate-950 dark:text-white truncate flex items-center gap-1">
                          <span className="truncate">{stop.name}</span>
                          <ChevronRight
                            className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0"
                            aria-hidden="true"
                          />
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{stop.address}</span>
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Yakında {meta.shortLabel.toLowerCase()} durağı bulunamadı
                      </p>
                    )}
                  </div>
                </div>

                {stop && (
                  <div className="text-right shrink-0 font-mono-tabular">
                    {stop.isWalkable === false ? (
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Karşı yaka
                      </div>
                    ) : (
                      <>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                          {formatWalkingDuration(stop.walkingMinutes)}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {formatDistanceKm(stop.distanceMeters)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </button>

              {stop && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  {/* Walking Metric Line + Proximity Progress */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5 font-mono-tabular min-w-0 truncate">
                        <Footprints
                          className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0"
                          aria-hidden="true"
                        />
                        {stop.isWalkable === false ? (
                          <span className="truncate">
                            Yaya rotası yok ({formatDistanceKm(stop.distanceMeters)} kuş
                            uçuşu)
                          </span>
                        ) : (
                          <span className="truncate">
                            Yürüyerek {formatWalkingDuration(stop.walkingMinutes)} ·{' '}
                            {stop.distanceMeters < 1000
                              ? formatDistanceMeters(stop.distanceMeters)
                              : formatDistanceKm(stop.distanceMeters)}
                          </span>
                        )}
                      </span>

                      {crowdednessByStopId?.[stop.id] ? (
                        <CrowdednessMeter info={crowdednessByStopId[stop.id]} />
                      ) : isSelected ? (
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-sky-400">
                          Seçili
                        </span>
                      ) : null}
                    </div>

                  <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: proximityRatio }}
                      transition={{
                        duration: 0.5,
                        delay: idx * 0.05,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        backgroundColor: meta.color,
                        transformOrigin: 'left center',
                      }}
                      className="h-full w-full rounded-full"
                    />
                  </div>

                  {/* Interactive Actions */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onInspectLines(stop)}
                      className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                      }`}
                    >
                      <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Hatlar &amp; Sefer</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onRequestDirections(stop)}
                      className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap"
                    >
                      <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Yol Tarifi</span>
                    </motion.button>

                    {externalWalkUrl && (
                      <a
                        href={externalWalkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${stop.name} konumunu Google Haritalar'da aç`}
                        title="Google Haritalar'da Yürüyerek Aç"
                        className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
