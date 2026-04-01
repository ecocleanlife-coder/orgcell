# Orgcell 결함 수정 + 핵심 기능 고도화 — 실행 완료

> 확정: 2026-03-31 | 상태: **완료**

## Phase 1: 긴급 결함 수정 ✅

### 1-A. Exhibition Not Found (`/gallery/new`) 수정
- MuseumPage "새 전시관 만들기" → UploadModal 열기로 변경 (navigate 제거)
- 수정: `MuseumPage.jsx`

### 1-B. 내 보관함 활성화
- UploadModal에 `initialDest` prop 추가 → private로 바로 진입
- MuseumPage에 "내 보관함" 바로가기 버튼 추가 (owner만)
- 수정: `UploadModal.jsx`, `MuseumPage.jsx`

## Phase 2: 주소 체계 전환 ✅

### Subdomain → Subfolder URL
- `${subdomain}.orgcell.com` → `orgcell.com/${subdomain}` 전면 전환
- 와일드카드 DNS 미설정 확인 → nginx 리다이렉트 불필요
- 수정: siteController.js (3곳), emailService.js (1곳), eventController.js (1곳)
- 수정: FamilyDomainDashboard (4곳), InviteFamilyPage, InvitePage, FamilyWebsiteView (3곳)
- 수정: PricingTable, ServiceSelectPage, FamilyWebsitePage
- 수정: 5개 언어 locale JSON (ko/en/es/ja/zh-CN)

## Phase 3: 지능형 사진 업로드 ✅

### 3-A. SHA-256 해시 중복 제거
- `crypto.subtle.digest('SHA-256')` 브라우저 네이티브 API 사용
- 동일 파일 자동 제외 + "N장 중복 제외" 안내 표시
- 수정: `UploadModal.jsx`

### 3-B. 사진 찾기 가이드
- "사진이 어디 있는지 모르겠어요" 버튼 추가
- Windows/Mac/iPhone/Android/Google Drive 경로 안내 모달
- 수정: `UploadModal.jsx`

## Phase 4: FamilySearch 동적 프리뷰 — 기존 완료 (스킵)
## Phase 5: Visibility 훅 통일 — 기존 완료 (스킵)

## 검증 결과
- `vite build`: 성공 (0 errors)
- `playwright_evaluator --scenario all`: 4/4 PASS (landing, onboarding, api, museum)

---

## 이전 계획

### 랜딩페이지 전면 재구성 — 가족박물관 피벗
> 확정: 2026-03-31
