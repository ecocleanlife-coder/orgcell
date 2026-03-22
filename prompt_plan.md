# 패밀리트리 시작 UI 개선 계획

> 확정일: 2026-03-22

## Phase 1: 빈 트리 기본 템플릿
- root === null일 때 점선 플레이스홀더 3세대 구조 표시
- 각 플레이스홀더 클릭 시 인물 추가 모달 오픈

## Phase 2: 인물 추가/수정/삭제 모달 (API 연동)
- handleMemberSubmit → POST /api/persons/:siteId
- 수정 모달: PUT /api/persons/:siteId/:personId
- 삭제: DELETE /api/persons/:siteId/:personId

## Phase 3: 인물 카드 개선
- 이니셜 표시, 생년월일, privacy_level 뱃지, hover 편집 버튼

## Phase 4: 권한 구분
- owner: 전체, member: 본인만, viewer: 읽기만

## 수정 파일
1. frontend/src/components/museum/FamilyTreeView.jsx
2. frontend/src/i18n/translations.js
3. backend/src/controllers/personController.js

## 이전 계획

### 가족 달력 & 조상전시관 (2026-03-19) — 완료
