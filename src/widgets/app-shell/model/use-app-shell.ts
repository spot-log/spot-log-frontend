import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCurrentLocationResult,
  bottomTabs,
  createInitialDraft,
  createMySortOptions,
  findLocationGroupByMemoId,
  getExpiryIso,
  mapApiMemoToSpotLogMemo,
  memoTabs,
  sortMemos,
  type ComposeDraft,
  type LocationResult,
  type MemoSheetContext,
  type MemoSort,
  type PermissionState,
  type SpotLogMemo,
  type SpotLogTab,
} from '../../../entities/memo';
import {
  ApiError,
  createMemo,
  deleteMemo,
  fetchMyMemos,
  fetchNearbyPublicMemos,
  republishMemo,
  type ApiMemo,
} from '../../../entities/memo/api/memos';
import {
  reverseGeocodeCurrentLocation,
  searchLocationResults,
} from '../../../entities/memo/lib/location-search';
import { clearAuthSession, readAuthSession, type AuthSession } from '../../../features/google-auth';
import type { ToastMessage } from '../../../shared/ui';

function resolveNotificationPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (window.Notification.permission === 'granted') {
    return 'granted';
  }

  if (window.Notification.permission === 'denied') {
    return 'denied';
  }

  return 'prompt';
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function dedupeMemos(memos: SpotLogMemo[]) {
  const seen = new Set<string>();

  return memos.filter((memo) => {
    if (seen.has(memo.id)) {
      return false;
    }

    seen.add(memo.id);
    return true;
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

function matchesCurrentLocationQuery(
  query: string,
  currentLocation: NonNullable<ReturnType<typeof buildCurrentLocationResult>>,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [currentLocation.name, currentLocation.address]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function useAppShell({
  activeTab,
  onLogout,
  onNavigateTab,
}: {
  activeTab: SpotLogTab;
  onLogout?: () => void;
  onNavigateTab?: (tab: SpotLogTab) => void;
}) {
  const logoutHandlerRef = useRef(onLogout);
  const navigateTabHandlerRef = useRef(onNavigateTab);
  const toastTimeoutsRef = useRef<Record<number, number>>({});

  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [rawMyMemos, setRawMyMemos] = useState<ApiMemo[]>([]);
  const [rawNearbyMemos, setRawNearbyMemos] = useState<ApiMemo[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [myTab, setMyTab] = useState<'private' | 'public' | 'expired'>('public');
  const [memoSort, setMemoSort] = useState<MemoSort>('recent');
  const [composeOpen, setComposeOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetContext, setSheetContext] = useState<MemoSheetContext>('map');
  const [selectedMemoId, setSelectedMemoId] = useState('');
  const [deleteMemoId, setDeleteMemoId] = useState<string | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft>(() => createInitialDraft());
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [locationSearchMessage, setLocationSearchMessage] = useState('');
  const [privateAlerts, setPrivateAlerts] = useState(true);
  const [publicAlerts, setPublicAlerts] = useState(false);
  const [locationPermission, setLocationPermission] = useState<PermissionState>('prompt');
  const [notificationPermission, setNotificationPermission] = useState<PermissionState>(
    resolveNotificationPermission,
  );
  const [currentCoordinate, setCurrentCoordinate] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocationAddress, setCurrentLocationAddress] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    logoutHandlerRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    navigateTabHandlerRef.current = onNavigateTab;
  }, [onNavigateTab]);

  const currentLocation = useMemo(
    () =>
      currentCoordinate
        ? buildCurrentLocationResult(currentCoordinate, {
            address: currentLocationAddress || undefined,
          })
        : null,
    [currentCoordinate, currentLocationAddress],
  );

  const selectedLocation = useMemo(() => {
    if (draft.selectedLocationId === currentLocation?.id) {
      return currentLocation;
    }

    return locationResults.find((location) => location.id === draft.selectedLocationId) ?? null;
  }, [currentLocation, draft.selectedLocationId, locationResults]);

  const myMemos = useMemo(
    () =>
      rawMyMemos.map((memo) =>
        mapApiMemoToSpotLogMemo({
          memo,
          currentCoordinate,
          currentUserId: session?.user.id,
          bookmarked: bookmarkedIds.includes(memo.id),
          owner: 'me',
        }),
      ),
    [bookmarkedIds, currentCoordinate, rawMyMemos, session?.user.id],
  );

  const nearbyMemos = useMemo(
    () =>
      rawNearbyMemos.map((memo) =>
        mapApiMemoToSpotLogMemo({
          memo,
          currentCoordinate,
          currentUserId: session?.user.id,
          bookmarked: bookmarkedIds.includes(memo.id),
        }),
      ),
    [bookmarkedIds, currentCoordinate, rawNearbyMemos, session?.user.id],
  );

  const sortedNearbyMemos = useMemo(() => sortMemos(nearbyMemos, 'distance'), [nearbyMemos]);
  const myMemoIds = useMemo(() => new Set(myMemos.map((memo) => memo.id)), [myMemos]);
  const publicMemos = useMemo(
    () => sortedNearbyMemos.filter((memo) => !myMemoIds.has(memo.id)),
    [myMemoIds, sortedNearbyMemos],
  );
  const memos = useMemo(
    () => dedupeMemos([...sortedNearbyMemos, ...myMemos]),
    [myMemos, sortedNearbyMemos],
  );

  const myPrivateMemos = myMemos.filter((memo) => memo.visibility === 'private');
  const myPublicMemos = myMemos.filter(
    (memo) => memo.visibility === 'public' && memo.status !== 'expired',
  );
  const myExpiredMemos = myMemos.filter((memo) => memo.status === 'expired');
  const bookmarkedMemos = useMemo(
    () =>
      sortMemos(
        dedupeMemos(
          [...publicMemos, ...myPublicMemos].filter(
            (memo) => memo.visibility === 'public' && memo.status !== 'expired' && memo.bookmarked,
          ),
        ),
        'distance',
      ),
    [myPublicMemos, publicMemos],
  );

  const selectedMemo =
    memos.find((memo) => memo.id === selectedMemoId) ??
    sortedNearbyMemos[0] ??
    myPublicMemos[0] ??
    myPrivateMemos[0] ??
    null;

  const mapMemo =
    (selectedMemo && selectedMemo.status !== 'expired' ? selectedMemo : null) ??
    sortedNearbyMemos[0] ??
    myPublicMemos[0] ??
    myPrivateMemos[0] ??
    null;

  const memoSheetContext: MemoSheetContext =
    sheetContext === 'bookmark' ? 'bookmark' : activeTab === 'nearby' ? 'nearby' : 'map';
  const sheetSourceMemos =
    memoSheetContext === 'map'
      ? [...publicMemos, ...myMemos.filter((memo) => memo.status !== 'expired')]
      : memoSheetContext === 'nearby'
        ? sortedNearbyMemos
        : bookmarkedMemos;
  const selectedLocationGroup = findLocationGroupByMemoId(sheetSourceMemos, selectedMemoId);
  const memoSheetMemos =
    memoSheetContext === 'bookmark'
      ? selectedMemo
        ? [selectedMemo]
        : []
      : selectedLocationGroup?.memos ?? (selectedMemo ? [selectedMemo] : []);

  const myCounts = {
    private: myPrivateMemos.length,
    public: myPublicMemos.length,
    expired: myExpiredMemos.length,
  };

  const myTabItems = memoTabs.map((tab) => ({
    ...tab,
    label: `${tab.label} ${myCounts[tab.value]}`,
    icon: null,
  }));

  const sortOptions = createMySortOptions(myTab === 'expired' ? 'expired' : myTab);
  const visibleMyMemos = sortMemos(
    myTab === 'private' ? myPrivateMemos : myTab === 'public' ? myPublicMemos : myExpiredMemos,
    memoSort,
  );

  const draftValidationMessage = useMemo(() => {
    if (!session) {
      return '메모 생성은 로그인 후 사용할 수 있습니다.';
    }

    if (draft.content.trim().length === 0) {
      return '본문은 1자 이상 입력해야 저장할 수 있습니다.';
    }

    if (!selectedLocation) {
      return isSearchingLocations
        ? '장소 검색 결과를 기다려주세요.'
        : '현재 위치 또는 장소 검색 결과에서 위치를 선택해야 합니다.';
    }

    if (draft.visibility === 'public' && !getExpiryIso(draft.expiryPreset, draft.customDate)) {
      return '공개 메모는 만료일을 선택해야 합니다.';
    }

    return '';
  }, [draft, isSearchingLocations, selectedLocation, session]);

  function pushToast(title: string, message: string, tone: ToastMessage['tone'] = 'neutral') {
    const nextToast = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title,
      message,
      tone,
    };

    setToasts((current) => [nextToast, ...current].slice(0, 3));
  }

  function logoutAndReset() {
    clearAuthSession();
    setSession(null);
    logoutHandlerRef.current?.();
  }

  useEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id));

    toasts.forEach((toast) => {
      if (toastTimeoutsRef.current[toast.id]) {
        return;
      }

      toastTimeoutsRef.current[toast.id] = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
        delete toastTimeoutsRef.current[toast.id];
      }, 2500);
    });

    Object.entries(toastTimeoutsRef.current).forEach(([id, timeoutId]) => {
      if (activeIds.has(Number(id))) {
        return;
      }

      window.clearTimeout(timeoutId);
      delete toastTimeoutsRef.current[Number(id)];
    });
  }, [toasts]);

  useEffect(() => {
    return () => {
      Object.values(toastTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    if (!currentCoordinate) {
      setCurrentLocationAddress('');
      return;
    }

    const coordinate = {
      lat: currentCoordinate.lat,
      lng: currentCoordinate.lng,
    };

    let cancelled = false;

    async function run() {
      try {
        const { address } = await reverseGeocodeCurrentLocation(coordinate);

        if (!cancelled) {
          setCurrentLocationAddress((current) => (current === address ? current : address));
        }
      } catch {
        if (!cancelled) {
          const fallbackAddress = `${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}`;
          setCurrentLocationAddress((current) =>
            current === fallbackAddress ? current : fallbackAddress,
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentCoordinate]);

  useEffect(() => {
    if (!composeOpen) {
      return;
    }

    if (!currentLocation) {
      return;
    }

    setDraft((currentDraft) => {
      if (currentDraft.selectedLocationId || currentDraft.placeQuery.trim()) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        placeQuery: currentLocation.name,
        selectedLocationId: currentLocation.id,
      };
    });
  }, [composeOpen, currentLocation]);

  useEffect(() => {
    if (!composeOpen) {
      return;
    }

    const query = draft.placeQuery.trim();
    const isDefaultCurrentLocationQuery =
      !!currentLocation &&
      draft.selectedLocationId === currentLocation.id &&
      query === currentLocation.name;

    if (!query || isDefaultCurrentLocationQuery) {
      const nextResults = currentLocation ? [currentLocation] : [];
      setLocationResults(nextResults);
      setLocationSearchMessage(currentLocation ? '' : '장소명을 검색해 위치를 선택하세요.');
      setIsSearchingLocations(false);
      return;
    }

    let cancelled = false;
    const searchTimer = window.setTimeout(async () => {
      setIsSearchingLocations(true);
      setLocationSearchMessage('');

      try {
        const searchedLocations = await searchLocationResults({
          query,
          currentCoordinate,
        });

        if (cancelled) {
          return;
        }

        const nextResults = dedupeLocations(
          currentLocation && matchesCurrentLocationQuery(query, currentLocation)
            ? [currentLocation, ...searchedLocations]
            : searchedLocations,
        );

        setLocationResults(nextResults);
        setLocationSearchMessage(nextResults.length ? '' : '검색 결과가 없습니다.');
        setDraft((currentDraft) => {
          const hasSelectedLocation = nextResults.some(
            (location) => location.id === currentDraft.selectedLocationId,
          );
          const nextSelectedLocationId = hasSelectedLocation
            ? currentDraft.selectedLocationId
            : nextResults[0]?.id ?? '';

          return currentDraft.selectedLocationId === nextSelectedLocationId
            ? currentDraft
            : {
                ...currentDraft,
                selectedLocationId: nextSelectedLocationId,
              };
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const fallbackResults =
          currentLocation && matchesCurrentLocationQuery(query, currentLocation)
            ? [currentLocation]
            : [];

        setLocationResults(fallbackResults);
        setLocationSearchMessage(normalizeErrorMessage(error, '장소 검색에 실패했습니다.'));
        setDraft((currentDraft) => {
          const hasSelectedLocation = fallbackResults.some(
            (location) => location.id === currentDraft.selectedLocationId,
          );
          const nextSelectedLocationId = hasSelectedLocation
            ? currentDraft.selectedLocationId
            : fallbackResults[0]?.id ?? '';

          return currentDraft.selectedLocationId === nextSelectedLocationId
            ? currentDraft
            : {
                ...currentDraft,
                selectedLocationId: nextSelectedLocationId,
              };
        });
      } finally {
        if (!cancelled) {
          setIsSearchingLocations(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(searchTimer);
    };
  }, [composeOpen, currentCoordinate, currentLocation, draft.placeQuery, draft.selectedLocationId]);

  useEffect(() => {
    if (!session?.accessToken) {
      setRawMyMemos((current) => (current.length ? [] : current));
      return;
    }

    const accessToken = session.accessToken;
    const abortController = new AbortController();

    async function run() {
      try {
        const nextMemos = await fetchMyMemos({
          accessToken,
          signal: abortController.signal,
        });

        setRawMyMemos(nextMemos);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          logoutAndReset();
          return;
        }

        setRawMyMemos((current) => (current.length ? [] : current));
        pushToast(
          '내 메모를 불러오지 못했습니다',
          normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
          'danger',
        );
      }
    }

    void run();

    return () => abortController.abort();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!currentCoordinate) {
      setRawNearbyMemos((current) => (current.length ? [] : current));
      return;
    }

    const coordinate = currentCoordinate;
    const abortController = new AbortController();

    async function run() {
      try {
        const nextMemos = await fetchNearbyPublicMemos({
          latitude: coordinate.lat,
          longitude: coordinate.lng,
          radius: 500,
          signal: abortController.signal,
        });

        setRawNearbyMemos(nextMemos);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        setRawNearbyMemos((current) => (current.length ? [] : current));
        pushToast(
          '주변 메모를 불러오지 못했습니다',
          normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
          'danger',
        );
      }
    }

    void run();

    return () => abortController.abort();
  }, [currentCoordinate]);

  useEffect(() => {
    const defaultSelectedMemoId =
      sortedNearbyMemos[0]?.id ?? myPublicMemos[0]?.id ?? myPrivateMemos[0]?.id ?? '';

    if (!memos.length) {
      if (selectedMemoId) {
        setSelectedMemoId('');
      }
      return;
    }

    if (selectedMemoId && memos.some((memo) => memo.id === selectedMemoId)) {
      return;
    }

    if (defaultSelectedMemoId) {
      setSelectedMemoId(defaultSelectedMemoId);
    }
  }, [memos, myPrivateMemos, myPublicMemos, selectedMemoId, sortedNearbyMemos]);

  function requestCurrentLocation(options?: { silent?: boolean }) {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationPermission('denied');

      if (!options?.silent) {
        pushToast('현재 위치를 사용할 수 없습니다', '브라우저가 위치 정보를 지원하지 않습니다.', 'danger');
      }

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentCoordinate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationPermission('granted');

        if (!options?.silent) {
          pushToast(
            '현재 위치를 갱신했습니다',
            '메모 목록과 지도를 최신 위치 기준으로 업데이트했습니다.',
            'success',
          );
        }
      },
      (error) => {
        setLocationPermission(error.code === error.PERMISSION_DENIED ? 'denied' : 'prompt');

        if (!options?.silent) {
          pushToast(
            '현재 위치를 확인하지 못했습니다',
            error.message || '브라우저 위치 권한을 확인해주세요.',
            'danger',
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }

  useEffect(() => {
    requestCurrentLocation({ silent: true });
  }, []);

  async function refreshMyMemos() {
    if (!session?.accessToken) {
      setRawMyMemos((current) => (current.length ? [] : current));
      return [] as ApiMemo[];
    }

    const nextMemos = await fetchMyMemos({
      accessToken: session.accessToken,
    });

    setRawMyMemos(nextMemos);
    return nextMemos;
  }

  async function refreshNearbyMemos() {
    if (!currentCoordinate) {
      setRawNearbyMemos((current) => (current.length ? [] : current));
      return [] as ApiMemo[];
    }

    const nextMemos = await fetchNearbyPublicMemos({
      latitude: currentCoordinate.lat,
      longitude: currentCoordinate.lng,
      radius: 500,
    });

    setRawNearbyMemos(nextMemos);
    return nextMemos;
  }

  function updateDraft<K extends keyof ComposeDraft>(key: K, value: ComposeDraft[K]) {
    if (key === 'placeQuery') {
      setDraft((currentDraft) => ({
        ...currentDraft,
        placeQuery: value as ComposeDraft['placeQuery'],
        selectedLocationId: '',
      }));
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
  }

  function selectLocation(location: LocationResult) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      placeQuery: location.name,
      selectedLocationId: location.id,
    }));
  }

  function openMapMemo(id: string) {
    setSelectedMemoId(id);
    setSheetContext('map');
    setSheetOpen(true);
    navigateTabHandlerRef.current?.('map');
  }

  function openNearbyDetail(id: string) {
    setSelectedMemoId(id);
    setSheetContext('nearby');
    setSheetOpen(true);
    navigateTabHandlerRef.current?.('nearby');
  }

  function openBookmarkDetail(id: string) {
    setSelectedMemoId(id);
    setSheetContext('bookmark');
    setSheetOpen(true);
    navigateTabHandlerRef.current?.('settings');
  }

  function toggleBookmark(memoId: string) {
    const targetMemo = memos.find((memo) => memo.id === memoId);

    setBookmarkedIds((current) =>
      current.includes(memoId) ? current.filter((id) => id !== memoId) : [...current, memoId],
    );

    if (!targetMemo) {
      return;
    }

    pushToast(
      targetMemo.bookmarked ? '북마크를 해제했습니다' : '북마크에 추가했습니다',
      `${targetMemo.title} 상태를 업데이트했습니다.`,
      'success',
    );
  }

  async function handleSaveMemo() {
    if (draftValidationMessage) {
      pushToast('메모를 저장할 수 없습니다', draftValidationMessage, 'danger');
      return;
    }

    if (!session?.accessToken || !selectedLocation) {
      return;
    }

    const previousMyMemoIds = new Set(rawMyMemos.map((memo) => memo.id));
    const title = draft.title.trim() || undefined;
    const body = draft.content.trim();
    const visibility = draft.visibility === 'private' ? 'PRIVATE' : 'PUBLIC';
    const expiresAt =
      draft.visibility === 'public' ? getExpiryIso(draft.expiryPreset, draft.customDate) : undefined;

    try {
      const createdMemo = await createMemo({
        accessToken: session.accessToken,
        body: {
          title,
          body,
          visibility,
          latitude: selectedLocation.coordinate.lat,
          longitude: selectedLocation.coordinate.lng,
          placeName: selectedLocation.name,
          triggerRadius: draft.radius,
          expiresAt,
        },
      });

      const [nextMyMemos] = await Promise.all([refreshMyMemos(), refreshNearbyMemos()]);
      const nextSelectedMemoId =
        createdMemo?.id ??
        nextMyMemos.find(
          (memo) =>
            !previousMyMemoIds.has(memo.id) &&
            memo.body === body &&
            memo.visibility === visibility &&
            memo.latitude === selectedLocation.coordinate.lat &&
            memo.longitude === selectedLocation.coordinate.lng,
        )?.id ??
        nextMyMemos.find((memo) => !previousMyMemoIds.has(memo.id))?.id;

      setComposeOpen(false);
      setDraft(createInitialDraft(currentLocation ?? undefined));
      setLocationResults(currentLocation ? [currentLocation] : []);
      setLocationSearchMessage('');
      setMyTab(visibility === 'PRIVATE' ? 'private' : 'public');
      if (nextSelectedMemoId) {
        setSelectedMemoId(nextSelectedMemoId);
      }
      setSheetContext('map');
      setSheetOpen(true);
      navigateTabHandlerRef.current?.('map');
      pushToast('메모를 저장했습니다', `${selectedLocation.name} 위치에 메모를 만들었습니다.`, 'success');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logoutAndReset();
        return;
      }

      pushToast(
        '메모를 저장하지 못했습니다',
        normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
        'danger',
      );
    }
  }

  async function handleDeleteMemo() {
    if (!deleteMemoId || !session?.accessToken) {
      return;
    }

    const targetMemo = memos.find((memo) => memo.id === deleteMemoId);

    try {
      await deleteMemo({
        accessToken: session.accessToken,
        memoId: deleteMemoId,
      });

      await Promise.all([refreshMyMemos(), refreshNearbyMemos()]);
      setDeleteMemoId(null);
      setSheetOpen(false);

      if (targetMemo) {
        pushToast('메모를 삭제했습니다', `${targetMemo.title} 메모를 제거했습니다.`, 'danger');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logoutAndReset();
        return;
      }

      pushToast(
        '메모를 삭제하지 못했습니다',
        normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
        'danger',
      );
    }
  }

  async function handleRepublishMemo(memoId: string) {
    if (!session?.accessToken) {
      pushToast('로그인이 필요합니다', '만료 메모 재공개는 로그인 후 사용할 수 있습니다.', 'danger');
      return;
    }

    const previousMyMemoIds = new Set(rawMyMemos.map((memo) => memo.id));

    try {
      const republished = await republishMemo({
        accessToken: session.accessToken,
        memoId,
      });

      const [nextMyMemos] = await Promise.all([refreshMyMemos(), refreshNearbyMemos()]);
      const republishedMemoId =
        republished?.id ??
        nextMyMemos.find(
          (memo) =>
            !previousMyMemoIds.has(memo.id) && memo.visibility === 'PUBLIC' && memo.status !== 'EXPIRED',
        )?.id ??
        nextMyMemos.find((memo) => memo.id === memoId && memo.status !== 'EXPIRED')?.id ??
        memoId;

      setMyTab('public');
      setSelectedMemoId(republishedMemoId);
      pushToast('만료 메모를 재공개했습니다', '공개 메모로 다시 생성했습니다.', 'success');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logoutAndReset();
        return;
      }

      pushToast(
        '재공개에 실패했습니다',
        normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
        'danger',
      );
    }
  }

  function handleTogglePrivateAlerts(next: boolean) {
    setPrivateAlerts(next);
    pushToast(
      next ? '개인 메모 알림 ON' : '개인 메모 알림 OFF',
      next ? '개인 메모 접근 알림을 사용합니다.' : '개인 메모 접근 알림을 중지합니다.',
      next ? 'success' : 'neutral',
    );
  }

  async function handleTogglePublicAlerts(next: boolean) {
    if (!next) {
      setPublicAlerts(false);
      pushToast('공개 메모 알림 OFF', '주변 공개 메모 알림을 중지합니다.');
      return;
    }

    requestCurrentLocation({ silent: true });

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('denied');
      setPublicAlerts(false);
      pushToast('공개 메모 알림을 켤 수 없습니다', '브라우저 알림을 지원하지 않습니다.', 'danger');
      return;
    }

    const permission = await window.Notification.requestPermission();
    const nextPermission =
      permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'prompt';
    setNotificationPermission(nextPermission);

    if (nextPermission !== 'granted') {
      setPublicAlerts(false);
      pushToast('공개 메모 알림을 켤 수 없습니다', '브라우저 알림 권한이 필요합니다.', 'danger');
      return;
    }

    setPublicAlerts(true);
    pushToast('공개 메모 알림 ON', '위치와 알림 권한을 확인했습니다.', 'success');
  }

  function handlePreviewOverlay() {
    if (selectedMemo) {
      setOverlayOpen(true);
    }
  }

  function handleDeleteAccountConfirm() {
    setDeleteAccountOpen(false);
    pushToast(
      '계정 삭제는 연결되지 않았습니다',
      '백엔드에 계정 삭제 API가 없어 이 동작은 연결하지 않았습니다.',
      'danger',
    );
  }

  function handleLogout() {
    clearAuthSession();
    setSession(null);
    setSheetOpen(false);
    setComposeOpen(false);
    setOverlayOpen(false);
    setDeleteAccountOpen(false);
    logoutHandlerRef.current?.();
  }

  return {
    session,
    memos,
    activeTab,
    myTab,
    memoSort,
    composeOpen,
    sheetOpen,
    sheetContext,
    selectedMemoId,
    deleteMemoId,
    deleteAccountOpen,
    overlayOpen,
    draft,
    locations: locationResults,
    isSearchingLocations,
    locationSearchMessage,
    privateAlerts,
    publicAlerts,
    locationPermission,
    notificationPermission,
    toasts,
    currentLocation,
    selectedLocation,
    publicMemos,
    nearbyMemos: sortedNearbyMemos,
    myPrivateMemos,
    myPublicMemos,
    myExpiredMemos,
    bookmarkedMemos,
    selectedMemo,
    mapMemo,
    memoSheetContext,
    memoSheetMemos,
    myTabItems,
    navTabs: bottomTabs,
    sortOptions,
    visibleMyMemos,
    draftValidationMessage,
    setMyTab,
    setMemoSort,
    setComposeOpen,
    setSheetOpen,
    setSheetContext,
    setSelectedMemoId,
    setDeleteMemoId,
    setDeleteAccountOpen,
    setOverlayOpen,
    requestCurrentLocation,
    openMapMemo,
    openNearbyDetail,
    openBookmarkDetail,
    updateDraft,
    selectLocation,
    toggleBookmark,
    handleSaveMemo,
    handleDeleteMemo,
    handleRepublishMemo,
    handleTogglePrivateAlerts,
    handleTogglePublicAlerts,
    handlePreviewOverlay,
    handleDeleteAccountConfirm,
    handleLogout,
  };
}
