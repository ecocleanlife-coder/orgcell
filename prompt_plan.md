# 가족트리 DB 구조 재설계 — 관계 테이블 통합

> 확정: 2026-04-01 | 상태: **Phase 1 진행중**

## 배경
persons 테이블에 parent1_id, parent2_id, spouse_id 컬럼과 person_relations 테이블이 이중 관리되어 버그 반복 발생.

## 목표 구조
- persons: 순수 인물 정보만 (관계 컬럼 제거)
- person_relations: 모든 관계의 단일 소스 (parent, spouse, ex_spouse, adopted, step_parent, sibling, half_sibling)

## Phase 1: EC2 DB 백업 + 현재 데이터 스냅샷 ← 진행중
- [ ] EC2 PostgreSQL 전체 백업 (pg_dump)
- [ ] persons 관계 컬럼 사용 현황 확인
- [ ] person_relations 현황 확인
- [ ] 백업 파일 로컬 다운로드

## Phase 2: 마이그레이션 SQL 작성 (실행 안 함)
- [ ] person_relations에 is_active, start_date, end_date 컬럼 추가 SQL
- [ ] persons 관계 데이터 → person_relations 복사 SQL
- [ ] 롤백 SQL
- [ ] 파일: database/migrations/030_relationship_consolidation.sql

## Phase 3: 백엔드 API 수정
- [ ] personController.js — parent/spouse 로직을 person_relations 기반으로 변경
- [ ] relationController.js — is_active/date 지원 추가
- [ ] API 응답 형태 최대한 유지 (프론트엔드 호환)

## Phase 4: 프론트엔드 어댑터 수정 ← 완료
- [x] familyChartAdapter.js — person_relations만으로 트리 구성 (persons 컬럼 폴백 포함)
- [x] FamilyTreeView.jsx — spouse 양방향 호출 제거 (백엔드 동기화 위임)

## Phase 5: persons 컬럼 제거 (별도 승인)
- [ ] 1주일 안정성 확인 후
- [ ] parent1_id, parent2_id, spouse_id DROP

## 의존성
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (순차)

---

## 이전 계획

### Orgcell 결함 수정 + 핵심 기능 고도화 — 실행 완료
> 확정: 2026-03-31 | 상태: **완료**
