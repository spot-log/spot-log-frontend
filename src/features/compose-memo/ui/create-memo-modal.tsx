import {
  Button,
  DatePickerField,
  FullScreenModal,
  GlobeIcon,
  KakaoMapCanvas,
  LockIcon,
  RadioButtonGroup,
  RadiusSelector,
  SearchIcon,
  SegmentedControl,
  TextInput,
  Textarea,
} from '../../../shared/ui';
import { expiryOptions, radiusOptions, type ComposeDraft, type LocationResult } from '../../../entities/memo';

function getTodayDateInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CreateMemoModal({
  open,
  draft,
  validationMessage,
  locations,
  selectedLocation,
  isSearchingLocations,
  locationSearchMessage,
  onClose,
  onSave,
  onChangeDraft,
  onSelectLocation,
}: {
  open: boolean;
  draft: ComposeDraft;
  validationMessage: string;
  locations: LocationResult[];
  selectedLocation: LocationResult | null;
  isSearchingLocations: boolean;
  locationSearchMessage: string;
  onClose: () => void;
  onSave: () => void;
  onChangeDraft: <K extends keyof ComposeDraft>(key: K, value: ComposeDraft[K]) => void;
  onSelectLocation: (location: LocationResult) => void;
}) {
  const minDate = getTodayDateInput();

  return (
    <FullScreenModal
      open={open}
      title="메모 작성"
      subtitle="제목, 본문, 위치, 반경, 공개 여부를 한 번에 정할 수 있습니다."
      onClose={onClose}
      footer={
        <div className="button-row" style={{ width: '100%' }}>
          <Button variant="secondary" fullWidth onClick={onClose}>
            취소
          </Button>
          <Button fullWidth onClick={onSave} disabled={Boolean(validationMessage)}>
            저장
          </Button>
        </div>
      }
    >
      <TextInput
        label="제목"
        helperText="비워두면 본문 앞부분으로 제목이 자동 생성됩니다."
        placeholder="메모 제목을 입력하세요"
        value={draft.title}
        onChange={(value) => onChangeDraft('title', value)}
      />

      <Textarea
        label="본문"
        helperText="1자 이상 1000자 이하로 입력해야 저장할 수 있습니다."
        value={draft.content}
        onChange={(value) => onChangeDraft('content', value)}
        placeholder="이 위치에서 확인해야 할 내용을 적어보세요."
        maxLength={1000}
      />

      <SegmentedControl
        label="메모 유형"
        value={draft.visibility}
        onChange={(value) => onChangeDraft('visibility', value)}
        options={[
          { value: 'private', label: '개인', icon: <LockIcon size={14} /> },
          { value: 'public', label: '공개', icon: <GlobeIcon size={14} /> },
        ]}
      />

      <TextInput
        label="장소 검색"
        helperText="카카오 장소 검색으로 위치를 찾고 좌표까지 함께 저장합니다."
        placeholder="장소명 또는 주소를 검색하세요"
        value={draft.placeQuery}
        onChange={(value) => onChangeDraft('placeQuery', value)}
        leadingIcon={<SearchIcon size={16} />}
      />

      <div className="search-results">
        {isSearchingLocations ? (
          <div className="search-empty">장소를 검색하는 중입니다.</div>
        ) : locations.length ? (
          locations.map((location) => (
            <button
              key={location.id}
              type="button"
              className={`search-result ${draft.selectedLocationId === location.id ? 'is-active' : ''}`}
              onClick={() => onSelectLocation(location)}
            >
              <strong>{location.name}</strong>
              <span>{location.address}</span>
            </button>
          ))
        ) : (
          <div className="search-empty">{locationSearchMessage || '검색 결과가 없습니다.'}</div>
        )}
      </div>

      <div className="location-preview">
        <div className="location-preview__copy">
          <strong>{selectedLocation?.name ?? '위치를 선택하세요'}</strong>
          <span>{selectedLocation?.address ?? '현재 위치를 쓰거나 장소 검색 결과에서 위치를 선택할 수 있습니다.'}</span>
        </div>

        <KakaoMapCanvas
          active={open}
          className="location-preview__map"
          center={selectedLocation?.coordinate ?? undefined}
          markers={
            selectedLocation
              ? [
                  {
                    id: selectedLocation.id,
                    position: selectedLocation.coordinate,
                    tone: selectedLocation.id === 'current-location' ? 'current' : 'public',
                    label: selectedLocation.name,
                    subtitle: selectedLocation.address,
                  },
                ]
              : []
          }
          selectedMarkerId={selectedLocation?.id}
          circle={
            selectedLocation
              ? {
                  center: selectedLocation.coordinate,
                  radius: draft.radius,
                }
              : null
          }
          level={4}
        />
      </div>

      <RadiusSelector
        label="트리거 반경"
        value={draft.radius}
        options={radiusOptions}
        onChange={(value) => onChangeDraft('radius', value as ComposeDraft['radius'])}
      />

      {draft.visibility === 'public' ? (
        <>
          <RadioButtonGroup
            label="공개 기간"
            value={draft.expiryPreset}
            onChange={(value) => onChangeDraft('expiryPreset', value)}
            options={expiryOptions}
          />
          {draft.expiryPreset === 'custom' ? (
            <DatePickerField
              label="만료일 직접 입력"
              value={draft.customDate}
              min={minDate}
              onChange={(value) => onChangeDraft('customDate', value)}
            />
          ) : null}
        </>
      ) : null}

      {validationMessage ? <p className="form-error">{validationMessage}</p> : null}
    </FullScreenModal>
  );
}
