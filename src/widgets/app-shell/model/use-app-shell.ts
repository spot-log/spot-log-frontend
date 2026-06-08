import { useEffect, useMemo, useRef, useState } from 'react';
import { apiBaseUrl } from '../../../shared/config';
import {
  buildCurrentLocationResult,
  bottomTabs,
  createInitialDraft,
  createMySortOptions,
  DEFAULT_PUBLIC_EXPIRY_DAYS,
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
  deleteCurrentUser,
  fetchNotificationSettings,
  updateNotificationSettings,
} from '../../../entities/notification/api/notifications';
import {
  ApiError,
  addBookmark,
  createMemo,
  deleteMemo,
  fetchBookmarkedMemos,
  fetchMemo,
  fetchMyMemos,
  fetchNearbyPublicMemos,
  removeBookmark,
  republishMemo,
  updateMemo,
  type ApiMemo,
} from '../../../entities/memo/api/memos';
import {
  reverseGeocodeCurrentLocation,
  searchLocationResults,
} from '../../../entities/memo/lib/location-search';
import { clearAuthSession, readAuthSession, type AuthSession } from '../../../features/google-auth';
import type { ToastMessage } from '../../../shared/ui';
import type {
  NotificationWorkerEvent,
  NotificationWorkerMessage,
  WorkerAlertEntry,
  WorkerNotificationTarget,
} from '../../../shared/workers/notification-worker.types';

