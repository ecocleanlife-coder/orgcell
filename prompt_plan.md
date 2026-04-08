# 가족 트리 [Visual + List] 하이브리드 아키텍처

> 확정: 2026-04-07 | 상태: **완료**

## 구현 완료 내역

### Phase 1: GenealogyList.jsx 신규 생성 ✅
- `frontend/src/components/museum/GenealogyList.jsx`
- 세대별 그룹핑 (Y좌표: 뿌리/부모/우리/자녀/손자녀)
- z=1 방계 → 수장고(🗄), position:fixed 오버레이

### Phase 2: FamilyTreeView.jsx 수정 ✅
- `showList` 토글 + ≡ 버튼 (좌측 상단)
- Hard Reset Wormhole 전 경로 통일

### Phase 3: 데이터 정합성 검수 ✅
- 배우자 부모 X=+300, 외조부모 z=1, Rule 6 ✓
- 0.5s 순차 등장 + navKey Hard Reset ✓

---

## 이전 계획: d3.js 가족트리 완전 재구현

> 확정: 2026-04-02 | 상태: **완료 (buildTree.js 기반으로 전환)**

## 목표
- family-chart 라이브러리 완전 제거
- d3.js 기반 커스텀 가족트리
- familyChartAdapter.js 제거 → buildTree.js 대체
- LOD (Level of Detail) 세대별 가시성

## LOD 규칙
| 나 기준 거리 | 레벨 | opacity |
|-------------|-------|---------|
| ±2세대 | clear | 1.0 |
| ±3~4세대 | dim | 0.4 |
| ±5세대+ | fog | 0.15 |
흐릿/안개 클릭 시 펼쳐짐

## Phase 1: buildTree.js (데이터 변환) ← 진행중
- [ ] persons + relations → 트리 노드/링크 데이터
- [ ] LOD 레벨 계산
- [ ] 레이아웃 좌표 (x, y)
- [ ] 단위 테스트 통과

## Phase 2: FolderCard.jsx (카드 하나)
- [ ] 기존 폴더 카드 디자인 React 컴포넌트화
- [ ] 성별 색상, 사진, 이름, 생몰년
- [ ] 화면 확인 후 승인

## Phase 3: CoupleBlock.jsx (부부 단위)
- [ ] 부부 카드 나란히 배치
- [ ] 화면 확인 후 승인

## Phase 4: 연결선 + LOD
- [ ] 부모→자녀 실선, 부부 수평선
- [ ] 배우자 부모 점선
- [ ] LOD opacity 적용
- [ ] 화면 확인 후 승인

## Phase 5: 모달 통합
- [ ] member, addFirst, edit, parents, slideshow, bio
- [ ] 카드 클릭/편집 인터랙션
- [ ] 화면 확인 후 승인

## Phase 6: family-chart 제거
- [ ] import 교체 (MuseumPage, FamilyDomainDashboard, FamilyWebsiteView)
- [ ] FamilyTreeView.jsx 삭제
- [ ] familyChartAdapter.js 삭제
- [ ] npm uninstall family-chart
- [ ] 최종 확인 후 승인

## 의존성
Phase 1 → 2 → 3 → 4 → 5 → 6 (순차, 각 단계 승인 후 진행)

## 신규 파일
- `frontend/src/utils/buildTree.js` — 데이터 변환 + 레이아웃
- `frontend/src/components/museum/FamilyTreeD3.jsx` — 메인 컴포넌트
- `frontend/src/components/museum/FolderCard.jsx` — 카드 컴포넌트
- `frontend/src/components/museum/CoupleBlock.jsx` — 부부 단위

## 유지 파일
- 모든 모달 컴포넌트 (PersonDetailModal 등)
- personController.js, relationController.js (변경 없음)

---

## 이전 계획

### Orgcell 결함 수정 + 핵심 기능 고도화 — 실행 완료
> 확정: 2026-03-31 | 상태: **완료**
