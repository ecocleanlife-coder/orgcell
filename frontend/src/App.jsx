import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import useAuthStore from './store/authStore';
import { initTheme } from './store/uiStore';
import ErrorBoundary from './components/common/ErrorBoundary';
import MainLayout from './components/layout/MainLayout';

// Lazy loading
const LandingPage = lazy(() => import('./components/home/LandingPage'));
const DevCardPreview = lazy(() => import('./pages/DevCardPreview'));
const DriveCallback = lazy(() => import('./components/settings/DriveCallback'));
const MagicLinkVerify = lazy(() => import('./pages/auth/MagicLinkVerify'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));

const FamilySetupPage = lazy(() => import('./pages/museum/FamilySetupPage'));
const FamilyDomainDashboard = lazy(() => import('./pages/museum/FamilyDomainDashboard'));
const MuseumPage = lazy(() => import('./pages/museum/MuseumPage'));
const MuseumListPage = lazy(() => import('./pages/museum/MuseumListPage'));

const SmartSortPage = lazy(() => import('./pages/smart-sort/SmartSortPage'));
const FamilyWebsitePage = lazy(() => import('./pages/museum/FamilyWebsitePage'));
const LiveSharingPage = lazy(() => import('./pages/sharing/LiveSharingPage'));
const RedeemPage = lazy(() => import('./pages/redeem/RedeemPage'));
const PaymentSuccessPage = lazy(() => import('./pages/payment/PaymentSuccessPage'));
const FamilyTreeView = lazy(() => import('./components/museum/FamilyTreeView'));
const PersonFolderView = lazy(() => import('./components/museum/PersonFolderView'));
const ExhibitionDetailPage = lazy(() => import('./pages/museum/ExhibitionDetailPage'));
const InvitePage = lazy(() => import('./pages/invite/InvitePage'));
const OneDriveCallback = lazy(() => import('./components/settings/OneDriveCallback'));
const DropboxCallback = lazy(() => import('./pages/DropboxCallback'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const OnboardingNamePage = lazy(() => import('./pages/onboarding/OnboardingNamePage'));
const OnboardingInvitePage = lazy(() => import('./pages/onboarding/OnboardingInvitePage'));
const FamilySearchCallback = lazy(() => import('./pages/auth/FamilySearchCallback'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const InviteDashboard = lazy(() => import('./components/museum/InviteDashboard'));
const InboxPage = lazy(() => import('./pages/museum/InboxPage'));
const RequestViewPage = lazy(() => import('./pages/request/RequestViewPage'));
const DemoMuseumPage = lazy(() => import('./pages/demo/DemoMuseumPage'));

const PageLoader = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
);

// Authenticated home → 사이트 유무에 따라 분기
function AuthHome() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const checkSite = async () => {
      try {
        const res = await fetch('/api/sites/mine', { credentials: 'include' });
        if (cancelled) return;
        const data = await res.json();
        if (data.data?.subdomain) {
          navigate(`/${data.data.subdomain}`, { replace: true });
        } else {
          // 모바일/데스크탑 동일하게 /home으로 — 온보딩은 /home에서 안내
          navigate('/home', { replace: true });
        }
      } catch {
        if (!cancelled) navigate('/home', { replace: true });
      }
    };
    checkSite();
    return () => { cancelled = true; };
  }, [navigate]);

  return <PageLoader />;
}

// 헤더 제외 경로 판별
const NO_LAYOUT_PATTERNS = [
  '/',           // 랜딩 (정확 일치)
  '/auth/',      // 인증
  '/onboarding/', // 온보딩
  '/drive-callback',
  '/onedrive-callback',
  '/dropbox-callback',
  '/familysearch-callback',
  '/familysearchcallback',
  '/invite',     // 초대 수락 페이지 (정확 일치)
];

