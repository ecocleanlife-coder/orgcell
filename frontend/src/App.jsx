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

const SmartSortView = lazy(() => import('./pages/smart-sort/SmartSortView'));
const FamilyWebsiteView = lazy(() => import('./pages/museum/FamilyWebsiteView'));
const FamilyDomainDashboard = lazy(() => import('./pages/museum/FamilyDomainDashboard'));
const LiveSharingView = lazy(() => import('./pages/sharing/LiveSharingView'));

const SmartSortPage = lazy(() => import('./pages/smart-sort/SmartSortPage'));
const FamilyWebsitePage = lazy(() => import('./pages/museum/FamilyWebsitePage'));
const LiveSharingPage = lazy(() => import('./pages/sharing/LiveSharingPage'));
const RedeemPage = lazy(() => import('./pages/redeem/RedeemPage'));
const PaymentSuccessPage = lazy(() => import('./pages/payment/PaymentSuccessPage'));
const FamilyTreeView = lazy(() => import('./components/museum/FamilyTreeView'));
const PersonFolderView = lazy(() => import('./components/museum/PersonFolderView'));

const PageLoader = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
);

// Authenticated home: redirect based on family site status
function AuthHome() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    axios.get('/api/sites/mine')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          navigate('/family-dashboard', { replace: true });
        } else {
          navigate('/family-website', { replace: true });
        }
      })
      .catch(() => {
        navigate('/family-website', { replace: true });
      })
      .finally(() => setChecked(true));
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
                {isPendingAuth ? <PageLoader /> : isAuthenticated ? <SmartSortView /> : <SmartSortPage />}
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/family-website"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                {token ? <FamilyWebsiteView /> : <FamilyWebsitePage />}
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/family-dashboard"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <FamilyDomainDashboard />
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
                {isPendingAuth ? <PageLoader /> : isAuthenticated ? <LiveSharingView /> : <LiveSharingPage />}
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