type Coordinate = {
  lat: number;
  lng: number;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

type ProximityAlertTarget = WorkerNotificationTarget;

const REPUBLISH_DURATION_DAYS = DEFAULT_PUBLIC_EXPIRY_DAYS;
const ALERT_POLL_INTERVAL_MS = 15000;

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

function buildLocationAwareMyMemoQuery(coordinate?: Coordinate | null) {
  if (!coordinate) {
    return undefined;
  }

  return {
    latitude: coordinate.lat,
    longitude: coordinate.lng,
    sort: 'distance' as const,
  };
}

function formatDateInputFromIso(isoText?: string) {
  if (!isoText) {
    return '';
  }

  const date = new Date(isoText);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildLocationResultFromMemo(memo: SpotLogMemo): LocationResult {
  return {
    id: `memo-location:${memo.id}`,
    name: memo.locationName,
    address: memo.locationName,
    distanceMeters: memo.distanceMeters,
    coordinate: memo.coordinate,
    pin: memo.pin,
  };
}

function buildDraftFromMemo(memo: SpotLogMemo): ComposeDraft {
  const fallbackDraft = createInitialDraft({
    id: `memo-location:${memo.id}`,
    name: memo.locationName,
  });
  const expiresAtDate = formatDateInputFromIso(memo.expiresAtIso);

  return {
    ...fallbackDraft,
    title: memo.title,
    content: memo.content,
    placeQuery: memo.locationName,
    selectedLocationId: `memo-location:${memo.id}`,
    visibility: memo.visibility,
    expiryPreset: memo.visibility === 'public' && expiresAtDate ? 'custom' : '1m',
    customDate: expiresAtDate || fallbackDraft.customDate,
    radius: memo.radius,
  };
}

function resolveTabFromSheetContext(context: MemoSheetContext): SpotLogTab {
  if (context === 'nearby') {
    return 'nearby';
  }

  if (context === 'my') {
    return 'my';
  }

  if (context === 'bookmark') {
    return 'settings';
  }

  return 'map';
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
  const notificationWorkerRef = useRef<Worker | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);

  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [rawMyMemos, setRawMyMemos] = useState<ApiMemo[]>([]);
  const [rawNearbyMemos, setRawNearbyMemos] = useState<ApiMemo[]>([]);
  const [rawBookmarkedMemos, setRawBookmarkedMemos] = useState<ApiMemo[]>([]);
  const [myTab, setMyTab] = useState<'private' | 'public' | 'expired'>('public');
  const [memoSort, setMemoSort] = useState<MemoSort>('recent');
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingReturnContext, setEditingReturnContext] = useState<MemoSheetContext | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetContext, setSheetContext] = useState<MemoSheetContext>('map');
  const [selectedMemoId, setSelectedMemoId] = useState('');
  const [memoDetail, setMemoDetail] = useState<SpotLogMemo | null>(null);
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
  const [currentCoordinate, setCurrentCoordinate] = useState<Coordinate | null>(null);
  const [currentLocationAddress, setCurrentLocationAddress] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<ProximityAlertTarget | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

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

  const activeBookmarkedRawMemos = useMemo(
    () =>
      rawBookmarkedMemos.filter(
        (memo) =>
          memo.visibility === 'PUBLIC' &&
          memo.status !== 'EXPIRED' &&
          memo.authorId !== session?.user.id,
      ),
    [rawBookmarkedMemos, session?.user.id],
  );

  const bookmarkedMemoIds = useMemo(
    () => new Set(activeBookmarkedRawMemos.map((memo) => memo.id)),
    [activeBookmarkedRawMemos],
  );

  const myMemos = useMemo(
    () =>
      rawMyMemos.map((memo) =>
        mapApiMemoToSpotLogMemo({
          memo,
          currentCoordinate,
          currentUserId: session?.user.id,
          bookmarked: bookmarkedMemoIds.has(memo.id),
          owner: 'me',
        }),
      ),
    [bookmarkedMemoIds, currentCoordinate, rawMyMemos, session?.user.id],
  );

  const nearbyMemos = useMemo(
    () =>
      rawNearbyMemos.map((memo) =>
        mapApiMemoToSpotLogMemo({
          memo,
          currentCoordinate,
          currentUserId: session?.user.id,
          bookmarked: bookmarkedMemoIds.has(memo.id),
        }),
      ),
    [bookmarkedMemoIds, currentCoordinate, rawNearbyMemos, session?.user.id],
  );

  const sortedNearbyMemos = useMemo(() => sortMemos(nearbyMemos, 'distance'), [nearbyMemos]);
  const myMemoIds = useMemo(() => new Set(myMemos.map((memo) => memo.id)), [myMemos]);
  const publicMemos = useMemo(
    () => sortedNearbyMemos.filter((memo) => !myMemoIds.has(memo.id)),
    [myMemoIds, sortedNearbyMemos],
  );
  const memos = useMemo(() => dedupeMemos([...sortedNearbyMemos, ...myMemos]), [myMemos, sortedNearbyMemos]);

  const myPrivateMemos = useMemo(
    () => myMemos.filter((memo) => memo.visibility === 'private'),
    [myMemos],
  );
  const myPublicMemos = useMemo(
    () => myMemos.filter((memo) => memo.visibility === 'public' && memo.status !== 'expired'),
    [myMemos],
  );
  const myExpiredMemos = useMemo(
    () => myMemos.filter((memo) => memo.status === 'expired'),
    [myMemos],
  );

  const bookmarkedMemos = useMemo(
    () =>
      sortMemos(
        activeBookmarkedRawMemos.map((memo) =>
          mapApiMemoToSpotLogMemo({
            memo,
            currentCoordinate,
            currentUserId: session?.user.id,
            bookmarked: true,
            owner: 'others',
          }),
        ),
        'distance',
      ),
    [activeBookmarkedRawMemos, currentCoordinate, session?.user.id],
  );

  const knownMemos = useMemo(
    () =>
      dedupeMemos(
        memoDetail && memoDetail.id === selectedMemoId
          ? [memoDetail, ...memos, ...bookmarkedMemos]
          : [...memos, ...bookmarkedMemos],
      ),
    [bookmarkedMemos, memos, memoDetail, selectedMemoId],
  );

  const selectedMemo = useMemo(
    () =>
      (memoDetail && memoDetail.id === selectedMemoId ? memoDetail : null) ??
      knownMemos.find((memo) => memo.id === selectedMemoId) ??
      null,
    [knownMemos, memoDetail, selectedMemoId],
  );

  const mapMemo = useMemo(
    () => (selectedMemo && selectedMemo.status !== 'expired' ? selectedMemo : null),
    [selectedMemo],
  );

  const memoSheetContext: MemoSheetContext = useMemo(() => {
    if (sheetContext === 'bookmark' || sheetContext === 'my' || sheetContext === 'nearby') {
      return sheetContext;
    }

    return 'map';
  }, [sheetContext]);

  const selectedMyMemo = useMemo(
    () =>
      myMemos.find((memo) => memo.id === selectedMemoId) ??
      (memoDetail?.id === selectedMemoId && memoDetail.owner === 'me' ? memoDetail : null) ??
      null,
    [memoDetail, myMemos, selectedMemoId],
  );

  const selectedBookmarkedMemo = useMemo(
    () =>
      bookmarkedMemos.find((memo) => memo.id === selectedMemoId) ??
      (memoDetail?.id === selectedMemoId && memoDetail.owner === 'others' && memoDetail.bookmarked
        ? memoDetail
        : null) ??
      null,
    [bookmarkedMemos, memoDetail, selectedMemoId],
  );

  const sheetSourceMemos = useMemo(() => {
    if (memoSheetContext === 'nearby') {
      return sortedNearbyMemos;
    }

    if (memoSheetContext === 'my') {
      return myMemos;
    }

    if (memoSheetContext === 'bookmark') {
      return bookmarkedMemos;
    }

    return [...publicMemos, ...myMemos.filter((memo) => memo.status !== 'expired')];
  }, [bookmarkedMemos, memoSheetContext, myMemos, publicMemos, sortedNearbyMemos]);

  const selectedLocationGroup = useMemo(
    () => findLocationGroupByMemoId(sheetSourceMemos, selectedMemoId),
    [selectedMemoId, sheetSourceMemos],
  );

  const memoSheetBaseMemos = useMemo(() => {
    if (memoSheetContext === 'bookmark') {
      return selectedBookmarkedMemo ? [selectedBookmarkedMemo] : memoDetail ? [memoDetail] : [];
    }

    if (memoSheetContext === 'my') {
      return selectedMyMemo ? [selectedMyMemo] : memoDetail ? [memoDetail] : [];
    }

    return selectedLocationGroup?.memos ?? (selectedMemo ? [selectedMemo] : []);
  }, [memoDetail, memoSheetContext, selectedBookmarkedMemo, selectedLocationGroup, selectedMemo, selectedMyMemo]);

  const memoSheetMemos = useMemo(() => {
    if (!memoDetail || memoDetail.id !== selectedMemoId) {
      return memoSheetBaseMemos;
    }

    if (!memoSheetBaseMemos.length) {
      return [memoDetail];
    }

    if (!memoSheetBaseMemos.some((memo) => memo.id === memoDetail.id)) {
      return [memoDetail];
    }

    return memoSheetBaseMemos.map((memo) => (memo.id === memoDetail.id ? memoDetail : memo));
  }, [memoDetail, memoSheetBaseMemos, selectedMemoId]);

  const myCounts = useMemo(
    () => ({
      private: myPrivateMemos.length,
      public: myPublicMemos.length,
      expired: myExpiredMemos.length,
    }),
    [myExpiredMemos.length, myPrivateMemos.length, myPublicMemos.length],
  );

  const myTabItems = useMemo(
    () =>
      memoTabs.map((tab) => ({
        ...tab,
        label: `${tab.label} ${myCounts[tab.value]}`,
        icon: null,
      })),
    [myCounts],
  );

  const sortOptions = useMemo(
    () => createMySortOptions(myTab === 'expired' ? 'expired' : myTab),
    [myTab],
  );

  const visibleMyMemos = useMemo(
    () =>
      sortMemos(
        myTab === 'private' ? myPrivateMemos : myTab === 'public' ? myPublicMemos : myExpiredMemos,
        memoSort,
      ),
    [memoSort, myExpiredMemos, myPrivateMemos, myPublicMemos, myTab],
  );

  const composeMode: 'create' | 'edit' = editingMemoId ? 'edit' : 'create';
  const canInstallApp = Boolean(installPromptEvent) && !isAppInstalled;
  const isIosDevice =
    typeof window !== 'undefined' &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isChromiumBrowser =
    typeof window !== 'undefined' &&
    /chrome|chromium|edg/i.test(window.navigator.userAgent) &&
    !/firefox|samsungbrowser/i.test(window.navigator.userAgent);

  const draftValidationMessage = useMemo(() => {
    if (!session) {
      return '메모를 작성하려면 로그인해야 합니다.';
    }

    if (!draft.content.trim()) {
      return '본문은 1자 이상 입력해야 합니다.';
    }

    if (!selectedLocation) {
      return isSearchingLocations
        ? '장소 검색 결과를 기다려주세요.'
        : '현재 위치 또는 검색 결과에서 위치를 선택해야 합니다.';
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

  function applyCurrentCoordinate(
    coordinate: Coordinate,
    options?: {
      silent?: boolean;
    },
  ) {
    setCurrentCoordinate((current) =>
      current && current.lat === coordinate.lat && current.lng === coordinate.lng ? current : coordinate,
    );
    setLocationPermission('granted');

    if (!options?.silent) {
      pushToast('현재 위치를 갱신했습니다', '메모 목록과 지도를 최신 위치 기준으로 업데이트했습니다.', 'success');
    }
  }

  async function handleInstallApp() {
    if (isAppInstalled) {
      pushToast('이미 설치되어 있습니다', '홈 화면이나 앱 목록에서 SpotLog를 열 수 있습니다.');
      return;
    }

    if (installPromptEvent) {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;

      if (choice.outcome === 'accepted') {
        pushToast('앱 설치를 시작했습니다', '브라우저 설치 확인이 끝나면 앱처럼 실행할 수 있습니다.', 'success');
      } else {
        pushToast('앱 설치가 취소되었습니다', '원할 때 설정 화면에서 다시 시도할 수 있습니다.');
      }

      setInstallPromptEvent(null);
      return;
    }

    if (isIosDevice) {
      pushToast(
        'iPhone/iPad 설치 안내',
        'Safari 공유 메뉴에서 "홈 화면에 추가"를 선택하면 설치할 수 있습니다.',
      );
      return;
    }

    pushToast(
      '설치 프롬프트를 아직 띄울 수 없습니다',
      isChromiumBrowser
        ? 'Chrome 또는 Edge에서 localhost/https 환경으로 다시 열고, 페이지를 한 번 새로고침한 뒤 시도해보세요.'
        : '이 브라우저는 자동 설치 프롬프트를 지원하지 않을 수 있습니다. 브라우저 메뉴의 설치 또는 홈 화면 추가를 사용해보세요.',
      'danger',
    );
  }

  function stopNotificationWorker() {
    notificationWorkerRef.current?.postMessage({ type: 'stop' } satisfies NotificationWorkerMessage);
  }

  function resetDraft(nextLocation?: Pick<LocationResult, 'id' | 'name'> | null) {
    setDraft(createInitialDraft(nextLocation ?? undefined));
    setLocationResults(currentLocation ? [currentLocation] : []);
    setIsSearchingLocations(false);
    setLocationSearchMessage(currentLocation ? '' : '장소명 또는 주소를 검색해 위치를 선택하세요.');
  }

  function resetStateAfterLogout() {
    stopNotificationWorker();
    clearAuthSession();
    setSession(null);
    setRawMyMemos([]);
    setRawNearbyMemos([]);
    setRawBookmarkedMemos([]);
    setComposeOpen(false);
    setEditingMemoId(null);
    setEditingReturnContext(null);
    setSheetOpen(false);
    setSelectedMemoId('');
    setMemoDetail(null);
    setDeleteMemoId(null);
    setDeleteAccountOpen(false);
    setOverlayOpen(false);
    setNotificationTarget(null);
    resetDraft(currentLocation ?? undefined);
  }

  function handleLogout() {
    resetStateAfterLogout();
    logoutHandlerRef.current?.();
  }

  function logoutAndReset() {
    handleLogout();
  }

  function openNotificationTarget(target: WorkerNotificationTarget) {
    setNotificationTarget(target);
    setOverlayOpen(false);
    setSelectedMemoId(target.memoId);
    setSheetContext(target.sheetContext);
    setSheetOpen(true);
    navigateTabHandlerRef.current?.(target.tab);
  }

  function triggerProximityAlert(entry: WorkerAlertEntry) {
    setNotificationTarget(entry.target);
    setOverlayOpen(true);

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    setNotificationPermission(resolveNotificationPermission());

    if (window.Notification.permission !== 'granted') {
      return;
    }

    const notification = new window.Notification(entry.target.notificationTitle, {
      body: entry.target.message,
      tag: `spotlog:${entry.key}`,
    });

    notification.onclick = () => {
      window.focus();
      openNotificationTarget(entry.target);
      notification.close();
    };
  }

  async function refreshMyMemos() {
    if (!session?.accessToken) {
      setRawMyMemos([]);
      return [] as ApiMemo[];
    }

    const nextMemos = await fetchMyMemos({
      accessToken: session.accessToken,
      query: buildLocationAwareMyMemoQuery(currentCoordinate),
    });

    setRawMyMemos(nextMemos);
    return nextMemos;
  }

  async function refreshNearbyMemos() {
    if (!currentCoordinate) {
      setRawNearbyMemos([]);
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

  async function refreshBookmarkedMemos() {
    if (!session?.accessToken) {
      setRawBookmarkedMemos([]);
      return [] as ApiMemo[];
    }

    const nextMemos = await fetchBookmarkedMemos({
      accessToken: session.accessToken,
    });

    setRawBookmarkedMemos(nextMemos);
    return nextMemos;
  }

  async function refreshAllMemoCollections() {
    const [nextMyMemos, nextNearbyMemos, nextBookmarkedMemos] = await Promise.all([
      refreshMyMemos(),
      refreshNearbyMemos(),
      refreshBookmarkedMemos(),
    ]);

    return {
      nextMyMemos,
      nextNearbyMemos,
      nextBookmarkedMemos,
    };
  }

  function requestCurrentLocation(options?: { silent?: boolean }) {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationPermission('denied');

      if (!options?.silent) {
        pushToast('위치 정보를 사용할 수 없습니다', '브라우저가 위치 정보를 지원하지 않습니다.', 'danger');
      }

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCurrentCoordinate(
          {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          },
          options,
        );
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
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      },
    );
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

  function openComposeModal() {
    setEditingMemoId(null);
    setEditingReturnContext(null);
    setMemoDetail(null);
    resetDraft(currentLocation ?? undefined);
    setComposeOpen(true);
  }

  function closeComposeModal() {
    const returnContext = editingReturnContext;

    setComposeOpen(false);
    setEditingMemoId(null);
    setEditingReturnContext(null);
    resetDraft(currentLocation ?? undefined);

    if (returnContext && selectedMemoId) {
      setSheetContext(returnContext);
      setSheetOpen(true);
    }
  }

  function openMemoEditor(memo: SpotLogMemo) {
    const memoLocation = buildLocationResultFromMemo(memo);
    const nextLocations = dedupeLocations(
      currentLocation ? [memoLocation, currentLocation] : [memoLocation],
    );

    setEditingMemoId(memo.id);
    setEditingReturnContext(sheetContext);
    setDraft(buildDraftFromMemo(memo));
    setLocationResults(nextLocations);
    setLocationSearchMessage('');
    setIsSearchingLocations(false);
    setComposeOpen(true);
    setSheetOpen(false);
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

  function openMyMemoDetail(id: string) {
    setSelectedMemoId(id);
    setSheetContext('my');
    setSheetOpen(true);
    navigateTabHandlerRef.current?.('my');
  }

  function openBookmarkDetail(id: string) {
    setSelectedMemoId(id);
    setSheetContext('bookmark');
    setSheetOpen(true);
    navigateTabHandlerRef.current?.('settings');
  }

  function handleOpenNotificationDetail() {
    if (notificationTarget) {
      openNotificationTarget(notificationTarget);
      return;
    }

    if (!selectedMemo) {
      return;
    }

    if (selectedMemo.owner === 'me') {
      openMyMemoDetail(selectedMemo.id);
      return;
    }

    openNearbyDetail(selectedMemo.id);
  }

  async function toggleBookmark(memoId: string) {
    if (!session?.accessToken) {
      pushToast('로그인이 필요합니다', '북마크는 로그인 후 사용할 수 있습니다.', 'danger');
      return;
    }

    const isCurrentlyBookmarked = bookmarkedMemoIds.has(memoId);
    const memo = knownMemos.find((item) => item.id === memoId);

    try {
      if (isCurrentlyBookmarked) {
        await removeBookmark({
          accessToken: session.accessToken,
          memoId,
        });
      } else {
        await addBookmark({
          accessToken: session.accessToken,
          memoId,
        });
      }

      await refreshBookmarkedMemos();

      if (isCurrentlyBookmarked && sheetContext === 'bookmark' && selectedMemoId === memoId) {
        setSheetOpen(false);
      }

      pushToast(
        isCurrentlyBookmarked ? '북마크를 해제했습니다' : '북마크에 추가했습니다',
        memo ? `${memo.title} 상태를 업데이트했습니다.` : '북마크 상태를 업데이트했습니다.',
        'success',
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logoutAndReset();
        return;
      }

      pushToast(
        '북마크를 업데이트하지 못했습니다',
        normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
        'danger',
      );
    }
  }

  async function handleSaveMemo() {
    if (draftValidationMessage) {
      pushToast('메모를 저장할 수 없습니다', draftValidationMessage, 'danger');
      return;
    }

    if (!session?.accessToken || !selectedLocation) {
      pushToast('로그인이 필요합니다', '메모를 저장하려면 다시 로그인해주세요.', 'danger');
      return;
    }

    const title = draft.title.trim() || undefined;
    const body = draft.content.trim();
    const visibility = draft.visibility === 'private' ? 'PRIVATE' : 'PUBLIC';
    const expiresAt =
      draft.visibility === 'public' ? getExpiryIso(draft.expiryPreset, draft.customDate) : undefined;
    const location = selectedLocation;

    try {
      if (editingMemoId) {
        const savedMemo = await updateMemo({
          accessToken: session.accessToken,
          memoId: editingMemoId,
          body: {
            title,
            body,
            visibility,
            latitude: location.coordinate.lat,
            longitude: location.coordinate.lng,
            placeName: location.name,
            triggerRadius: draft.radius,
            expiresAt,
          },
        });

        const nextMemoId = savedMemo?.id ?? editingMemoId;
        const returnContext = editingReturnContext ?? 'my';

        await refreshAllMemoCollections();
        setComposeOpen(false);
        setEditingMemoId(null);
        setEditingReturnContext(null);
        setMemoDetail(null);
        resetDraft(currentLocation ?? undefined);
        setMyTab(draft.visibility === 'private' ? 'private' : 'public');
        setSelectedMemoId(nextMemoId);
        setSheetContext(returnContext);
        setSheetOpen(true);
        navigateTabHandlerRef.current?.(resolveTabFromSheetContext(returnContext));
        pushToast('메모를 수정했습니다', `${location.name} 위치의 메모를 업데이트했습니다.`, 'success');
        return;
      }

      const previousMyMemoIds = new Set(rawMyMemos.map((memo) => memo.id));
      const createdMemo = await createMemo({
        accessToken: session.accessToken,
        body: {
          title,
          body,
          visibility,
          latitude: location.coordinate.lat,
          longitude: location.coordinate.lng,
          placeName: location.name,
          triggerRadius: draft.radius,
          expiresAt,
        },
      });

      const { nextMyMemos } = await refreshAllMemoCollections();
      const nextSelectedMemoId =
        createdMemo?.id ??
        nextMyMemos.find(
          (memo) =>
            !previousMyMemoIds.has(memo.id) &&
            memo.body === body &&
            memo.visibility === visibility &&
            memo.latitude === location.coordinate.lat &&
            memo.longitude === location.coordinate.lng,
        )?.id ??
        nextMyMemos.find((memo) => !previousMyMemoIds.has(memo.id))?.id ??
        '';

      const nextContext: MemoSheetContext = activeTab === 'my' ? 'my' : 'map';

      setComposeOpen(false);
      setMemoDetail(null);
      resetDraft(currentLocation ?? undefined);
      setMyTab(draft.visibility === 'private' ? 'private' : 'public');
      if (nextSelectedMemoId) {
        setSelectedMemoId(nextSelectedMemoId);
        setSheetContext(nextContext);
        setSheetOpen(true);
        navigateTabHandlerRef.current?.(resolveTabFromSheetContext(nextContext));
      }

      pushToast('메모를 저장했습니다', `${location.name} 위치에 메모를 만들었습니다.`, 'success');
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

    const targetMemo = knownMemos.find((memo) => memo.id === deleteMemoId) ?? memoDetail;

    try {
      await deleteMemo({
        accessToken: session.accessToken,
        memoId: deleteMemoId,
      });

      await refreshAllMemoCollections();
      setDeleteMemoId(null);
      setMemoDetail(null);

      if (selectedMemoId === deleteMemoId) {
        setSelectedMemoId('');
        setSheetOpen(false);
      }

      pushToast(
        '메모를 삭제했습니다',
        targetMemo ? `${targetMemo.title} 메모를 제거했습니다.` : '메모를 제거했습니다.',
        'danger',
      );
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

    try {
      const republished = await republishMemo({
        accessToken: session.accessToken,
        memoId,
        body: {
          durationDays: REPUBLISH_DURATION_DAYS,
        },
      });

      await refreshAllMemoCollections();
      setMyTab('public');
      setSelectedMemoId(republished?.id ?? memoId);
      setSheetContext('my');
      setSheetOpen(true);
      navigateTabHandlerRef.current?.('my');
      pushToast('만료 메모를 재공개했습니다', '공개 메모로 다시 게시했습니다.', 'success');
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
      next ? '개인 메모 알림을 켰습니다' : '개인 메모 알림을 껐습니다',
      next ? '반경에 다시 진입하면 알림을 표시합니다.' : '개인 메모 진입 알림을 중지합니다.',
      next ? 'success' : 'neutral',
    );
  }

  async function handleTogglePublicAlerts(next: boolean) {
    if (!session?.accessToken) {
      pushToast('로그인이 필요합니다', '공개 메모 알림 설정을 저장하려면 로그인해야 합니다.', 'danger');
      return;
    }

    if (!next) {
      try {
        await updateNotificationSettings({
          accessToken: session.accessToken,
          body: {
            publicMemo: 'OFF',
          },
        });

        setPublicAlerts(false);
        pushToast('공개 메모 알림을 껐습니다', '주변 공개 메모 자동 알림을 중지합니다.');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logoutAndReset();
          return;
        }

        pushToast(
          '알림 설정을 저장하지 못했습니다',
          normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
          'danger',
        );
      }

      return;
    }

    requestCurrentLocation({ silent: true });

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('denied');
      pushToast('브라우저 알림을 지원하지 않습니다', '공개 메모 알림을 사용할 수 없습니다.', 'danger');
      return;
    }

    const permission = await window.Notification.requestPermission();
    const nextPermission =
      permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'prompt';
    setNotificationPermission(nextPermission);

    if (nextPermission !== 'granted') {
      pushToast('알림 권한이 필요합니다', '브라우저 알림 권한을 허용해야 공개 메모 알림을 켤 수 있습니다.', 'danger');
      return;
    }

    try {
      await updateNotificationSettings({
        accessToken: session.accessToken,
        body: {
          publicMemo: 'ON',
        },
      });

      setPublicAlerts(true);
      pushToast('공개 메모 알림을 켰습니다', '주변 공개 메모 진입을 백그라운드에서 확인합니다.', 'success');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logoutAndReset();
        return;
      }

      pushToast(
        '알림 설정을 저장하지 못했습니다',
        normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
        'danger',
      );
    }
  }

  function handlePreviewOverlay() {
    if (notificationTarget || selectedMemo) {
      setOverlayOpen(true);
    }
  }

  async function handleDeleteAccountConfirm() {
    if (!session?.accessToken) {
      setDeleteAccountOpen(false);
      pushToast('로그인이 필요합니다', '계정을 삭제하려면 다시 로그인해주세요.', 'danger');
      return;
    }

    setDeleteAccountOpen(false);

    try {
      await deleteCurrentUser({
        accessToken: session.accessToken,
      });

      handleLogout();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logoutAndReset();
        return;
      }

      pushToast(
        '계정을 삭제하지 못했습니다',
        normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
        'danger',
      );
    }
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
    if (typeof window === 'undefined') {
      return;
    }

    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)');
    const syncInstalledState = () => {
      const isStandalone =
        Boolean(standaloneMedia?.matches) ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

      setIsAppInstalled(isStandalone);
      if (isStandalone) {
        setInstallPromptEvent(null);
      }
    };

    syncInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      syncInstalledState();
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsAppInstalled(true);
      pushToast('앱 설치가 완료되었습니다', '이제 SpotLog를 앱처럼 실행할 수 있습니다.', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneMedia?.addEventListener?.('change', syncInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMedia?.removeEventListener?.('change', syncInstalledState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    const worker = new Worker(
      new URL('../../../shared/workers/notification-worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent<NotificationWorkerEvent>) => {
      if (event.data.type === 'auth-error') {
        logoutAndReset();
        return;
      }

      if (event.data.type === 'entered') {
        event.data.payload.forEach((entry) => triggerProximityAlert(entry));
        return;
      }

      if (event.data.type === 'error') {
        console.error(event.data.payload.message);
      }
    };

    notificationWorkerRef.current = worker;

    return () => {
      worker.terminate();
      notificationWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!notificationWorkerRef.current) {
      return;
    }

    if (!session?.accessToken || !session.user.id || !currentCoordinate || (!privateAlerts && !publicAlerts)) {
      stopNotificationWorker();
      return;
    }

    notificationWorkerRef.current.postMessage({
      type: 'sync',
      payload: {
        apiBaseUrl,
        accessToken: session.accessToken,
        currentUserId: session.user.id,
        coordinate: currentCoordinate,
        privateAlerts,
        publicAlerts,
        intervalMs: ALERT_POLL_INTERVAL_MS,
      },
    } satisfies NotificationWorkerMessage);
  }, [currentCoordinate, privateAlerts, publicAlerts, session?.accessToken, session?.user.id]);

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
          setCurrentLocationAddress((current) => (current === fallbackAddress ? current : fallbackAddress));
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentCoordinate]);

  useEffect(() => {
    if (!composeOpen || editingMemoId || !currentLocation) {
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
  }, [composeOpen, currentLocation, editingMemoId]);

  useEffect(() => {
    if (!composeOpen) {
      return;
    }

    const query = draft.placeQuery.trim();
    const isDefaultCurrentLocationQuery =
      Boolean(currentLocation) &&
      draft.selectedLocationId === currentLocation?.id &&
      query === currentLocation?.name;

    if (!query || isDefaultCurrentLocationQuery) {
      const nextResults = currentLocation ? [currentLocation] : [];
      setLocationResults(nextResults);
      setLocationSearchMessage(currentLocation ? '' : '장소명 또는 주소를 검색해 위치를 선택하세요.');
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
          currentLocation && matchesCurrentLocationQuery(query, currentLocation) ? [currentLocation] : [];

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
      setRawMyMemos([]);
      return;
    }

    const accessToken = session.accessToken;
    const abortController = new AbortController();

    async function run() {
      try {
        const nextMemos = await fetchMyMemos({
          accessToken,
          query: buildLocationAwareMyMemoQuery(currentCoordinate),
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

        setRawMyMemos([]);
        pushToast(
          '내 메모를 불러오지 못했습니다',
          normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
          'danger',
        );
      }
    }

    void run();

    return () => abortController.abort();
  }, [currentCoordinate, session?.accessToken]);

  useEffect(() => {
    if (!currentCoordinate) {
      setRawNearbyMemos([]);
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

        setRawNearbyMemos([]);
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
    if (!session?.accessToken) {
      setRawBookmarkedMemos([]);
      return;
    }

    const accessToken = session.accessToken;
    const abortController = new AbortController();

    async function run() {
      try {
        const nextMemos = await fetchBookmarkedMemos({
          accessToken,
          signal: abortController.signal,
        });

        setRawBookmarkedMemos(nextMemos);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          logoutAndReset();
          return;
        }

        setRawBookmarkedMemos([]);
        pushToast(
          '북마크 목록을 불러오지 못했습니다',
          normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
          'danger',
        );
      }
    }

    void run();

    return () => abortController.abort();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setPublicAlerts(false);
      return;
    }

    const accessToken = session.accessToken;
    const abortController = new AbortController();

    async function run() {
      try {
        const settings = await fetchNotificationSettings({
          accessToken,
          signal: abortController.signal,
        });

        setPublicAlerts(settings.publicMemo === 'ON');
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          logoutAndReset();
          return;
        }

        setPublicAlerts(false);
        pushToast(
          '알림 설정을 불러오지 못했습니다',
          normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
          'danger',
        );
      }
    }

    void run();

    return () => abortController.abort();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!sheetOpen) {
      setMemoDetail(null);
      return;
    }

    if (!selectedMemoId || !session?.accessToken) {
      return;
    }

    const accessToken = session.accessToken;
    const currentUserId = session.user.id;
    const abortController = new AbortController();

    async function run() {
      try {
        const memo = await fetchMemo({
          accessToken,
          memoId: selectedMemoId,
          signal: abortController.signal,
        });

        setMemoDetail(
          mapApiMemoToSpotLogMemo({
            memo,
            currentCoordinate,
            currentUserId,
            bookmarked: bookmarkedMemoIds.has(memo.id),
          }),
        );
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          logoutAndReset();
          return;
        }

        setMemoDetail(null);

        if (error instanceof ApiError && error.status === 404) {
          pushToast('메모를 찾을 수 없습니다', '삭제되었거나 더 이상 볼 수 없는 메모입니다.', 'danger');
          return;
        }

        pushToast(
          '메모 상세를 불러오지 못했습니다',
          normalizeErrorMessage(error, '잠시 후 다시 시도해주세요.'),
          'danger',
        );
      }
    }

    void run();

    return () => abortController.abort();
  }, [bookmarkedMemoIds, currentCoordinate, selectedMemoId, session?.accessToken, session?.user.id, sheetOpen]);

  useEffect(() => {
    const selectedMemoStillExists =
      Boolean(selectedMemoId) &&
      (knownMemos.some((memo) => memo.id === selectedMemoId) || memoDetail?.id === selectedMemoId);

    if (!knownMemos.length && !memoDetail) {
      if (selectedMemoId) {
        setSelectedMemoId('');
      }
      return;
    }

    if (selectedMemoStillExists) {
      return;
    }
  }, [knownMemos, memoDetail, selectedMemoId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        applyCurrentCoordinate(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          { silent: true },
        );
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission('denied');
          return;
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
      },
    );

    return () => {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  return {
    session,
    memos,
    activeTab,
    myTab,
    memoSort,
    composeMode,
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
    notificationTarget,
    toasts,
    canInstallApp,
    isAppInstalled,
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
    openComposeModal,
    closeComposeModal,
    openMemoEditor,
    openMapMemo,
    openNearbyDetail,
    openMyMemoDetail,
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
    handleOpenNotificationDetail,
    handleInstallApp,
    handleDeleteAccountConfirm,
    handleLogout,
  };
}
