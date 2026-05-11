import { loadKakaoMapsSdk } from '../../../shared/lib/kakao-maps';
import type { LocationResult } from '../model/memo';
import { calculateDistanceMeters } from './location';

const DEFAULT_PIN = {
  left: '50%',
  top: '50%',
} as const;

function buildLocationResult({
  id,
  name,
  address,
  coordinate,
  distanceMeters,
}: {
  id: string;
  name: string;
  address: string;
  coordinate: { lat: number; lng: number };
  distanceMeters: number;
}): LocationResult {
  return {
    id,
    name,
    address,
    coordinate,
    distanceMeters,
    pin: DEFAULT_PIN,
  };
}

function normalizeAddress(address?: string | null, fallback?: string | null) {
  const trimmedAddress = address?.trim();

  if (trimmedAddress) {
    return trimmedAddress;
  }

  const trimmedFallback = fallback?.trim();
  return trimmedFallback || '주소 정보 없음';
}

function calculateResultDistance({
  currentCoordinate,
  coordinate,
  rawDistance,
}: {
  currentCoordinate?: { lat: number; lng: number } | null;
  coordinate: { lat: number; lng: number };
  rawDistance?: string;
}) {
  const parsedDistance = rawDistance ? Number(rawDistance) : Number.NaN;

  if (Number.isFinite(parsedDistance)) {
    return parsedDistance;
  }

  if (!currentCoordinate) {
    return 0;
  }

  return calculateDistanceMeters(currentCoordinate, coordinate);
}

function mapKeywordSearchResult({
  item,
  currentCoordinate,
}: {
  item: any;
  currentCoordinate?: { lat: number; lng: number } | null;
}) {
  const coordinate = {
    lat: Number(item.y),
    lng: Number(item.x),
  };

  return buildLocationResult({
    id: `place-${item.id}`,
    name: item.place_name?.trim() || normalizeAddress(item.road_address_name, item.address_name),
    address: normalizeAddress(item.road_address_name, item.address_name),
    coordinate,
    distanceMeters: calculateResultDistance({
      currentCoordinate,
      coordinate,
      rawDistance: item.distance,
    }),
  });
}

function mapAddressSearchResult({
  item,
  currentCoordinate,
}: {
  item: any;
  currentCoordinate?: { lat: number; lng: number } | null;
}) {
  const coordinate = {
    lat: Number(item.y),
    lng: Number(item.x),
  };
  const roadAddress = item.road_address?.address_name;
  const address = normalizeAddress(roadAddress, item.address_name);

  return buildLocationResult({
    id: `address-${item.x}-${item.y}`,
    name: address,
    address,
    coordinate,
    distanceMeters: calculateResultDistance({
      currentCoordinate,
      coordinate,
    }),
  });
}

function dedupeLocations(locations: LocationResult[]) {
  const seen = new Set<string>();

  return locations.filter((location) => {
    const key = `${location.coordinate.lat}|${location.coordinate.lng}|${location.name}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function searchLocationResults({
  query,
  currentCoordinate,
}: {
  query: string;
  currentCoordinate?: { lat: number; lng: number } | null;
}) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const kakao = await loadKakaoMapsSdk();

  return new Promise<LocationResult[]>((resolve, reject) => {
    const places = new kakao.maps.services.Places();
    const geocoder = new kakao.maps.services.Geocoder();

    const searchAddressFallback = () => {
      geocoder.addressSearch(trimmedQuery, (result: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(
            dedupeLocations(
              result.map((item) =>
                mapAddressSearchResult({
                  item,
                  currentCoordinate,
                }),
              ),
            ),
          );
          return;
        }

        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }

        reject(new Error('카카오 주소 검색에 실패했습니다.'));
      });
    };

    places.keywordSearch(
      trimmedQuery,
      (result: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(
            dedupeLocations(
              result.map((item) =>
                mapKeywordSearchResult({
                  item,
                  currentCoordinate,
                }),
              ),
            ),
          );
          return;
        }

        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          searchAddressFallback();
          return;
        }

        reject(new Error('카카오 장소 검색에 실패했습니다.'));
      },
      currentCoordinate
        ? {
            location: new kakao.maps.LatLng(currentCoordinate.lat, currentCoordinate.lng),
            radius: 20000,
            sort: kakao.maps.services.SortBy.DISTANCE,
            size: 10,
          }
        : {
            size: 10,
          },
    );
  });
}

export async function reverseGeocodeCurrentLocation(coordinate: { lat: number; lng: number }) {
  const kakao = await loadKakaoMapsSdk();

  return new Promise<{ address: string }>((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.coord2Address(
      coordinate.lng,
      coordinate.lat,
      (result: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK || result.length === 0) {
          resolve({
            address: `${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}`,
          });
          return;
        }

        const roadAddress = result[0]?.road_address?.address_name;
        const addressName = result[0]?.address?.address_name;

        resolve({
          address: normalizeAddress(roadAddress, addressName),
        });
      },
    );
  });
}
