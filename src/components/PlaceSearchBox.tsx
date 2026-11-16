import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'motion/react';
import { MapPin, Search, X } from 'lucide-react';
import { ISTANBUL_CENTER, type LatLngPoint } from '../types/transit';

interface PlaceSearchBoxProps {
  onSelectLocation: (point: LatLngPoint, label: string) => void;
}

export function PlaceSearchBox({ onSelectLocation }: PlaceSearchBoxProps) {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!placesLib || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const { suggestions: raw } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query.trim(),
            sessionToken: sessionTokenRef.current,
            locationBias: {
              center: ISTANBUL_CENTER,
              radius: 40000,
            },
            includedRegionCodes: ['tr'],
            language: 'tr',
            region: 'TR',
          });

        if (cancelled) return;
        const predictions = raw
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => p !== null);
        setSuggestions(predictions);
        setIsOpen(predictions.length > 0);
      } catch (err) {
        if (!cancelled) {
          console.warn('Autocomplete suggestion error:', err);
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, placesLib]);

  const handleSelectPrediction = async (
    prediction: google.maps.places.PlacePrediction
  ) => {
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'displayName', 'formattedAddress'],
      });
      if (place.location) {
        const label =
          place.displayName ||
          prediction.mainText?.text ||
          place.formattedAddress ||
          'Seçilen Konum';
        onSelectLocation(
          { lat: place.location.lat(), lng: place.location.lng() },
          label
        );
        setQuery(label);
        setIsOpen(false);
        sessionTokenRef.current = null;
      }
    } catch (err) {
      console.error('Failed to resolve place details:', err);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search
          className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="İstanbul'da semt, cadde veya yer ara..."
          aria-label="İstanbul içinde konum ara"
          className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            aria-label="Aramayı temizle"
            className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || isSearching) && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 mt-1.5 z-30 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
          >
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-60 overflow-y-auto custom-scrollbar">
              {suggestions.map((prediction) => (
                <li key={prediction.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelectPrediction(prediction)}
                    className="w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <MapPin
                      className="w-4 h-4 text-blue-600 dark:text-sky-400 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {prediction.mainText?.text || prediction.text.text}
                      </div>
                      {prediction.secondaryText?.text && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {prediction.secondaryText.text}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
