CLAUDE.md (v3.4) - Orgcell 전용 실행 가이드
⚠️ 주의: 모든 개발은 ORGCELL_CODING_RULES.md의 Heritage Card 표준 및 260px 그리드 원칙을 준수한다.
비전/로드맵은 VISION.md를 참조하되, 기술적 충돌 시 ORGCELL_CODING_RULES.md가 우선함.
공통 인프라 규칙은 C:\IOC\CLAUDE.md를 참조할 것.

1. 프로젝트 개요 및 환경항목설정 값도메인orgcell.com용도AI 사진 정리(얼굴 인식), 실시간 공유, Google Drive BYOS 박물관배포 포트8081 (Docker Compose) + 호스트 nginx (Ohio EC2)데이터베이스PostgreSQL 16상태운영 중 (Production)

2. 기술 스택Frontend: React + Vite + TypeScript / Tailwind CSS 3Backend: Node.js (Express) / Socket.IO 4 (Friend Call relay)AI: face-api.js (얼굴 인식), WASM 모듈Map: Leaflet + react-leaflet (사진 위치 클러스터링)Auth/Storage: Google OAuth 2.0 / Google Drive API (BYOS 원칙)Payment: Stripe

3. 폴더 구조PlaintextC:\IOC\orgcell\
  ├── frontend/src/        # React + Vite + TypeScript 소스
  ├── backend/             # Express API (controllers, routes, services)
  ├── database/            # PostgreSQL 스키마 및 마이그레이션
  ├── wasm_modules/        # 얼굴 인식용 WebAssembly 모듈
  ├── .github/             # GitHub Actions CI/CD (8081 포트 기준)
  └── docker-compose.yml   # backend:5001, frontend:80 (호스트 8081 매핑)

4. [CRITICAL] 배포 및 보안 주의사항이 규칙을 어기면 전체 서비스가 다운됩니다.포트 바인딩 금지: 절대 Docker에서 80/443 포트를 직접 점유하지 마라.호스트 nginx가 80/443을 사용 중임.반드시 8081 포트만 사용 ("8081:80").nginx 중단 금지: 배포 시 sudo systemctl stop nginx를 절대 하지 마라.BYOS 원칙: 서버에 사용자 사진 데이터를 절대 잔류시키지 마라. 모든 데이터는 사용자의 Google Drive에 저장한다.Face API: face-api.js 모델 파일은 얼굴 인식의 핵심이므로 절대 삭제하거나 경로를 변경하지 마라.5. 반복 버그 및 장애 방지 (Checklist)작업 완료 전 반드시 다음 사항을 확인한다.[ ] Table Migration: 새 배포 시 site_folders, site_media 테이블 생성 여부 확인 (500 에러 주원인).[ ] Onboarding Flow: handleStartFree() 로직에서 기존 사이트가 있다면 무조건 /{subdomain}으로 리다이렉트 하는가?[ ] Ksarang 제거: 코드 전체에서 ksarang.org 관련 문자열이 완전히 제거되었는가? (grep 확인 필수)[ ] i18n: 다국어 번역은 기능 완성 후 별도 지시가 있을 때만 처리한다. (기본: 한국어)6. 온보딩 7단계 구조frontend/src/pages/onboarding/ 내 파일들은 아래 순서를 엄수한다.ServiceSelect: 서비스 소개StorageSelect: 저장소(Google Drive 등) 선택PhotoImport: 사진 가져오기FaceRegister: 얼굴/연령대 등록FamilyTag: 가족 태그 + 저장소 연동PrivacySet: 3레이어 공개 범위 설정InviteFamily: 가족 초대 및 박물관 생성7. 개발 원칙 (Standard)Surgical Changes: 필요한 코드만 정밀하게 수정하고, 관련 없는 대량 수정은 지양한다.Build Only: dist/ 폴더나 .min.js 파일을 직접 수정하지 마라. 소스 수정 후 빌드를 통해 생성한다.Dependency: node_modules 수정이 필요하면 patch-package를 사용하라.Layout: 모든 레이아웃 계산은 VISION.md의 260px/130px 공식을 하드코딩 수준으로 준수한다.💡 한 선생님, 정리가 끝났습니다!블록(Lego Block) 언급을 모두 삭제하고, ORGCELL_CODING_RULES.md를 따르도록 경로를 재설정했습니다.장애가 발생했던 8081 포트 규칙과 ksarang 제거 항목을 강조하여 AI가 실수하지 않게 했습니다.7단계 온보딩 구조를 명시하여 흐름이 꼬이지 않게 잡았습니다.이제 이 파일까지 저장하시면, Orgcell 프로젝트를 위한 완벽한 AI 참조 문서 세트가 완성됩니다.VISION.md: 알고리즘과 철학ORGCELL_CODING_RULES.md: UI 수치와 기술 지침rules/coding-style.md: 코드 품질 표준CLAUDE.md: 실행 환경 및 배포 주의사항