function ConditionalLayout({ children }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const path = location.pathname;

  const skipLayout =
    (path === '/') ||
    (path === '/demo') ||
    (path === '/invite') ||
    path.startsWith('/auth/') ||
    path.startsWith('/onboarding/') ||
    path.startsWith('/request/') ||
    path.endsWith('-callback');

  if (skipLayout || !isAuthenticated) {
    return <>{children}</>;
  }

  return <MainLayout>{children}</MainLayout>;
}

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const isLoading = useAuthStore(state => state.isLoading);
  const fetchMe = useAuthStore(state => state.fetchMe);

  useEffect(() => {
    fetchMe();
    initTheme();
  }, [fetchMe]);

  const isPendingAuth = !!(isAuthenticated && !user && isLoading);

  return (
    <HelmetProvider>
    <BrowserRouter>
      <ConditionalLayout>
      <Routes>
        {/* ══════ 개발자 프리뷰 (인증 불필요) ══════ */}
        <Route path="/dev/cards" element={<Suspense fallback={<PageLoader />}><DevCardPreview /></Suspense>} />
        <Route path="/demo" element={<Suspense fallback={<PageLoader />}><DemoMuseumPage /></Suspense>} />

        {/* ══════ 레이아웃 없는 페이지 ══════ */}
        <Route
          path="/"
          element={
            isPendingAuth ? (
              <PageLoader />
            ) : isAuthenticated ? (
              <AuthHome />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <LandingPage />
              </Suspense>
            )
          }
        />
        <Route path="/drive-callback" element={<Suspense fallback={<PageLoader />}><DriveCallback /></Suspense>} />
        <Route path="/onedrive-callback" element={<Suspense fallback={<PageLoader />}><OneDriveCallback /></Suspense>} />
        <Route path="/familysearch-callback" element={<Suspense fallback={<PageLoader />}><FamilySearchCallback /></Suspense>} />
        <Route path="/familysearchcallback" element={<Suspense fallback={<PageLoader />}><FamilySearchCallback /></Suspense>} />
        <Route path="/dropbox-callback" element={<Suspense fallback={<PageLoader />}><DropboxCallback /></Suspense>} />
        <Route path="/auth/verify" element={<Suspense fallback={<PageLoader />}><MagicLinkVerify /></Suspense>} />
        <Route path="/auth/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/auth/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />

        {/* ══════ 온보딩 2단계 (레이아웃 없음) ══════ */}
        <Route path="/onboarding/start" element={<Navigate to="/auth/login?next=onboarding/name" replace />} />
        <Route path="/onboarding/name" element={<Suspense fallback={<PageLoader />}><OnboardingNamePage /></Suspense>} />
        <Route path="/onboarding/invite" element={<Suspense fallback={<PageLoader />}><OnboardingInvitePage /></Suspense>} />

        {/* ══════ MainLayout 적용 페이지 ══════ */}
        <Route path="/home" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><HomePage /></Suspense></ErrorBoundary>} />
        <Route path="/museums" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><MuseumListPage /></Suspense></ErrorBoundary>} />
        <Route path="/museum" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilyDomainDashboard /></Suspense></ErrorBoundary>} />
        <Route path="/family-dashboard" element={<Navigate to="/museum" replace />} />
        <Route path="/smart-sort" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><SmartSortPage /></Suspense></ErrorBoundary>} />
        <Route path="/family-website" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilyWebsitePage /></Suspense></ErrorBoundary>} />
        <Route path="/family-setup" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilySetupPage /></Suspense></ErrorBoundary>} />
        <Route path="/live-sharing" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><LiveSharingPage /></Suspense></ErrorBoundary>} />
        <Route path="/family-tree" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilyTreeView /></Suspense></ErrorBoundary>} />
        <Route path="/person/:id" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PersonFolderView /></Suspense></ErrorBoundary>} />
        <Route path="/invite-dashboard" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><InviteDashboard /></Suspense></ErrorBoundary>} />
        <Route path="/inbox" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><InboxPage /></Suspense></ErrorBoundary>} />
        <Route path="/redeem" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><RedeemPage /></Suspense></ErrorBoundary>} />
        <Route path="/payment/success" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PaymentSuccessPage /></Suspense></ErrorBoundary>} />
        <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicyPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsOfServicePage /></Suspense>} />
        <Route path="/invite" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><InvitePage /></Suspense></ErrorBoundary>} />
        <Route path="/request/:token" element={<Suspense fallback={<PageLoader />}><RequestViewPage /></Suspense>} />

        {/* ══════ 동적 서브도메인 (자체 헤더 사용) ══════ */}
        <Route path="/:subdomain/gallery/:id" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><ExhibitionDetailPage /></Suspense></ErrorBoundary>} />
        <Route path="/:subdomain/board" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><MuseumPage initialTab="board" /></Suspense></ErrorBoundary>} />
        <Route path="/:subdomain" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><MuseumPage /></Suspense></ErrorBoundary>} />
      </Routes>
      </ConditionalLayout>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
