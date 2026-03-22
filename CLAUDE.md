> 공통 규칙은 C:\IOC\CLAUDE.md 참조

# orgcell — AI 사진 정리/공유 플랫폼

## 1. 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 도메인 | orgcell.com |
| 용도 | AI 사진 정리 (얼굴 인식), 실시간 공유 (Friend Call), Google Drive BYOS |
| 배포 | Docker Compose (port 8081) + nginx, Ohio EC2 |
| DB | PostgreSQL 16 |
| 상태 | 운영중 |

## 2. 기술 스택 (공통과 다른 부분)

| 영역 | 기술 |
|------|------|
| 언어 | TypeScript (React + Vite) |
| CSS | Tailwind CSS 3 |
| 실시간 | Socket.IO 4 (Friend Call relay) |
| AI | face-api.js (얼굴 인식), WASM 모듈 |
| 지도 | Leaflet + react-leaflet (클러스터링) |
| 인증 | Google OAuth 2.0 |
| 저장소 | Google Drive API (BYOS) |
| 결제 | Stripe |
| PWA | vite-plugin-pwa |
| 이미지 | exifr (EXIF), pica (리사이즈), dHash (중복 감지) |

## 3. 폴더 구조

```
C:\IOC\orgcell\
  frontend/src/         React + Vite + TypeScript
  backend/              Express API (server.js, controllers/, routes/, services/)
  database/             PostgreSQL 스키마
  wasm_modules/         WebAssembly 모듈
  .github/              GitHub Actions CI/CD
  docker-compose.yml    Docker 구성 (backend:5001, frontend:80, db:5432)
```

## 4. 전용 코딩 규칙

- 얼굴 벡터: 128차원 float 배열 (face_descriptors 테이블)
- 사진 저장: 서버가 아닌 사용자의 Google Drive에 저장 (BYOS)
- Friend Call: Socket.IO relay 방식 — 서버에 사진 데이터 잔류 금지

## 5. 운영 중 주의사항

- Docker 컨테이너 (port 8081) — 절대 80/443 바인딩 금지
- Google OAuth 클라이언트 ID/Secret 변경 시 전체 인증 깨짐
- Stripe webhook 설정 변경 시 결제 실패
- face-api.js 모델 파일 삭제 금지

## 6. 배포 주의사항 (CRITICAL)

- **절대 80/443 포트 바인딩 금지** — 호스트 nginx가 80/443을 사용하여 모든 사이트를 서빙
- 80/443을 Docker에 바인딩하면 **호스트 nginx가 죽으면서 전체 사이트가 다운**됨 (2026-03-19 장애 발생)
- **반드시 8081 포트만 사용** — `docker-compose.yml`, `deploy.yml` 모두 `"8081:80"`
- SSL은 호스트 nginx가 처리 (`/etc/nginx/conf.d/orgcell.conf`)
- 배포 스크립트에서 **절대 `sudo systemctl stop nginx` 하지 않음**
- 배포 후 호스트 nginx 상태 반드시 확인:
  ```bash
  sudo systemctl status nginx
  # Active: active (running) 확인 필수
  ```

## 7. 반복 버그 주의사항 (재발 방지)

Orgcell 작업 시 항상 확인할 것:

1. **site_folders 테이블 마이그레이션 누락 주의**
   - `/api/sites/mine` 500 에러 원인 1순위
   - 새 배포 시 `site_folders`, `site_media` 테이블 존재 여부 반드시 확인
   - `deploy.yml`에 마이그레이션 포함 여부 체크

2. **handleStartFree() 로직**
   - 반드시 `/api/sites/mine` 호출 후 사이트 있으면 `/{subdomain}`으로 이동
   - 토큰만 확인하고 무조건 `/family-setup`으로 보내면 안 됨

3. **FamilySetupPage 접근 차단**
   - 마운트 시 `/api/sites/mine` 호출
   - 사이트 있으면 바로 `/{subdomain}`으로 리다이렉트
   - 없으면 Step 1 표시

4. **ksarang referral 문구 완전 제거**
   - 코드 전체에서 `ksarang.org` 언급 없어야 함
   - `grep -r "ksarang" frontend/src` 로 확인
   - i18n 파일 5개 언어 모두 확인
