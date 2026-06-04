export type MemoVisibility = 'private' | 'public';
export type ExpiryPreset = '1d' | '1w' | '1m' | '3m' | 'custom';
export type RadiusValue = 50 | 100 | 200 | 500;
export type SpotLogTab = 'map' | 'nearby' | 'my' | 'settings';
export type MyMemoTab = 'private' | 'public' | 'expired';
export type MemoOwner = 'me' | 'others';
export type MemoSort = 'recent' | 'expiring' | 'distance';
export type PermissionState = 'granted' | 'prompt' | 'denied';
export type MemoSheetContext = 'map' | 'nearby' | 'my' | 'bookmark';

export interface LocationResult {
  id: string;
  name: string;
  address: string;
  distanceMeters: number;
  coordinate: {
    lat: number;
    lng: number;
  };
  pin: {
    left: string;
    top: string;
  };
}

export interface SpotLogMemo {
  id: string;
  title: string;
  content: string;
  visibility: MemoVisibility;
  distance: string;
  dDay?: string;
  createdAt: string;
  expiresAt?: string;
  status?: 'active' | 'expired';
  progress?: number;
  bookmarked?: boolean;
  author?: string;
  owner: MemoOwner;
  distanceMeters: number;
  radius: RadiusValue;
  summary: string;
  locationName: string;
  coordinate: {
    lat: number;
    lng: number;
  };
  pin: {
    left: string;
    top: string;
  };
  createdAtIso: string;
  expiresAtIso?: string;
}

export interface ComposeDraft {
  title: string;
  content: string;
  placeQuery: string;
  selectedLocationId: string;
  visibility: MemoVisibility;
  expiryPreset: ExpiryPreset;
  customDate: string;
  radius: RadiusValue;
}
