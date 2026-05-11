import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DestructiveListItem, ProfileSection, SocialLoginButton } from './components/account';
import { BookmarkListItem, EmptyState, MemoCard, MemoListItem } from './components/cards';
import {
  InAppPopupOverlay,
  PushNotification,
  Toast,
  ToastViewport,
  type ToastMessage,
} from './components/feedback';
import {
  ArrowCounterClockwiseIcon,
  BookmarkIcon,
  GlobeIcon,
  LocateIcon,
  LockIcon,
  MapIcon,
  MinusIcon,
  NearbyIcon,
  NoteStackIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from './components/icons';
import {
  AlertDialog,
  BottomNavigationBar,
  BottomSheet,
  FullScreenModal,
  TabBar,
} from './components/layout';
import { MapPin, MapTooltip, RadiusRing } from './components/map';
import {
  Button,
  CharacterCounter,
  Chip,
  DatePickerField,
  ExpiryProgress,
  Fab,
  IconButton,
  RadioButtonGroup,
  RadiusSelector,
  SegmentedControl,
  StatusLabel,
  TextButton,
  TextInput,
  Textarea,
  ToggleSwitch,
} from './components/primitives';
import { bottomTabs, expiryOptions, memoTabs, myMemos, nearbyMemos, radiusOptions } from './data/demo';
import type {
  BottomTabValue,
  ExpiryPreset,
  InternalTabValue,
  MemoVisibility,
  RadiusValue,
} from './types';

const tokenSwatches = [
  { label: 'Canvas', value: '#F0EDE8', color: '#F0EDE8' },
  { label: 'Surface', value: '#FFFFFF', color: '#FFFFFF' },
  { label: 'Ink', value: '#2B2926', color: '#2B2926' },
  { label: 'Blue', value: '#185FA5', color: '#185FA5' },
  { label: 'Green', value: '#1D9E75', color: '#1D9E75' },
  { label: 'Danger', value: '#C0392B', color: '#C0392B' },
];

function Panel({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="showcase-panel">
      <div className="showcase-panel__header">
        <div>
          <div className="showcase-kicker">{kicker}</div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [title, setTitle] = useState('퇴근길 와인샵 메모');
  const [placeQuery, setPlaceQuery] = useState('서울숲입구');
  const [content, setContent] = useState(
    '주말에는 2층 창가부터 확인. 금요일 저녁에는 사람이 많아서 평일 7시 전에 들르는 편이 낫다.',
  );
  const [visibility, setVisibility] = useState<MemoVisibility>('public');
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('custom');
  const [customDate, setCustomDate] = useState('2026-04-30');
  const [radius, setRadius] = useState<RadiusValue>(100);
  const [privateAlerts, setPrivateAlerts] = useState(true);
  const [publicAlerts, setPublicAlerts] = useState(false);
  const [navTab, setNavTab] = useState<BottomTabValue>('map');
  const [memoTab, setMemoTab] = useState<InternalTabValue>('public');
  const [sheetOpen, setSheetOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(true);
  const [activeMemoId, setActiveMemoId] = useState('public-1');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimeoutsRef = useRef<Record<number, number>>({});

  const previewMemos = [nearbyMemos[0], nearbyMemos[1], myMemos[0]];
  const activeMemo = previewMemos.find((memo) => memo.id === activeMemoId) ?? previewMemos[0];

  const navItems = bottomTabs.map((tab) => ({
    ...tab,
    icon:
      tab.value === 'map' ? (
        <MapIcon size={18} />
      ) : tab.value === 'nearby' ? (
        <NearbyIcon size={18} />
      ) : tab.value === 'my' ? (
        <NoteStackIcon size={18} />
      ) : (
        <SettingsIcon size={18} />
      ),
  }));

  const myMemoTabItems = memoTabs.map((tab) => ({
    ...tab,
    icon: null,
  }));

  useEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id));

    toasts.forEach((toast) => {
      if (toastTimeoutsRef.current[toast.id]) {
        return;
      }

      toastTimeoutsRef.current[toast.id] = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
        delete toastTimeoutsRef.current[toast.id];
      }, 3200);
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
      Object.values(toastTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  function pushToast(titleText: string, message: string, tone: ToastMessage['tone'] = 'neutral') {
    const nextToast = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: titleText,
      message,
      tone,
    };

    setToasts((current) => [nextToast, ...current].slice(0, 3));
  }

  function handlePinSelect(id: string) {
    setActiveMemoId(id);
    setSheetOpen(true);
  }

  function handleBookmarkToggle() {
    const next = !isBookmarked;
    setIsBookmarked(next);
    pushToast(next ? '북마크 저장' : '북마크 해제', next ? '공개 메모를 저장했습니다.' : '저장 목록에서 제거했습니다.', 'success');
  }

  function handleSaveMemo() {
    setModalOpen(false);
    pushToast('저장 완료', '메모 컴포넌트 조합을 저장 상태로 표시했습니다.', 'success');
  }

  function handleDeleteMemo() {
    setAlertOpen(false);
    pushToast('삭제 완료', '삭제 확인 다이얼로그 흐름을 점검했습니다.', 'danger');
  }

  return (
    <div className="page-shell">
      <header className="showcase-header">
        <span className="showcase-header__eyebrow">SpotLog Component Set</span>
        <h1>Location memo UI primitives before screen design.</h1>
        <p>
          `.ai/location_memo_app_ui.html`의 웜 뉴트럴 팔레트, 잉크 톤, 블루/그린 상태색을
          기반으로 토큰을 추출하고 컴포넌트만 먼저 조립한 페이지입니다.
        </p>
      </header>

      <div className="showcase-layout">
        <main className="showcase-main">
          <Panel
            kicker="Tokens"
            title="HTML 프로토타입 기반 디자인 토큰"
            description="페이지 바탕색, 카드 표면, 상태색, 지도 배경을 토큰으로 분리했습니다."
          >
            <div className="showcase-token-list">
              {tokenSwatches.map((token) => (
                <article className="showcase-token" key={token.label}>
                  <div className="showcase-token__swatch" style={{ background: token.color }} />
                  <strong>{token.label}</strong>
                  <span>{token.value}</span>
                </article>
              ))}
            </div>
          </Panel>

          <Panel
            kicker="Inputs"
            title="입력 컴포넌트"
            description="제목, 장소 검색, 본문 입력과 공개 유형/유효기간/반경 선택을 전부 상태 연결해 두었습니다."
          >
            <div className="showcase-stack">
              <div className="showcase-grid-2">
                <TextInput
                  label="제목"
                  placeholder="메모 제목을 입력하세요"
                  value={title}
                  onChange={setTitle}
                />
                <TextInput
                  label="장소 검색"
                  placeholder="장소명 또는 주소 검색"
                  value={placeQuery}
                  onChange={setPlaceQuery}
                  leadingIcon={<SearchIcon size={16} />}
                />
              </div>
              <Textarea
                label="메모 본문"
                helperText="제목을 비워두면 본문 앞부분을 제목으로 사용할 수 있습니다."
                value={content}
                onChange={setContent}
              />
              <SegmentedControl
                label="메모 유형"
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'private', label: '개인', icon: <LockIcon size={14} /> },
                  { value: 'public', label: '공개', icon: <GlobeIcon size={14} /> },
                ]}
              />
              <RadioButtonGroup
                label="유효 기간"
                value={expiryPreset}
                onChange={setExpiryPreset}
                options={expiryOptions}
              />
              {expiryPreset === 'custom' && (
                <DatePickerField
                  label="직접 입력 만료일"
                  value={customDate}
                  min="2026-04-01"
                  onChange={setCustomDate}
                />
              )}
              <div className="showcase-grid-2">
                <RadiusSelector
                  label="알림 반경"
                  value={radius}
                  options={radiusOptions}
                  onChange={(value) => setRadius(value as RadiusValue)}
                />
                <div className="switch-stack">
                  <ToggleSwitch
                    label="개인 메모 알림"
                    description="기본값 ON"
                    checked={privateAlerts}
                    onChange={setPrivateAlerts}
                  />
                  <ToggleSwitch
                    label="공개 메모 알림"
                    description="기본값 OFF"
                    checked={publicAlerts}
                    onChange={setPublicAlerts}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            kicker="Actions"
            title="버튼과 액션"
            description="저장, 취소, 삭제, 지도 조작, 북마크, FAB, 텍스트 액션까지 분리된 상태입니다."
          >
            <div className="showcase-stack">
              <div className="button-row">
                <Button onClick={handleSaveMemo}>저장</Button>
                <Button
                  variant="secondary"
                  leadingIcon={<ArrowCounterClockwiseIcon size={16} />}
                >
                  재공개
                </Button>
                <Button variant="secondary">취소</Button>
                <Button variant="destructive" onClick={() => setAlertOpen(true)}>
                  삭제
                </Button>
              </div>
              <div className="icon-row">
                <IconButton aria-label="지도 확대">
                  <PlusIcon size={18} />
                </IconButton>
                <IconButton aria-label="지도 축소">
                  <MinusIcon size={18} />
                </IconButton>
                <IconButton aria-label="현재 위치">
                  <LocateIcon size={18} />
                </IconButton>
                <IconButton aria-label="북마크">
                  <BookmarkIcon filled size={18} />
                </IconButton>
                <Fab aria-label="메모 작성">
                  <PlusIcon size={22} />
                </Fab>
              </div>
              <div className="showcase-inline">
                <TextButton>변경</TextButton>
                <TextButton>더보기</TextButton>
              </div>
            </div>
          </Panel>

          <Panel
            kicker="Navigation"
            title="탐색과 레이아웃"
            description="탭, 바텀 네비게이션, 바텀시트/풀스크린 모달/삭제 다이얼로그 진입점을 함께 확인할 수 있습니다."
          >
            <div className="showcase-stack">
              <BottomNavigationBar items={navItems} value={navTab} onChange={setNavTab} />
              <TabBar items={myMemoTabItems} value={memoTab} onChange={setMemoTab} />
              <div className="showcase-inline">
                <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                  Bottom Sheet 보기
                </Button>
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                  Full Screen Modal 보기
                </Button>
                <Button variant="destructive" onClick={() => setAlertOpen(true)}>
                  Alert Dialog 보기
                </Button>
              </div>
              <p className="showcase-note">
                지도 핀, 툴팁, Radius Ring, FAB, Bottom Sheet, Full Screen Modal은 우측 device
                preview 안에서도 실제 배치 상태로 확인할 수 있습니다.
              </p>
            </div>
          </Panel>

          <Panel
            kicker="Lists"
            title="목록과 카드"
            description="리스트 아이템, 상세 카드, 북마크 목록, 빈 상태까지 분리했습니다."
          >
            <div className="showcase-stack">
              <div className="list-stack">
                <MemoListItem
                  title={nearbyMemos[0].title}
                  distance={`${nearbyMemos[0].distance} · 도보 2분`}
                  dDay={nearbyMemos[0].dDay}
                  visibility="public"
                  progress={nearbyMemos[0].progress}
                />
                <MemoListItem
                  title={myMemos[0].title}
                  distance="현재 위치 기반 개인 메모"
                  visibility="private"
                  progress={1}
                  extra={<StatusLabel>알림 ON</StatusLabel>}
                />
                <MemoListItem
                  title={myMemos[1].title}
                  distance="만료됨 · 420m"
                  visibility="public"
                  expired
                  progress={0.08}
                />
              </div>
              <div className="showcase-grid-2">
                <MemoCard
                  title={nearbyMemos[0].title}
                  content={nearbyMemos[0].content}
                  createdAt={nearbyMemos[0].createdAt}
                  expiresAt={nearbyMemos[0].expiresAt}
                  visibility="public"
                  dDay={nearbyMemos[0].dDay}
                  progress={nearbyMemos[0].progress}
                  bookmarked={isBookmarked}
                  onBookmarkToggle={handleBookmarkToggle}
                  secondaryActionLabel="닫기"
                  onSecondaryAction={() => setSheetOpen(false)}
                />
                <MemoCard
                  title={myMemos[1].title}
                  content={myMemos[1].content}
                  createdAt={myMemos[1].createdAt}
                  expiresAt={myMemos[1].expiresAt}
                  visibility="public"
                  expired
                  progress={0.08}
                  primaryActionLabel="재공개"
                  secondaryActionLabel="삭제"
                  onPrimaryAction={() => pushToast('재공개 준비', '만료된 메모 재공개 모달 흐름입니다.', 'success')}
                  onSecondaryAction={() => setAlertOpen(true)}
                />
              </div>
              <div className="showcase-grid-2">
                <BookmarkListItem
                  title="조용한 2층 카페"
                  author="준호"
                  distance="310m"
                  expiresAt="2026.04.07까지"
                  bookmarked={isBookmarked}
                  onToggleBookmark={handleBookmarkToggle}
                />
                <EmptyState
                  title="북마크한 메모가 없습니다"
                  description="저장한 공개 메모가 생기면 여기에서 모아서 관리할 수 있습니다."
                  actionLabel="주변 메모 보기"
                  onAction={() => setNavTab('nearby')}
                />
              </div>
            </div>
          </Panel>

          <Panel
            kicker="States"
            title="상태 표시"
            description="Chip, D-day, 만료 라벨, 문자 수, 투명도 기반 유효기간 표시를 한곳에 모았습니다."
          >
            <div className="showcase-stack">
              <div className="showcase-inline">
                <Chip tone="private">개인 메모</Chip>
                <Chip tone="public">공개 메모</Chip>
                <Chip tone="neutral">D-6</Chip>
                <Chip tone="expired">만료됨</Chip>
                <StatusLabel>만료됨</StatusLabel>
                <CharacterCounter current={content.length} max={1000} />
              </div>
              <div className="showcase-grid-2">
                <ExpiryProgress progress={0.72}>
                  <p className="showcase-note">유효기간이 많이 남은 공개 메모는 더 선명하게 보입니다.</p>
                </ExpiryProgress>
                <ExpiryProgress progress={0.18} expired>
                  <p className="showcase-note">만료 직전 또는 만료된 메모는 투명도를 낮춰 상태를 전달합니다.</p>
                </ExpiryProgress>
              </div>
            </div>
          </Panel>

          <Panel
            kicker="Feedback"
            title="알림과 피드백"
            description="시스템 푸시, 앱 내 팝업, 토스트를 모두 확인할 수 있습니다."
          >
            <div className="showcase-stack">
              <div className="showcase-grid-2">
                <PushNotification
                  appName="SpotLog"
                  title="반경 안에 들어왔어요"
                  message="'마트 장보기 목록' 메모를 확인해 보세요."
                  time="방금"
                />
                <Toast title="저장 완료" message="메모가 로컬 상태에 반영되었습니다." tone="success" />
              </div>
              <div className="feedback-actions">
                <Button variant="secondary" onClick={() => setPopupOpen(true)}>
                  In-App Popup 보기
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    pushToast('단순 피드백', '삭제 완료, 저장 완료 같은 토스트용 컴포넌트입니다.', 'neutral')
                  }
                >
                  Toast 쌓기
                </Button>
              </div>
            </div>
          </Panel>

          <Panel
            kicker="Account"
            title="계정 영역"
            description="Google 로그인 버튼, 프로필 정보, 탈퇴 리스트 아이템을 구현했습니다."
          >
            <div className="showcase-stack">
              <SocialLoginButton onClick={() => pushToast('로그인 버튼', 'Google OAuth 진입 버튼 자리입니다.', 'neutral')} />
              <div className="showcase-grid-2">
                <ProfileSection
                  name="유진 김"
                  email="yujin.kim@gmail.com"
                  provider="Google"
                  memoCount={24}
                  bookmarkCount={8}
                />
                <DestructiveListItem
                  title="계정 탈퇴"
                  description="탈퇴 시 본인이 작성한 공개 메모와 개인 메모가 모두 삭제됩니다."
                  onClick={() => setAlertOpen(true)}
                />
              </div>
            </div>
          </Panel>
        </main>

        <aside className="showcase-sidebar">
          <section className="showcase-panel preview-shell">
            <div className="preview-shell__head">
              <div>
                <div className="showcase-kicker">Map Components</div>
                <h2>Device Preview</h2>
                <p>Map Pin, Radius Ring, Tooltip, FAB, Bottom Sheet, Modal을 한 화면에 조합했습니다.</p>
              </div>
              <TextButton onClick={() => setModalOpen(true)}>열기</TextButton>
            </div>

            <div className="device-frame">
              <div className="device-screen">
                <div className="device-status">
                  <span>9:41</span>
                  <span className="device-status__meta">
                    <span>5G</span>
                    <span>100%</span>
                  </span>
                </div>

                <div className="map-stage">
                  <div className="map-stage__backdrop">
                    <div className="map-stage__road-h" style={{ top: '35%', left: 0, right: 0, height: 18 }} />
                    <div className="map-stage__road-h" style={{ top: '60%', left: 0, right: 0, height: 14 }} />
                    <div className="map-stage__road-v" style={{ left: '30%', top: 0, bottom: 0, width: 14 }} />
                    <div className="map-stage__road-v" style={{ left: '65%', top: 0, bottom: 0, width: 10 }} />
                    <div className="map-stage__block" style={{ top: '8%', left: '5%', width: '22%', height: '24%' }} />
                    <div className="map-stage__block" style={{ top: '8%', left: '34%', width: '28%', height: '20%' }} />
                    <div className="map-stage__block" style={{ top: '8%', left: '70%', width: '25%', height: '22%' }} />
                    <div className="map-stage__park" style={{ top: '42%', left: '34%', width: '28%', height: '14%' }} />
                    <div className="map-stage__block" style={{ top: '65%', left: '5%', width: '22%', height: '28%' }} />
                    <div className="map-stage__block" style={{ top: '65%', left: '34%', width: '28%', height: '28%' }} />
                    <div className="map-stage__block" style={{ top: '65%', left: '70%', width: '25%', height: '28%' }} />
                  </div>

                  <RadiusRing size={92} style={{ left: '52%', top: '50%' }} />
                  <MapPin tone="current" style={{ left: '52%', top: '50%' }} aria-label="현재 위치" />
                  <MapPin
                    tone="public"
                    label="건물 뒤 주차장 팁"
                    progress={nearbyMemos[0].progress}
                    active={activeMemoId === nearbyMemos[0].id}
                    style={{ left: '72%', top: '28%' }}
                    onClick={() => handlePinSelect(nearbyMemos[0].id)}
                  />
                  <MapPin
                    tone="public"
                    label="조용한 2층 카페"
                    progress={nearbyMemos[1].progress}
                    active={activeMemoId === nearbyMemos[1].id}
                    style={{ left: '20%', top: '68%' }}
                    onClick={() => handlePinSelect(nearbyMemos[1].id)}
                  />
                  <MapPin
                    tone="private"
                    label="마트 장보기 목록"
                    progress={1}
                    active={activeMemoId === myMemos[0].id}
                    style={{ left: '38%', top: '18%' }}
                    onClick={() => handlePinSelect(myMemos[0].id)}
                  />

                  <div className="map-stage__controls">
                    <IconButton aria-label="지도 확대">
                      <PlusIcon size={18} />
                    </IconButton>
                    <IconButton aria-label="지도 축소">
                      <MinusIcon size={18} />
                    </IconButton>
                    <IconButton aria-label="현재 위치">
                      <LocateIcon size={18} />
                    </IconButton>
                  </div>

                  <div className="map-stage__tooltip">
                    <MapTooltip
                      title={activeMemo.title}
                      subtitle={
                        activeMemo.visibility === 'public'
                          ? `${activeMemo.distance} · ${activeMemo.dDay ?? '공개'}`
                          : '현재 위치 · 개인 메모'
                      }
                    />
                  </div>

                  <Fab
                    aria-label="메모 작성 진입"
                    style={{ position: 'absolute', right: 14, bottom: 14 }}
                    onClick={() => setModalOpen(true)}
                  >
                    <PlusIcon size={22} />
                  </Fab>

                </div>

                <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.84)' }}>
                  <BottomNavigationBar items={navItems} value={navTab} onChange={setNavTab} />
                </div>

                <BottomSheet
                  open={sheetOpen}
                  contained
                  title={activeMemo.title}
                  subtitle={
                    activeMemo.visibility === 'public'
                      ? `${activeMemo.createdAt} · ${activeMemo.distance}`
                      : `${activeMemo.createdAt} · 개인 메모`
                  }
                  onClose={() => setSheetOpen(false)}
                  footer={
                    <div className="button-row">
                      {activeMemo.visibility === 'public' && (
                        <Button variant="secondary" onClick={handleBookmarkToggle} fullWidth>
                          북마크
                        </Button>
                      )}
                      <Button onClick={() => setSheetOpen(false)} fullWidth>
                        닫기
                      </Button>
                    </div>
                  }
                >
                  <div className="showcase-inline">
                    <Chip tone={activeMemo.visibility === 'public' ? 'public' : 'private'}>
                      {activeMemo.visibility === 'public' ? '공개 메모' : '개인 메모'}
                    </Chip>
                    {activeMemo.dDay ? <Chip tone="neutral">{activeMemo.dDay}</Chip> : null}
                  </div>
                  <p className="showcase-note" style={{ marginTop: 0 }}>
                    {activeMemo.content}
                  </p>
                </BottomSheet>

                <FullScreenModal
                  open={modalOpen}
                  contained
                  title="메모 작성"
                  subtitle="컴포넌트 showcase용 작성 모달"
                  onClose={() => setModalOpen(false)}
                  showCloseButton={false}
                  footer={
                    <div className="button-row" style={{ width: '100%' }}>
                      <Button variant="secondary" onClick={() => setModalOpen(false)} fullWidth>
                        취소
                      </Button>
                      <Button onClick={handleSaveMemo} fullWidth>
                        저장
                      </Button>
                    </div>
                  }
                >
                  <TextInput
                    label="제목"
                    value={title}
                    onChange={setTitle}
                    placeholder="메모 제목을 입력하세요"
                  />
                  <Textarea
                    label="본문"
                    value={content}
                    onChange={setContent}
                    maxLength={1000}
                    placeholder="반경 안에서 다시 보고 싶은 내용을 적어두세요."
                  />
                  <SegmentedControl
                    label="메모 유형"
                    value={visibility}
                    onChange={setVisibility}
                    options={[
                      { value: 'private', label: '개인', icon: <LockIcon size={14} /> },
                      { value: 'public', label: '공개', icon: <GlobeIcon size={14} /> },
                    ]}
                  />
                  <RadiusSelector
                    label="알림 반경"
                    value={radius}
                    options={radiusOptions}
                    onChange={(value) => setRadius(value as RadiusValue)}
                  />
                </FullScreenModal>

                <InAppPopupOverlay
                  open={popupOpen}
                  contained
                  title="반경 안에 도착했어요"
                  message="'마트 장보기 목록'을 확인할 시간입니다."
                  actionLabel="메모 열기"
                  onClose={() => setPopupOpen(false)}
                  onAction={() => {
                    setPopupOpen(false);
                    handlePinSelect(myMemos[0].id);
                  }}
                />
              </div>
            </div>
          </section>
        </aside>
      </div>

      <AlertDialog
        open={alertOpen}
        title="메모를 삭제할까요?"
        description="삭제하면 복구할 수 없습니다. 계정 탈퇴 컴포넌트에서도 같은 확인 다이얼로그를 재사용할 수 있습니다."
        cancelLabel="취소"
        confirmLabel="삭제"
        destructive
        onCancel={() => setAlertOpen(false)}
        onConfirm={handleDeleteMemo}
      />

      <ToastViewport toasts={toasts} />
    </div>
  );
}
