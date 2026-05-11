# Feature-Sliced Design Research

작성일: 2026-04-13

## 조사 기준

- 공식 사이트: https://feature-sliced.design/
- 공식 Overview: https://feature-sliced.design/docs/get-started/overview
- 공식 Layers: https://feature-sliced.design/docs/reference/layers
- 공식 Slices and Segments: https://feature-sliced.design/docs/reference/slices-segments
- 공식 Public API: https://feature-sliced.design/docs/reference/public-api

## 핵심 원칙 요약

### 1. 레이어는 고정된 의미를 가진다

FSD는 보통 아래 레이어를 사용한다.

- `app`: 라우팅, 엔트리, 글로벌 스타일, provider
- `pages`: 라우터에 직접 연결되는 화면
- `widgets`: 화면 안에서 의미 있는 큰 UI 블록
- `features`: 사용자에게 가치를 주는 동작 단위
- `entities`: 비즈니스 엔티티
- `shared`: 앱 전반에서 재사용되는 기반 코드

공식 문서에서 `processes`는 deprecated로 취급된다.

### 2. import 방향은 위에서 아래로만 간다

- 상위 레이어는 하위 레이어를 import 할 수 있다.
- 같은 레이어의 다른 slice를 직접 참조하면 안 된다.
- `app`과 `shared`는 slice 없이 segment로 바로 나뉜다.

이 규칙은 의존성 역전을 명확하게 해서, 변경 영향 범위를 줄이는 목적이다.

### 3. slice는 비즈니스 의미로 자른다

- `components`, `hooks`, `types` 같은 기술 분류는 slice 이름으로 부적절하다.
- slice 이름은 제품/도메인 의미를 드러내야 한다.
- 예: `memo`, `auth`, `map-view`, `compose-memo`

### 4. segment는 기술 목적을 설명해야 한다

권장 segment 예시는 아래와 같다.

- `ui`
- `model`
- `api`
- `lib`
- `config`

현재 프로젝트처럼 `components`, `hooks`, `data` 중심 분류는 FSD 기준에서는 중간 단계이거나 레거시 구조에 가깝다.

### 5. public API를 강제해야 한다

- 각 slice는 외부에서 접근할 진입점을 상위에 둬야 한다.
- 외부 모듈은 slice 내부 파일 구조를 직접 import 하지 않고, public API만 통과해야 한다.

실무적으로는 보통 slice 루트의 `index.ts`가 public API 역할을 한다.

### 6. 점진적 도입이 권장된다

공식 Overview 문서는 기존 프로젝트 마이그레이션 시 아래 순서를 권장한다.

1. `app`, `shared`를 먼저 정리한다.
2. 기존 UI를 `pages`, `widgets`로 넓게 재배치한다.
3. 이후 import 위반을 줄이면서 `entities`, `features`를 추출한다.

이번 리팩터링도 이 순서를 따른다.

## 이 프로젝트에 적용할 실무 기준

### 유지할 것

- 기존 UI 결과물
- 기존 동작 흐름
- React Router 구조

### 바꿀 것

- `src/components` 중심 구조를 `shared/ui`, `widgets/*/ui` 등으로 분해
- `src/features/spotlog` 내부의 `components/hooks/data`를 `features`, `entities`, `widgets`로 재배치
- `src/types.ts`의 범용 타입과 도메인 타입을 각각 적절한 slice로 이동
- `default export` 제거
- public API용 `index.ts` 추가

### 제거 대상 후보

- 사용되지 않는 중복 mock/data 파일
- page 전용인데 `components/*-page`에 들어간 파일
- 새 FSD 구조로 흡수된 레거시 폴더

## 리팩터링 체크리스트

- `app / pages / widgets / features / entities / shared` 레이어가 실제로 존재하는가
- `pages`가 화면 조립만 담당하고, 큰 UI 블록은 `widgets`에 있는가
- 사용자 액션 단위가 `features`로 분리되었는가
- 도메인 타입/로직이 `entities`에 모였는가
- 범용 UI와 유틸이 `shared`로 내려갔는가
- 외부 import가 slice 내부 파일을 직접 찌르지 않고 public API를 통과하는가
- `default export`가 남아 있지 않은가
- 파일명이 kebab-case인가
