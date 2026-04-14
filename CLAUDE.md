# CLAUDE.md — Orgcell 프로젝트 참조 가이드

## 문서 구조

* 기술 규칙 전체: ORGCELL\_CODING\_RULES.md (최우선)
* 철학/알고리즘: VISION.md
* 공통 인프라: C:\\IOC\\CLAUDE.md

## \[CRITICAL] 배포 필수 규칙

* Docker 포트: 8081:80 만 사용 (80/443 직접 바인딩 절대 금지)
* nginx stop 금지
* BYOS 원칙: 서버에 사진 잔류 금지
* 배포 전 항상 ORGCELL\_CODING\_RULES.md §27 확인

## 개발 원칙

* 코드 수정 전 해당 §섹션만 읽고 새로 작성
* 기존 코드 참조 금지
* 완료 후 Gemini/안티그래비티 검토 후 배포
* 룰과 다르면 수행 전 Han에게 질문

## DB 변경 원칙

* 새 컬럼/테이블 추가 시 마이그레이션 파일 먼저 생성
* 코드보다 마이그레이션이 항상 먼저
* 배포 전 마이그레이션 실행 확인 필수
* 마이그레이션 없이 새 컬럼 사용 절대 금지

## 팀 신조 (신앙개조 13조 정신)

* 우리는 정직하고 진실하며 순결하고
자비롭고 덕스럽고 선하게 행동한다
* 무엇이든 덕스럽고 사랑스럽고
좋은 평판을 받을 만한 것을 추구한다
* 코드도 이 정신으로: 정직하게 보고하고
모르면 모른다고 하며 룰을 속이지 않는다

---

## \[CRITICAL] 반복 실수 방지 (2026-04-12 추가)

### 작업 전 필수 확인
* 파일 수정 전 반드시 실제 파일 구조 확인 (추정 금지)
* DB 스키마 확인 없이 컬럼명 추정 절대 금지
* 배포 후 GitHub Actions ✅ 확인 → 번들에 실제 반영 확인 → 브라우저 동작 확인 순서 준수

### 프로젝트 구조 (경로 기준)
```
frontend/src/
├── store/authStore.js, treeStore.js
└── pages/Archive/
    ├── ArchivePage.jsx
    ├── hooks/useArchiveData.js
    └── panels/
        ├── archiveApi.js   ← hooks/ 아닌 panels/ 안에 있음
        ├── FamilyPanel.jsx
        ├── MyInfoPanel.jsx
        └── ArchivePanel.jsx
```

### Import 경로 규칙 (panels/ 기준)
```js
from '../../../store/treeStore'  // store → 3단계 위
from '../../../store/authStore'
from './archiveApi'              // archiveApi → 같은 폴더 (panels/)
```

### DB 실제 컬럼 (추정 금지)
* **persons**: `name`(NOT NULL), `first_name`, `last_name`, `gender`('M'/'F'), `bon_gwan`, `father_first_name`, `father_last_name`, `mother_first_name`, `mother_last_name`, `match_status`('ghost'/'linked')
* **family_sites**: `title`(site_name 아님), `status` 기본값 'pending' → INSERT 시 'active' 명시
* **families**: `bon_gwan`, `status`('active')
* **users**: `family_id`, `role`

### 자주 틀리는 로직
* `curatorSites`는 **배열** → `.length` 사용 (`.size` 아님)
* `gender` DB값 `'M'/'F'` ↔ 폼값 `'male'/'female'` 변환 필요
* `persons` INSERT 시 `name` 컬럼(NOT NULL) 반드시 포함
* `family_sites` INSERT 시 `status='active'` 명시
* `birthDate` null일 때 `::date` cast 에러 → `$4::DATE IS NULL` 조건 추가

### 배포 체크리스트
1. `git push` 후 GitHub Actions ✅ 확인
2. `docker exec orgcell-frontend grep -r "수정내용키워드" /usr/share/nginx/html/assets/` 로 번들 반영 확인
3. 브라우저에서 실제 동작 확인

### EC2 접속 정보
* DB: 유저 `orgcell_user` / DB명 `orgcell` / 비번 `orgcell_secure_2026`
* docker-compose 위치: `/opt/orgcell/`
* 프론트: `orgcell-frontend` (8081:80) / 백엔드: `orgcell-backend` (5001)
