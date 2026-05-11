import { useEffect, useMemo, useRef, useState } from 'react';
import { loadKakaoMapsSdk } from '../lib/kakao-maps';
import { cx } from '../lib/ui';

type MarkerTone = 'private' | 'public' | 'current';

export interface KakaoMapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  tone: MarkerTone;
  label?: string;
  subtitle?: string;
}

function svgMarkerDataUrl({
  tone,
  active,
}: {
  tone: MarkerTone;
  active?: boolean;
}) {
  const fill =
    tone === 'current' ? '#185FA5' : tone === 'private' ? '#22211F' : '#D86F45';
  const stroke = active ? '#111111' : '#FFFFFF';
  const size = active ? 28 : 24;
  const innerRadius = tone === 'current' ? 5 : 6;
  const outerRadius = tone === 'current' ? 10 : 9;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="${outerRadius}" fill="${fill}" stroke="${stroke}" stroke-width="${tone === 'current' ? 3 : 2}" />
      <circle cx="12" cy="12" r="${innerRadius}" fill="#FFFFFF" fill-opacity="${tone === 'current' ? 0.28 : 0.18}" />
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function defaultCenter() {
  return {
    lat: 37.5665,
    lng: 126.978,
  };
}

export function KakaoMapCanvas({
  center,
  markers,
  selectedMarkerId,
  onMarkerClick,
  circle,
  className,
  level = 4,
  active = true,
}: {
  center?: {
    lat: number;
    lng: number;
  } | null;
  markers?: KakaoMapMarker[];
  selectedMarkerId?: string | null;
  onMarkerClick?: (id: string) => void;
  circle?: {
    center: {
      lat: number;
      lng: number;
    };
    radius: number;
  } | null;
  className?: string;
  level?: number;
  active?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const infoWindowRefs = useRef<any[]>([]);
  const circleRef = useRef<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReady, setIsReady] = useState(false);

  const mapCenter = useMemo(() => center ?? defaultCenter(), [center]);

  useEffect(() => {
    let mounted = true;

    async function initializeMap() {
      if (!containerRef.current) {
        return;
      }

      try {
        const kakao = await loadKakaoMapsSdk();

        if (!mounted || !containerRef.current) {
          return;
        }

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng),
          level,
        });

        mapRef.current = map;
        setIsReady(true);
        setErrorMessage('');
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : '카카오맵을 불러오지 못했습니다.');
      }
    }

    void initializeMap();

    return () => {
      mounted = false;
    };
  }, [level]);

  useEffect(() => {
    if (!mapRef.current || !active || !isReady) {
      return;
    }

    const map = mapRef.current;

    requestAnimationFrame(() => {
      map.relayout();
      map.setCenter(new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng));
    });
  }, [active, isReady, mapCenter.lat, mapCenter.lng]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.setMap(null));
    infoWindowRefs.current.forEach((infoWindow) => infoWindow.close());
    markerRefs.current = [];
    infoWindowRefs.current = [];

    const kakao = window.kakao;

    if (!kakao) {
      return;
    }

    markers?.forEach((marker) => {
      const isActive = marker.id === selectedMarkerId;
      const size = isActive ? 28 : 24;
      const markerImage = new kakao.maps.MarkerImage(
        svgMarkerDataUrl({
          tone: marker.tone,
          active: isActive,
        }),
        new kakao.maps.Size(size, size),
        {
          offset: new kakao.maps.Point(size / 2, size / 2),
        },
      );

      const instance = new kakao.maps.Marker({
        map: mapRef.current,
        position: new kakao.maps.LatLng(marker.position.lat, marker.position.lng),
        title: marker.label ?? marker.subtitle ?? '',
        image: markerImage,
      });

      if (onMarkerClick) {
        kakao.maps.event.addListener(instance, 'click', () => onMarkerClick(marker.id));
      }

      if (isActive && (marker.label || marker.subtitle)) {
        const infoWindow = new kakao.maps.InfoWindow({
          content: `
            <div style="padding:10px 12px; min-width:150px; font-size:12px; line-height:1.5;">
              <strong style="display:block; margin-bottom:2px;">${marker.label ?? ''}</strong>
              ${marker.subtitle ? `<span style="color:#6E665F;">${marker.subtitle}</span>` : ''}
            </div>
          `,
        });

        infoWindow.open(mapRef.current, instance);
        infoWindowRefs.current.push(infoWindow);
      }

      markerRefs.current.push(instance);
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      infoWindowRefs.current.forEach((infoWindow) => infoWindow.close());
    };
  }, [markers, onMarkerClick, selectedMarkerId]);

  useEffect(() => {
    if (!mapRef.current || !window.kakao) {
      return;
    }

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (!circle) {
      return;
    }

    const instance = new window.kakao.maps.Circle({
      center: new window.kakao.maps.LatLng(circle.center.lat, circle.center.lng),
      radius: circle.radius,
      strokeWeight: 2,
      strokeColor: '#185FA5',
      strokeOpacity: 0.45,
      strokeStyle: 'solid',
      fillColor: '#185FA5',
      fillOpacity: 0.12,
    });

    instance.setMap(mapRef.current);
    circleRef.current = instance;

    return () => {
      instance.setMap(null);
    };
  }, [circle]);

  return (
    <div className={cx('kakao-map-shell', className)}>
      <div ref={containerRef} className="kakao-map-canvas" />
      {!isReady || errorMessage ? (
        <div className="kakao-map-state">
          <p>{errorMessage || '카카오맵을 불러오는 중입니다.'}</p>
        </div>
      ) : null}
    </div>
  );
}
