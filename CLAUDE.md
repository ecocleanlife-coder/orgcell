# CLAUDE.md — Orgcell 프로젝트 참조 가이드

## 문서 구조
- 기술 규칙 전체: ORGCELL_CODING_RULES.md (최우선)
- 철학/알고리즘: VISION.md
- 공통 인프라: C:\IOC\CLAUDE.md

## [CRITICAL] 배포 필수 규칙
- Docker 포트: 8081:80 만 사용 (80/443 직접 바인딩 절대 금지)
- nginx stop 금지
- BYOS 원칙: 서버에 사진 잔류 금지
- 배포 전 항상 ORGCELL_CODING_RULES.md §27 확인
