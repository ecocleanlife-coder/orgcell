# 구현 계획: 가족 달력 & 조상전시관

> 확정일: 2026-03-19

## 파일 변경 목록

| 파일 | 작업 | 완료 |
|------|------|------|
| `database/migrations/002_add_family_calendar.sql` | 신규 | [ ] |
| `database/migrations/003_add_ancestor_hall.sql` | 신규 | [ ] |
| `backend/src/controllers/calendarController.js` | 신규 | [ ] |
| `backend/src/routes/calendarRoutes.js` | 신규 | [ ] |
| `backend/src/controllers/exhibitionController.js` | 수정 (ancestor 필드) | [ ] |
| `backend/server.js` | 수정 (calendar 라우트 등록) | [ ] |
| `frontend/src/components/museum/FamilyCalendar.jsx` | 신규 | [ ] |
| `frontend/src/components/museum/AncestorHallTab.jsx` | 신규 | [ ] |
| `frontend/src/pages/museum/MuseumPage.jsx` | 수정 (탭 추가) | [ ] |
| `frontend/src/pages/museum/FamilyDomainDashboard.jsx` | 수정 (탭 추가) | [ ] |
| `frontend/src/locales/*/translation.json` (5개) | 수정 (신규 키) | [ ] |

## 핵심 결정

- `persons` 테이블 없음 → `person_name VARCHAR` 직접 저장
- exhibitions에 `hall_type` 컬럼 추가로 조상전시관 구현 (별도 테이블 불필요)
- 달력: 외부 라이브러리 없이 CSS Grid 직접 구현
