ORGCELL_CODING_RULES.md 파일을 아래 내용으로 완전히 교체해서 저장해.

[중요: 상충 해결 원칙] > 이 문서의 내용은 다른 모든 문서(CLAUDE.md, rules/*.md 등)보다 우선한다. 만약 다른 문서와 이 문서의 내용이 충돌할 경우, 무조건 이 문서의 규칙을 따르고, 충돌 사실을 사용자에게 보고하라.

# Orgcell 가족유산박물관 — 코딩 표준 규칙서

**작성일:** 2026-04-09
**버전:** v4.0
**원칙:** 본 문서의 설계 원칙은 모든 코드 구현의 최우선 순위임.

---

## 1. 서비스 정체성
- 한국어: **가족유산박물관**
- 영어: **Family Heritage Museum**
- 태그라인: "FamilySearch가 죽은 자의 도서관이라면, Orgcell은 산 자의 박물관입니다."
- "디지털" 단어 사용 금지

---

## 2. 상향 배치 및 수평 균형 원칙
모든 부모 노드의 기본 X 좌표는 자녀들 전체 집단의 산술적 중앙값 수직 위로 설정한다.

카드 겹침 방지 최소 간격:
- 모든 노드 간 MIN_GAP = 20px
- 편부/편모: 단독 부모 X좌표 = 자녀들 중앙
- 재혼/부모 3명 이상: 순서대로 좌→우 배치, MIN_GAP 유지

---

## 3. 부모의 배치
형제가 없는 특수 상황 시:
- 남편 부모 그룹 중심: X = -300 강제
- 아내 부모 그룹 중심: X = +300 강제
- 편부/편모(단독 부모): X좌표 = 자녀들 중앙 (MIN_GAP 포함)
- 재혼/부모 3명 이상: 좌→우 순서 배치, 노드 간 MIN_GAP = 20px 유지

---

## 4. 카드 표시
- 카드 전체를 사진으로 채움 (object-fit: cover)
- 이름만 하단 그라데이션 오버레이로 표시
- 생년/ID/대표정보 표시 안 함
- 호버 시 "OOO 박물관" 툴팁만
- 호버 메뉴 없음

---

## 5. 블록 입체감

**모든 블록:**
.folder-card {
  border: 1px solid #C4A882;
  background: #FAFAF5;
  border-right: 2px solid #b09060;
  border-bottom: 2px solid #9a7a50;
  box-shadow: 2px 2px 0 #c4a87a;
}

**관장 부부:**
.folder-card.curator {
  border: 2px solid #8B7355;
  background: #FDF8F0;
  border-right: 4px solid #9a7a50;
  border-bottom: 4px solid #7a6040;
  box-shadow: 3px 3px 0 #c4a87a, 6px 6px 0 #b09060;
}

---

## 6. 클릭 동작
- 타인 카드 싱글클릭 → "OOO님의 박물관으로 이동하시겠습니까?" 확인 모달
- 확인 시 페이드아웃 후 "OOO님의 박물관으로 이동합니다..." 표시
- 본인 카드 싱글클릭 → 무반응
- 본인 카드 더블클릭 → /{subdomain}/archive (자료실 전체 화면)
- 타인 카드 더블클릭 (관장만) → 해당 인물 정보 수정 모달 (트리 위 오버레이)
- 타인 카드 더블클릭 (비관장) → 무반응

**이동 후 처리:**
데이터 없는 ghost → 임시 부/모 노드 생성.
실명 등록 즉시 가상 노드 파기, 실제 데이터 기반 배치.
🏠 버튼 → 원래 박물관으로 복귀.

---

## 7. ID 체계
- 형식: 국가코드-5자리 (예: KR-A3K7B)
- 국가코드: 한국어→KR, 영어→접속 IP 기준
- 혼동 방지: O/0, I/1, L 제외
- 사용 문자: 2-9, A-H, J-N, P-Z
- 부모/자녀 생성 시 부모 국가코드 상속
- 카드에 이름 아래 ID 표시

---

## 8. 자료실 — 기술 결정사항

자료실(ArchivePanel)은 7개 섹션 + 유틸 3개로 구성된다.

### §8-A 사진자료실

- 메뉴 라벨: `사진자료실` / 공개 시: `사진전시관`
- 지원 형식: jpg / png / heic / gif / webp
- 폴더 기반 (photo_folders), 사진별 theme_tag, is_representative
- 무료 200장 상한, 초과 시 BYOS(§19) 또는 유료(§18) 유도

**API: `/api/photo-folders`**
- GET /:siteId — 폴더+사진 목록
- POST /:siteId — 폴더 생성
- PATCH /:siteId/:folderId — 이름 변경 / 순서
- DELETE /:siteId/:folderId — 폴더+사진 삭제

**DB:**
- `photo_folders` (id, site_id, person_id, name, sort_order)
- `archive_photos` (id, site_id, folder_id, url, mime_type, file_size, theme_tag, is_representative, memo, uploaded_by)

---

### §8-B 주요자료실

- 메뉴 라벨: `주요자료실` / 공개 시: `자료전시관`
- 지원 형식: jpg / png / heic / pdf / doc / docx / hwp(다운로드 전용)
- 폴더 기반 (document_folders), 항목별 is_public

**API: `/api/document-folders`**
- GET /:siteId — 폴더+자료 목록
- GET /:siteId/usage — 용량 (bytes)

**DB:**
- `document_folders` (id, site_id, person_id, name, sort_order)
- `documents` (id, site_id, person_id, folder_id, title, file_url, file_type, file_size, memo, is_representative, is_public)

---

### §8-C 주요약력

- 메뉴 라벨: `주요약력` / 공개 시: `약력전시관`
- 파일 없음, 텍스트 항목(연도+내용+보조설명), 항목별 is_public

**API: `/api/career`**
- GET/POST /:siteId, PUT /:siteId/reorder, PUT/DELETE /:siteId/:itemId

**DB:**
- `career_items` (id, site_id, person_id, year SMALLINT, content VARCHAR(300), description TEXT, sort_order, is_public)

---

### §8-D 자서전

- 메뉴 라벨: `자서전` / 공개 시: `자서전전시관`
- TipTap 에디터, 30초 자동저장, 챕터별 is_public
- 파일 업로드: txt/doc/docx → 텍스트 추출 후 챕터 자동생성, pdf → pdf-parse, hwp → 다운로드 전용

**API: `/api/autobiography`**
- GET/POST /:siteId/chapters, PUT /:siteId/chapters/reorder, PUT/DELETE /:siteId/chapters/:id
- POST /:siteId/upload (50MB 한도)

**DB:**
- `autobiography_chapters` (id, site_id, person_id, title, content TEXT, sort_order, is_public)
- `autobiography_files` (id, site_id, person_id, file_url, file_type, file_name, is_extracted)

---

### §8-E 작품실

- 메뉴 라벨: `작품실` / 공개 시: `작품전시관`
- 지원 형식: jpg / png / heic (썸네일) / pdf (다운로드) / mp4 (다운로드, v1 스트리밍 미지원)
- 항목 필드: title(필수) / year_created(선택) / description(선택) / is_public
- 용량: 주요자료실+작품실 합산 1GB (무료)

**API: `/api/artwork-folders`**
- 폴더 CRUD + GET /:siteId/usage + 작품 CRUD /:siteId/:folderId/artworks

**DB:**
- `artwork_folders` (id, site_id, person_id NOT NULL, name, sort_order)
- `artworks` (id, site_id, person_id, folder_id, title NOT NULL, file_url, filename, file_type, file_size, year_created SMALLINT, description, is_representative, is_public)

---

### §8-F 음성·동영상

- 메뉴 라벨: `음성·동영상` / 공개 시: `음성·영상전시관`
- 지원 형식: mp3 / m4a / wav / mp4 / mov (브라우저 내장 재생)
- 차단: avi (업로드 시 "AVI는 지원하지 않습니다. MP4로 변환 후 업로드해주세요." 토스트)
- 브라우저 직접 녹음: webm 캡처 → ffmpeg(fluent-ffmpeg) mp3 변환 저장
  - ffmpeg 미설치 시: webm 그대로 저장 (graceful degradation)
  - Docker: `apk add ffmpeg`
- 항목 필드: title(필수) / date(선택, DATE) / memo(선택, TEXT)
- 파일 크기 상한: 500MB

**API: `/api/media`**
- GET    /:siteId          — 목록
- POST   /:siteId/upload   — 파일 업로드 (protect)
- POST   /:siteId/record   — 브라우저 녹음 저장 (protect, webm→mp3 변환)
- PATCH  /:siteId/:id      — title/date/memo 수정 (protect)
- DELETE /:siteId/:id      — 삭제 (protect)

**DB (voice_recordings 테이블 재사용):**
- `voice_recordings` (id, site_id, person_id, title VARCHAR(255) NOT NULL, file_url TEXT, media_type VARCHAR(20), file_size BIGINT, duration_sec INT, recorded_date DATE, memo TEXT, is_public, created_at)

---

### §8-G 공유앨범

- 메뉴 라벨: `공유앨범` / publicLabel: null (전시관 메뉴 미노출)
- 지원 형식: jpg / jpeg / png / heic (20MB 상한)
- 업로드 권한: 로그인 필수 (링크 경유 시 비로그인 가능)
- 삭제 권한: 업로더 본인 또는 관장
- **중복 감지**: dhash(9×8 resize → grayscale → adjacent diff) + hamming distance ≤ 5 = 중복
  - 중복 시 409 응답 + `code: 'DUPLICATE'`, 파일 즉시 삭제
  - 프론트: "이미 같은 사진이 있습니다." 토스트
- **관장 설정**: 공개범위(public/family/link), 다운로드 허용, 공유링크 생성/무효화
- **공유링크**: `crypto.randomBytes(24).toString('hex')` → `/shared-album/:token` 경유 비로그인 접근

**API: `/api/shared-album`**
- GET    /link/:token              — optionalAuth, 토큰으로 앨범 접근
- POST   /link/:token/photos       — optionalAuth, 비로그인 업로드
- GET    /:siteId                  — optionalAuth, 앨범+사진 목록 (auto-create)
- POST   /:siteId/photos           — protect, 사진 업로드
- DELETE /:siteId/photos/:id       — protect, 삭제 (본인/관장)
- PATCH  /:siteId/settings         — protect, 관장 전용
- POST   /:siteId/share-link       — protect, 관장 전용
- DELETE /:siteId/share-link       — protect, 관장 전용

**라우트 등록 순서**: `/link/:token` 라우트를 `/:siteId` 앞에 등록 (Express 충돌 방지)

**DB:**
- `shared_albums` (id, site_id UNIQUE, visibility TEXT DEFAULT 'family', allow_download BOOLEAN DEFAULT true, share_token TEXT UNIQUE, created_at)
- `shared_album_photos` (id, album_id, uploader_id, uploader_name, file_url, dhash TEXT, uploaded_at)

**업로드 미들웨어**: `uploadSharedAlbum.js` — multer diskStorage, dest: `uploads/shared-albums/`, jpg/png/heic 전용, 20MB 상한

---

## 9. 관계 탭 동작 규칙
- 탭 선택 시 해당 인물 기존 데이터 자동 로드
- 등록된 인물 → [수정][제거] 활성화, [생성] 비활성화
- 미등록 인물 → [생성] 활성화, [수정][제거] 비활성화
- [제거]: "정말 관계를 해제하시겠습니까?" 확인 후 person_relations 삭제

---

## 10. 공개 → 전시관 자동 생성
- 공개 체크된 자료 → 박물관 상단 메뉴에 전시관 자동 추가
- 공개 자료 없는 전시관 → 메뉴 미노출

---

## 11. 공유앨범
- 로그인 없이 사진 업로드 + 다운로드 가능
- 체크박스 → 선택 다운로드
- 중복 사진 자동 감지 + 제거
- 생성 즉시 박물관 상단 메뉴에 노출
- 공개범위: 전체공개 / 가족만 / 링크만

---

## 12. 상단 메뉴 스타일
- 자판기 버튼 스타일 (둥근 모서리, 입체감, 누르면 2px 내려감)
- 기존 메뉴: 금색 톤 (#FDF8F0 배경, #C4A882 테두리)
- 공유앨범: 푸른 톤 (#F0F5FD 배경, #8BA5C4 테두리), 📷 아이콘
- 메뉴 많아지면 다음 줄로 자연스럽게 넘어감

---

## 13. 조상전시관
- 각 사람이 본인 박물관에 추가 가능
- 자료는 조상 자료실에 먼저 기록 (원본)
- 원하는 것 선택하여 본인 조상전시관에 전시
- 상속인 비공개 시 다른 사람 전시관에서도 자동 내려감

---

## 14. 권한 체계
- 관장 → 모든 인물 자료실 접근 가능
- 관장이 등록한 인물 → 당사자 계정 생성 전까지 관장 전체 권한
- 당사자 계정 생성 후 → 당사자가 주인
- 외부인 클릭 → AccessDeniedModal → 관장에게 요청

---

## 15. 디지털 유산 승계
- 망자 박물관 관장 권한은 유언 또는 법적 상속인이 승계
- 공개 권한도 상속인이 가짐
- 상속인이 자료 추가/수정/삭제 가능

---

## 16. 접근 권한 (입장권 기반)
입장권 없는 사람은 박물관 내부를 볼 수 없다.
문패(박물관 이름)만 공개.
Legacy Pass (가족): Linked 시 자동 발급, 평생 유효.
Visitor Pass (손님): 관장이 유효기간 설정.
미입장자: [입장권 요청하기] → 관장 승인 후 발급.

**백엔드 강제 검증 (CRITICAL):**
입장권 검증은 API 미들웨어에서 수행.
프론트엔드 숨김만으로 불충분.
모든 /api/* 엔드포인트에서 subdomain별 권한 검증 필수.
비인가 요청 → 401/403 반환.

---

## 17. 초대 시스템
- 이메일 / SMS / 링크 복사
- 수락/거절 → 노출 선택 (이름 전체 / 성만 / 익명)
- 거절자 → RefusedPersonBox

---

## 18. 기부 시스템
- $1 기본, 금액 직접 입력 가능
- 이름 선택 입력 (미입력 시 익명)
- Stripe 연동
- 기부자 정보는 관리자에게만 노출
- 관장 자료실에서 기부 내역 확인 가능

---

## 19. 데이터 원칙
- person_relations 테이블 기반 재귀 계산
- family-chart 라이브러리 사용 금지
- BYOS (Bring Your Own Storage) 원칙
- relation_type: parent, spouse, sibling, birth-parent
- 인물 생성 시 uploads/{subdomain}/{ops_path}/ 폴더 자동 생성
- 프로필 사진: profile.jpg 로 저장
- person_relations INSERT 시 persons.parent1_id/parent2_id/spouse_id 동기 업데이트
- person_relations UNIQUE 제약: (person1_id, person2_id, relation_type)
- 트리 레이아웃: GET /api/tree/{subdomain}
  백엔드가 §22/§23/§24 계산 후 x,y 좌표 + 연결선 반환
  프론트엔드는 렌더링만 담당

---

## 20. 저작권
- 모든 콘텐츠 무단 복제/배포 금지
- footer 경고 상시 표시
- 이용약관 포함

---

## 21. 검색 기능
- 이름/ID 검색 지원 (한글/영문)
- PUBLIC 정보만 검색 가능
- 거절자(RefusedPersonBox) 검색 제외

---

## 22. 가족나무 표시 범위 (v3.7)

### z=0 (화면 표시)
배우자는 실존하는 경우에만 표시.
1. 관장 본인 + 배우자
2. 관장의 자녀 + 배우자 + 자손 증손주까지 (3대 이후 Opacity 0.3)
3. 관장의 형제 + 배우자
4. 관장 배우자의 형제 + 배우자
5. 관장의 부모
6. 관장 배우자의 부모

### z=1 (수장고 보관, 화면 표시 금지)
위 목록 외 모든 인물. 데이터 유지, 타인 트리에서만 활성화.

[철칙] z=1 인물은 어떠한 경우에도 Canvas에 렌더링 금지.
트리 빌드 마지막 단계에서 z=1 인물 전수 조사 후 즉시 제거.

상향식 직계 배치:
- 부모: 자녀들 중간 위 배치
- 부계 방계: 부(父) 바로 좌측 수평 배치
- 모계 방계: 모(母) 바로 우측 수평 배치

---

## 23. 배치 및 선연결 룰

부모→자녀 연결선:
- 부부 박스 아래 중간에서 수직선
- 수직선이 자녀들 수평 연결선 중간에 닿음

여러 자녀 (직계에만 적용):
- 형제간 수평선 연결
- 수평선 중간에서 위로 수직선 → 부모 박스
- 자녀 순서: 생년월일 오름차순 좌→우

자녀에 배우자 생기면:
- 남좌여우 배치, 부부 박스로 묶임

배우자 부모 연결선 (CRITICAL):
- 부부 박스 중앙이 아닌 해당 배우자 카드 개인 중앙에서 선 올라감

형제 배치:
- 남편 형제 → 남편 왼쪽 260px씩
- 아내 형제 → 아내 오른쪽 260px씩

화면 중앙 배치:
- 초기/복귀: 관장 부부 박스 중심 = 화면 가로 정중앙
- 타 박물관 방문: 해당 관장 부부 박스 중심 = 화면 가로 정중앙

---

## 24. UI & Layout 수치

### 24-1. 부부 노드 규격
- CoupleBlock 너비: 440px 강제
- 카드 간격: 8px
- 부부박스 내부 패딩: 8px
- 사진 패딩 없음 (전체 채움)
- CARD_HEIGHT: 220px (140px 폐기)
- 부부 박스 배경: #F9F7F2, 카드 개별 테두리 금지

### 24-2. X축 좌표
- 관장 부부: X = 0
- 관장 부모: 형제 중심 배치, 형제 없으면 X = -300
- 배우자 부모: 형제 중심 배치, 형제 없으면 X = +300

### 24-3. 렌더링 제외
z=1 인물은 스토어에만 보관, 화면 렌더링 금지.

### 24-4. 애니메이션
- 순차 등장: §22 순서대로, delay 0.3s 간격
- 중심 인물 변경 시 이전 캐시 완전 삭제, navKey로 리마운트 강제

### 24-5. 네비게이션 히스토리 (MuseumBreadcrumb)

**treeStore 상태:**
- `navHistory: { subdomain, displayName }[]` — 웜홀 방문 경로 스택, 최대 10개
- `displayName: string|null` — 현재 박물관 표시명 (MuseumPage 로드 시 `setDisplayName()`)

**treeStore 액션:**
- `navigateTo(subdomain)`: 이동 전 현재 subdomain+displayName을 navHistory에 push 후 fetchTree
- `navigateBack(subdomain)`: 해당 subdomain의 인덱스까지 slice → fetchTree
- `resetHistory()`: navHistory 초기화 (🏠 클릭 시)
- `setDisplayName(name)`: 현재 박물관 표시명 저장

**MuseumBreadcrumb** (`frontend/src/components/MuseumBreadcrumb.jsx`):
- Props: `currentLabel` (현재 위치, 클릭 불가), `backItem?` ({ label, subdomain }, ArchivePage용)
- 데스크톱: navHistory ≤2개 → 전체 표시 / ≥3개 → 🏠 ← ... ← 최근 2개
- 모바일 (<600px): 🏠 + 직전 1개만
- MuseumPage: `<MuseumBreadcrumb currentLabel={museumName} />` (navHistory 없으면 컴포넌트 미표시)
- ArchivePage: `<MuseumBreadcrumb currentLabel="현재 자료실" backItem={{ label: museumDisplayName, subdomain }} />`

---

## 25. 전시 기준 안내
- 첫 방문 시 전시 기준 안내 모달 자동 표시 (1회)
- [?] 버튼으로 언제든 재확인 가능
- z=1 인물 생성 시 "본인 박물관에서 표시되지 않습니다" 안내

### 25-1. 코드 동기화 원칙 (CRITICAL)

배포 전 필수 검증:
```
node scripts/verify_api_routes.js
```
- MISSING 0 확인 후에만 배포 허용
- 프론트엔드 API 호출 경로 ↔ 백엔드 라우트 불일치 0건이어야 함
- MISSING 1건 이상 시 배포 차단, 즉시 수정 후 재검증

---

## 26. OPS (Orgcell Path System)

### 26-1. Path 규칙 (관계 코드)

**번호 부여 원칙: 실제 출생순서 무관, 생성(등록) 순서 기준으로 1번부터 부여**

| 관계 | 코드 | 예시 |
|------|------|------|
| 아버지 | f | — |
| 어머니 | m | — |
| 아들 | s + 번호 | s1, s2, s3 |
| 딸 | d + 번호 | d1, d2, d3 |
| 배우자(아내) | w | — (아내는 자기 아버지 박물관의 d{n}에 저장) |
| 배우자(남편) | h | — (남편은 자기 아버지 박물관의 s{n}에 저장) |
| 형제 | b + 번호 | b1, b2 |
| 자매 | si + 번호 | si1, si2 |

**번호 부여 방법:**
```sql
-- 새 자녀(아들) 추가 시
SELECT COALESCE(MAX(CAST(SUBSTRING(ops_path FROM 2) AS INT)), 0) + 1
FROM persons WHERE site_id = $siteId AND ops_path ~ '^s[0-9]+$'
-- 결과값이 새 번호
```

재귀 확장 예: LEE006-1/s1/s1 (이한봉의 첫째아들의 첫째아들)

### 26-1-1. Subdomain 자동배정 규칙
성씨+본관 기반 자동 배정. 사용자 직접 입력 없음.
한국인: 성씨영문 + 본관번호 + 순번 (LEE006-1)
본관 미확정: 성씨영문 + 순번 (LEE-1)
외국인: 성대문자 + 순번 (LAMBERT-1)
본관 미확정 → 확정 시 subdomain + 하위 경로 전체 자동 변환.
본관 DB: korean_surnames 테이블 기준 (최초 1회 구축, 고정).
DB 미등록 본관: 순차 번호 부여.
중국 등 본관제도 있는 나라: 동일 기준 적용.

### 26-2. Path는 alias, 실체는 person_id
- 실제 데이터는 person_id에 귀속
- Path는 영구 유지되는 별칭
- 동일 person_id를 여러 path가 가리킬 수 있음
- 가입 전: ghost 상태
- 가입 후: path 유지 + person_id 연결

### 26-3. 자동 통합 정책 (선점 원칙)
먼저 생성된 person_id가 canonical.

매칭 우선순위:
1. [최강] 부모 2명 모두 일치 → 이름 달라도 자동 통합
2. [강력] 형제 2명 이상 일치 → 자동 통합
3. [일반] 이름 + 생년월일 + 보조 1개 이상 → 자동 통합
4. [보류] 이름 + 생년월일만 일치 → 동명이인 가능성

통합 즉시 실행. 양측 관장 알림. 이의 시 분리 요청 가능.

자동 통합 발생 시 처리 절차:
- 양측 관장에게 즉시 알림 (인앱 알림 + 이메일)
- 7일 이내 분리 요청 가능
- 분리 요청 UI: 자료실 알림함에서 [잘못된 통합 신고] 버튼
- 신고 후 관리자 검토 → 분리 처리

### 26-4. 보안 원칙
- Ghost: 관장 박물관 내부에만 존재, 외부 노출 금지
- Ghost만 자동 통합 허용
- 계정 보유자: pending → 본인 승인 후 Linked
- Linked 후 관장의 해당 인물 수정 권한 박탈
- 공인 계정: ghost 등록 및 초대 차단 옵션

### 26-5. 출입증 시스템
- Legacy Pass: Linked 시 자동 발급, 평생 유효, 복제 불가
- Visitor Pass: 유효기간 설정, QR코드, 관장이 무효화 가능
- 미입장자: 문패만 노출, [입장권 요청하기] 버튼
- 초대카드: QR코드 포함, 카카오/문자/SNS 전송

---

## 27. 이름 입력 규칙
- 성(姓)/이름 분리 저장 필수
- 여성: 결혼 전 성씨 기준
- 영문 여권명 선택 저장
- 온보딩: 성/이름/본관 입력. 본관 모르면 "나중에 입력" 체크

---

## 28. 자녀 생성 규칙
- 자녀는 부(父) person_id 기준 생성
- 모(母)에 배우자 존재 시 자녀 생성 버튼 미노출
- 재혼: 이전 남편 등록(실명 또는 임시) 후 자녀 생성 가능
- 미혼모: 임시 배우자 hidden 자동 생성 (화면 미표시)
- 배우자 등록 시 양가 부모 ghost 카드 자동 생성

---

## 29. 혈족 우선 원칙
- 친부모 디폴트. 사용자 요청 시 양부모로 전환
- 두 경로 모두 DB 보존
- 이혼: c 연결 해제, 자녀는 친부 트리 기본 표시
- 사망: 카드 유지, 생존기간 표시 (예: 1930~2005)
- 쌍둥이: 동일 생년월일 형제로 처리
- 동성결혼: 부 기준 자녀 생성 예외 처리

---

## 30. 결혼 연결코드 (c) 및 이혼/재혼 이력

### 30-1. 결혼 연결코드
- 결혼 시 양측 persons에 spouse_oc_id 상호 저장
- 형식: 상대방 oc_id + "C"
- 예: 이상훈(KR-ABC123) ↔ 신세라(KR-XYZ789):
  이상훈.spouse_oc_id = "KR-XYZ789C"
  신세라.spouse_oc_id = "KR-ABC123C"
- C = 웜홀 키. 클릭 시 상대 박물관으로 이동
- 배우자가 박물관 없어도 웜홀 활성 — 클릭 시 /person/:dbId 가상 박물관 페이지로 이동 (박물관 개설 전까지 임시 URL 사용)

### 30-2. 이혼 처리
- 이혼 시 spouse_oc_id 끝에 "X" 추가
- 예: "KR-XYZ789C" → "KR-XYZ789CX"
- person_relations.status = 'divorced'
- 이혼 이력은 DB에 영구 보존 (삭제 금지)
- 가족 관리 탭에 [이혼] 탭 추가 → 이혼 이력 표시

### 30-3. 재혼 처리
- 동일인과 재혼: 기존 spouse_oc_id + "C" 추가
  예: "KR-XYZ789CX" → "KR-XYZ789CXC"
- 다른 사람과 재혼: 새 배우자 oc_id + "C" 로 신규 저장
- person_relations.status = 'active' (신규 관계)

### 30-4. 배우자 등록 시 자동 생성 (부계 중심 원칙)

**배우자 본인은 자기 아버지 박물관의 d{n} 또는 s{n}에 귀속**

배우자 아버지 박물관 없으면:
1. 배우자 성씨 영문(여권 기준, 직접 입력)으로 subdomain 자동 생성
   예: 신세라 → 아버지 성 "Shin" 입력 → Shin-1 박물관(ghost) 자동 생성
2. 신세라 → Shin-1/d1/ 저장 (Shin-1에서 첫 번째 등록 딸)
3. 신세라 어머니 → Shin-1/m/ 저장 (ghost)
4. Shin-1 폴더 구조 자동 생성:
   uploads/Shin-1/
     d1/   ← 신세라
     m/    ← 신세라 어머니(ghost)

배우자 아버지 박물관 있으면:
- 웜홀 연결, 별도 폴더 생성 불필요
- 배우자 데이터는 해당 박물관 경로 사용

나중에 아버지(Shin-1)가 가입하면:
- ghost → linked 전환
- 데이터 그대로 인계, 경로 유지

---

## 31. 박물관 초기화면 레이아웃

### 헤더 (고정, 모든 화면 공통)
- 좌: Orgcell 로고
- 중: OOO 가족유산박물관 (크게)
- 우: 언어선택 + 로그아웃
- 전시관 진입 시: 좌측에 ← 돌아가기 추가

### 헤더 박물관명 표시 규칙
- 한글/아시안 이름 (3자 이하): 전체 이름
  예: 이한봉 가족유산박물관
- 영어권 이름 (긴 이름): FirstName 첫자 + LastName
  예: J. Lambert 가족유산박물관
- 판단 기준: 이름이 한글/한자 포함 시 전체 표시,
  영문만이고 전체 길이 10자 초과 시 축약

### 메뉴 버튼줄 (§12 자판기 스타일)
- 관장이 자료실에서 공개한 전시관만 표시
- 여러 줄 가능
- 클릭 시 → 전체화면으로 해당 전시관 표시

### 슬라이드 배너
- 화면 높이 1/4~1/3
- 자동 큐레이션 (최근사진/여행/행사/조상사진 골고루)
- 자동 전환 3~5초 (디폴트)
- 사진 위에 이름/날짜/설명 오버레이
- 클릭 시 해당 전시관으로 이동
- 관장 허락 시 다운로드 버튼
- [⚙️ Setting] 버튼 (관장만):
  전시 내용 선택 (전시관별 포함/제외)
  전환 시간 조정
  디스플레이 방식 (페이드/슬라이드/줌) 저장

### 전시관 (전체화면)
- 메뉴 버튼 클릭 시 전체화면 전환
- 헤더 항상 표시 (← 돌아가기 + 로그아웃)
- 관장 허락 시 콘텐츠 다운로드 가능

### 가족트리
- 슬라이드 배너 아래 배치
- §22/§23/§24 룰 적용

### 미입장자
- 문패(박물관 이름)만 표시
- [입장권 요청하기] 버튼

저장 완료 후 보고.

---

## 32. 가족행사 달력

- §31 메뉴 "가족행사일정" 클릭 시 전체화면
- 가족 전체 공유
- 가족 구성원 누구나 일정 등록 가능

표시 방식:
- 당일 행사: 해당 날짜에 색상 점 + 실명 + 행사명
  예: "이상훈 - 생일"
- 여러 날 행사: 시작~종료 가로줄
  줄 중간에 실명 + 행사명
  예: "이상훈 - 하와이 가족여행"
- 숙박 일정: 체크인 날 오후 절반부터 시작
  체크아웃 날 오전 절반에서 끝
  줄 중간에 실명 + 숙소명
  예: "임윤님 - 하와이 힐튼"
- 같은 날짜에 여러 행사 있으면 아래로 순서대로 쌓임
- 달력 셀 높이 내용에 따라 자동 확장
- 전체 달력 위아래 스크롤 가능
---

## 33. 배우자/이혼 DB 구조

### persons 테이블 추가 컬럼
- spouse_oc_id VARCHAR(50): 배우자 연결코드
  - 미혼: NULL
  - 기혼: "{상대방 oc_id}C"
  - 이혼: "{상대방 oc_id}CX"
  - 재혼(동일인): "{상대방 oc_id}CXC"
  - 재혼(다른사람): "{새배우자 oc_id}C"

### person_relations 테이블 추가 컬럼
- status VARCHAR(20) DEFAULT 'active'
  - 'active': 현재 관계
  - 'divorced': 이혼
  - 'remarried': 재혼(동일인)

### ops_path 완전 규칙

**핵심 원칙: 부계 중심. 자녀는 반드시 아버지 박물관에 귀속. 번호는 생성 순서.**

| 관계 | 성별 | ops_path | 비고 |
|------|------|----------|------|
| 부(父) | M | f | 번호 없음 |
| 모(母) | F | m | 번호 없음 |
| 아들 | M | s{n} | n=생성순서 1부터 |
| 딸 | F | d{n} | n=생성순서 1부터 |
| 남편 | M | h | 본인 아버지 박물관의 s{n}이 원본 |
| 아내 | F | w | 본인 아버지 박물관의 d{n}이 원본 |
| 형제 | M | b{n} | n=생성순서 |
| 자매 | F | si{n} | n=생성순서 |
| 배우자 부(父) | M | {배우자박물관}/f | ghost 박물관 자동 생성 |
| 배우자 모(母) | F | {배우자박물관}/m | ghost 박물관 자동 생성 |

**번호 중복 방지:**
```
새 아들 등록 시: MAX(s{n}) + 1
새 딸 등록 시: MAX(d{n}) + 1
같은 번호 절대 불가
```
