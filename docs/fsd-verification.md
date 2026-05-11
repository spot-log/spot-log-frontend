# FSD Verification

작성일: 2026-04-13

## 최종 레이어

- `app`
- `pages`
- `widgets`
- `features`
- `entities`
- `shared`

## 현재 구조 요약

```text
src/
  app/
  entities/
    memo/
  features/
    compose-memo/
    google-auth/
  pages/
    login/
    google-callback/
    map/
    nearby/
    my-memos/
    settings/
  shared/
    config/
    lib/
    ui/
  widgets/
    app-shell/
    map-view/
    nearby-memo-feed/
    my-memos-panel/
    settings-panel/
    memo-sheet/
```

## 제거한 레거시 경로

- `src/components/*`
- `src/features/spotlog/*`
- `src/features/auth/*`
- `src/styles/*`
- `src/data/demo.ts`
- `src/types.ts`

## 검증 결과

### 1. 타입 검증

- `tsc --noEmit` 통과

### 2. export 규칙

- `default export` 없음
- public API용 `index.ts`를 각 slice 루트에 추가함

### 3. import 방향

- `app`은 `pages`와 `widgets`만 사용
- `pages`는 `widgets`, `features`, `shared`만 사용
- `widgets`는 `features`, `entities`, `shared`만 사용
- `shared`는 상위 레이어를 참조하지 않음

### 4. 네이밍 규칙

- 새로 만든 파일명은 kebab-case
- export는 named export만 사용

## 남긴 실무적 판단

- 도메인 크기가 작아서 `entities/memo`에 memo 관련 타입, mock, 계산 로직을 함께 두었다.
- 공용 UI는 `shared/ui`로 통합했고, 페이지 전용 조립 로직은 `widgets`로 올렸다.
- 기존 UI 클래스명과 화면 흐름은 유지했다.
