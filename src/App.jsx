import './App.css'
import React, { useEffect, useState } from 'react'
import api from '@/api/client'
import { Toaster } from "@/components/ui/toaster"
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClientInstance, queryPersister } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import RouteFallback from '@/components/common/RouteFallback';
const QRInventory = React.lazy(() => import('./pages/QRInventory'));
const LogisticsScan = React.lazy(() => import('./pages/LogisticsScan'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const Landing = React.lazy(() => import('./pages/Landing'));

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not signed in → marketing Landing page, except on /Auth which shows login.
  if (!isAuthenticated) {
    const path = (location.pathname || '').toLowerCase();
    if (path.startsWith('/auth')) return <Pages.Auth />;
    return <Landing />;
  }

  return <OnboardingGate />;
};

// Force first-time tenants through the onboarding wizard before the app.
const OnboardingGate = () => {
  const [state, setState] = useState('loading'); // loading | onboard | ready

  useEffect(() => {
    let alive = true;
    api.get('/onboarding/status')
      .then((r) => { if (alive) setState(r.data?.onboardingCompleted === false ? 'onboard' : 'ready'); })
      .catch(() => { if (alive) setState('ready'); }); // fail open — never lock the user out
    return () => { alive = false; };
  }, []);

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (state === 'onboard') {
    return <Pages.Onboarding />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/QRInventory" element={
        <LayoutWrapper currentPageName="QRInventory">
          <QRInventory />
        </LayoutWrapper>
      } />
      <Route path="/LogisticsScan" element={
        <LayoutWrapper currentPageName="LogisticsScan">
          <LogisticsScan />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <PersistQueryClientProvider
        client={queryClientInstance}
        persistOptions={{
          persister: queryPersister,
          maxAge: 24 * 60 * 60 * 1000,
          dehydrateOptions: {
            // Only persist successful queries (never errored/loading states).
            shouldDehydrateQuery: (q) => q.state.status === 'success',
          },
        }}
      >
        <Router>
          <NavigationTracker />
          <ErrorBoundary>
            <React.Suspense fallback={<RouteFallback />}>
              <AuthenticatedApp />
            </React.Suspense>
          </ErrorBoundary>
        </Router>
        <Toaster />
        <VisualEditAgent />
      </PersistQueryClientProvider>
    </AuthProvider>
  )
}

export default App