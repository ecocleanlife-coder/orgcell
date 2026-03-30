import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import axios from 'axios';

import useAuthStore from './store/authStore';
import { initTheme } from './store/uiStore';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy loading
const LandingPage = lazy(() => import('./components/home/LandingPage'));
const DriveCallback = lazy(() => import('./components/settings/DriveCallback'));
const MagicLinkVerify = lazy(() => import('./pages/auth/MagicLinkVerify'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));

const FamilySetupPage = lazy(() => import('./pages/museum/FamilySetupPage'));
const FamilyDomainDashboard = lazy(() => import('./pages/museum/FamilyDomainDashboard'));
const MuseumPage = lazy(() => import('./pages/museum/MuseumPage'));

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
const ServiceSelectPage = lazy(() => import('./pages/onboarding/ServiceSelectPage'));
const StorageSelectPage = lazy(() => import('./pages/onboarding/StorageSelectPage'));
const PhotoImportPage = lazy(() => import('./pages/onboarding/PhotoImportPage'));
const FaceRegisterPage = lazy(() => import('./pages/onboarding/FaceRegisterPage'));
const FamilyTagPage = lazy(() => import('./pages/onboarding/FamilyTagPage'));
const PrivacySetPage = lazy(() => import('./pages/onboarding/PrivacySetPage'));
const InviteFamilyPage = lazy(() => import('./pages/onboarding/InviteFamilyPage'));
const OnboardingWelcomePage = lazy(() => import('./pages/onboarding/OnboardingWelcomePage'));
const OnboardingGuard = lazy(() => import('./components/onboarding/OnboardingGuard'));
const FamilySearchCallback = lazy(() => import('./pages/auth/FamilySearchCallback'));
// DemoMuseumPage 제거 — /demo는 /:subdomain (MuseumPage)에서 처리

const PageLoader = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
);

// Authenticated home → 사이트 유무에 따라 분기
function AuthHome() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSite = async () => {
      try {
        const res = await fetch('/api/sites/mine');
        const data = await res.json();
        if (data.data?.subdomain) {
          navigate(`/${data.data.subdomain}`, { replace: true });
        } else {
          // 모바일이면 온보딩, 데스크탑이면 홈
          if (window.innerWidth < 768) {
            navigate('/onboarding/start', { replace: true });
          } else {
            navigate('/home', { replace: true });
          }
        }
      } catch {
        navigate('/home', { replace: true });
      }
    };
    checkSite();
  }, [navigate]);

  return <PageLoader />;
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
      <Routes>
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
        <Route
          path="/drive-callback"
          element={
            <Suspense fallback={<PageLoader />}>
              <DriveCallback />
            </Suspense>
          }
        />
        <Route
          path="/onedrive-callback"
          element={
            <Suspense fallback={<PageLoader />}>
              <OneDriveCallback />
            </Suspense>
          }
        />
        <Route
          path="/familysearch-callback"
          element={
            <Suspense fallback={<PageLoader />}>
              <FamilySearchCallback />
            </Suspense>
          }
        />
        <Route
          path="/dropbox-callback"
          element={
            <Suspense fallback={<PageLoader />}>
              <DropboxCallback />
            </Suspense>
          }
        />
        <Route
          path="/auth/verify"
          element={
            <Suspense fallback={<PageLoader />}>
              <MagicLinkVerify />
            </Suspense>
          }
        />
        <Route
          path="/auth/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/auth/forgot-password"
          element={
            <Suspense fallback={<PageLoader />}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/onboarding/start"
          element={
            <Suspense fallback={<PageLoader />}>
              <OnboardingWelcomePage />
            </Suspense>
          }
        />
        <Route
          path="/onboarding/service"
          element={
            <Suspense fallback={<PageLoader />}>
              <ServiceSelectPage />
            </Suspense>
          }
        />
        <Route
          path="/onboarding/storage"
          element={
            <Suspense fallback={<PageLoader />}>
              <StorageSelectPage />
            </Suspense>
          }
        />
        <Route
          path="/onboarding/photos"
          element={
            <Suspense fallback={<PageLoader />}>
              <OnboardingGuard><PhotoImportPage /></OnboardingGuard>
            </Suspense>
          }
        />
        <Route
          path="/onboarding/face"
          element={
            <Suspense fallback={<PageLoader />}>
              <OnboardingGuard><FaceRegisterPage /></OnboardingGuard>
            </Suspense>
          }
        />
        <Route
          path="/onboarding/family"
          element={
            <Suspense fallback={<PageLoader />}>
              <OnboardingGuard><FamilyTagPage /></OnboardingGuard>
            </Suspense>
          }
        />
        <Route
          path="/onboarding/privacy"
          element={
            <Suspense fallback={<PageLoader />}>
              <OnboardingGuard><PrivacySetPage /></OnboardingGuard>
            </Suspense>
          }
        />
        <Route
          path="/onboarding/invite"
          element={
            <Suspense fallback={<PageLoader />}>
              <OnboardingGuard><InviteFamilyPage /></OnboardingGuard>
            </Suspense>
          }
        />
        <Route
          path="/smart-sort"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <SmartSortPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/family-website"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <FamilyWebsitePage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/family-setup"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <FamilySetupPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/museum"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <FamilyDomainDashboard />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/family-dashboard"
          element={<Navigate to="/museum" replace />}
        />
        <Route
          path="/home"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <HomePage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/:subdomain/gallery/:id"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <ExhibitionDetailPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/:subdomain/board"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <MuseumPage initialTab="board" />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/:subdomain"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <MuseumPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/family-tree"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <FamilyTreeView />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/person/:id"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PersonFolderView />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/live-sharing"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <LiveSharingPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/redeem"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <RedeemPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/invite"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <InvitePage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/payment/success"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PaymentSuccessPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        {/* /demo → /:subdomain (MuseumPage)에서 subdomain="demo"로 처리 */}
      </Routes>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
