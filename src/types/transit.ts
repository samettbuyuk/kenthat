export type TransitMode =
  | 'bus'
  | 'metrobus'
  | 'metro'
  | 'marmaray'
  | 'tram'
  | 'ferry';

export type ThemeMode = 'light' | 'dark';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface TransitStop {
  id: string;
  name: string;
  address: string;
  location: LatLngPoint;
  mode: TransitMode;
  placeTypes: string[];
  googleMapsUri?: string;
  distanceMeters: number;
  walkingMinutes: number;
  isExactRouteMatrix?: boolean;
  isWalkable?: boolean;
  lineHintLabel?: string;
}

export interface TransitLineDeparture {
  id: string;
  lineCode: string;
  lineName: string;
  headsign?: string;
  vehicleType?: string;
  agencyName?: string;
  color?: string;
  textColor?: string;
  departureTimeIso?: string;
  headwayMinutes?: number;
  stopCount?: number;
  departureStopName?: string;
  source: 'live-route' | 'station-registry';
}

export interface TransitPlatformInfo {
  name: string;
  stopCode?: string;
  platformCode?: string;
  signageText?: string;
  wheelchairAccessible?: boolean;
}

export interface StopTransitDetails {
  stopId: string;
  stationName: string;
  address?: string;
  googleMapsUri?: string;
  agencies: string[];
  lines: TransitLineDeparture[];
  platforms: TransitPlatformInfo[];
  fetchedAtIso: string;
}

export interface WalkingRouteStep {
  instruction: string;
  distanceText: string;
  durationText: string;
  maneuver?: string;
}

export interface ActiveWalkingRoute {
  stop: TransitStop;
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
  steps: WalkingRouteStep[];
}

export interface TransferEndpoint {
  label: string;
  subtitle?: string;
  location: LatLngPoint;
  mode?: TransitMode;
}

export interface TransferStepItem {
  id: string;
  kind: 'WALKING' | 'TRANSIT';
  instruction: string;
  distanceMeters: number;
  durationMinutes: number;
  mode?: TransitMode;
  lineCode?: string;
  lineName?: string;
  headsign?: string;
  departureStopName?: string;
  arrivalStopName?: string;
  departureTimeIso?: string;
  arrivalTimeIso?: string;
  stopCount?: number;
  color?: string;
  textColor?: string;
  path?: LatLngPoint[];
}

export interface TransferJourneyOption {
  id: string;
  totalDurationMinutes: number;
  totalDistanceMeters: number;
  transferCount: number;
  departureTimeIso?: string;
  arrivalTimeIso?: string;
  steps: TransferStepItem[];
  viewport?: google.maps.LatLngBounds;
  overallPath?: LatLngPoint[];
}

export const DEFAULT_WALKING_SPEED_KMH = 4.5;

export interface ReferenceDistrict {
  id: string;
  name: string;
  subtitle: string;
  location: LatLngPoint;
}

export const ISTANBUL_CENTER: LatLngPoint = {
  lat: 41.0082,
  lng: 28.9784,
};

export const ISTANBUL_REFERENCE_POINTS: ReferenceDistrict[] = [
  {
    id: 'taksim',
    name: 'Taksim',
    subtitle: 'Beyoğlu',
    location: { lat: 41.037, lng: 28.985 },
  },
  {
    id: 'kadikoy',
    name: 'Kadıköy',
    subtitle: 'Rıhtım',
    location: { lat: 40.9906, lng: 29.0235 },
  },
  {
    id: 'besiktas',
    name: 'Beşiktaş',
    subtitle: 'Meydan',
    location: { lat: 41.0422, lng: 29.0067 },
  },
  {
    id: 'mecidiyekoy',
    name: 'Mecidiyeköy',
    subtitle: 'Şişli',
    location: { lat: 41.0668, lng: 28.9949 },
  },
  {
    id: 'uskudar',
    name: 'Üsküdar',
    subtitle: 'Marmaray',
    location: { lat: 41.0261, lng: 29.0152 },
  },
  {
    id: 'yenikapi',
    name: 'Yenikapı',
    subtitle: 'Aktarma',
    location: { lat: 41.0052, lng: 28.9519 },
  },
];
