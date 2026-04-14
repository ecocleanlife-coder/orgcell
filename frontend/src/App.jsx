import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

/**
 * App.jsx — 라우터 루트
 *
 * §31 레이아웃 기준 라우트 구조:
 *   /                          → LandingPage  (서비스 소개 / 비로그인 진입점)
 *   /login                     → LoginPage
 *   /onboarding                → OnboardingPage (§27 성/이름/본관)
 *   /invite/:token             → InvitePage  (§17 초대 수락/거절)
 *   /:subdomain                → MuseumPage  (§31 박물관 메인)
 *   /:subdomain/archive        → ArchivePage (§8 자료실, §6 관장 더블클릭 진입)
 *   /:subdomain/exhibition/:type → ExhibitionPage (§31 전체화면 전시관)
 *
 * 라우트 순서: 구체적 경로 먼저, /:subdomain 와일드카드 마지막
 * lazy import: 각 페이지는 최초 접근 시 번들 로드
 */

const LandingPage       = lazy(() => import('./pages/LandingPage'));
const LoginPage         = lazy(() => import('./pages/LoginPage'));
const OnboardingPage    = lazy(() => import('./pages/OnboardingPage'));
const InvitePage        = lazy(() => import('./pages/InvitePage'));
const MuseumPage        = lazy(() => import('./pages/MuseumPage'));
const PersonMuseumPage  = lazy(() => import('./pages/PersonMuseumPage'));
const ArchivePage       = lazy(() => import('./pages/Archive/ArchivePage'));
const ExhibitionPage    = lazy(() => import('./pages/ExhibitionPage'));
const MagicVerifyPage   = lazy(() => import('./pages/MagicVerifyPage'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', color: '#8B7355', fontSize: '14px',
    }}>
      가족유산박물관 불러오는 중...
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 고정 경로 (/:subdomain 보다 먼저 등록) */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/onboarding"    element={<OnboardingPage />} />
        <Route path="/invite/:token"  element={<InvitePage />} />
        <Route path="/auth/verify"    element={<MagicVerifyPage />} />

        {/* 가상 박물관 — 미개설 인물 (/:subdomain 보다 먼저 등록) */}
        <Route path="/person/:personDbId"  element={<PersonMuseumPage />} />

        {/* 박물관 경로 — /:subdomain 기반 */}
        <Route path="/:subdomain/:personPath/archive"  element={<ArchivePage />} />
        <Route path="/:subdomain/archive"              element={<ArchivePage />} />
        <Route path="/:subdomain/exhibition/:type"     element={<ExhibitionPage />} />
        <Route path="/:subdomain"                      element={<MuseumPage />} />
      </Routes>
    </Suspense>
  );
}
