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

const PageLoader = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
);

// Authenticated home: 3-way redirect
// 1. No subscription → /family-website (marketing page)
// 2. Subscription + no museum → /family-setup (onboarding)
// 3. Subscription + museum → /museum (museum main)
function AuthHome() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // Check subscription and site in parallel
        const [subRes, siteRes] = await Promise.all([
          axios.get('/api/subscriptions/status'),
          axios.get('/api/sites/mine'),
        ]);

        const hasSubscription = subRes.data?.hasSubscription;
        const siteData = siteRes.data?.success && siteRes.data?.data;

        // hasSite also covers invited members (joined via invite)
        if (siteData) {
          navigate(`/${siteData.subdomain}`, { replace: true });
        } else if (!hasSubscription) {
          navigate('/family-website', { replace: true });
        } else {
          navigate('/family-setup', { replace: true });
        }
      } catch {
        navigate('/family-website', { replace: true });
      }
    })();
  }, [navigate]);

  return <PageLoader />;
}

function App() {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const isLoading = useAuthStore(state => state.isLoading);
  const fetchMe = useAuthStore(state => state.fetchMe);

  useEffect(() => {
    fetchMe();
    initTheme();
  }, [fetchMe]);

  const isAuthenticated = !!(token && user);
  const isPendingAuth = !!(token && !user && isLoading);

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
      </Routes>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
