import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import QRInventory from './pages/QRInventory';
import LogisticsScan from './pages/LogisticsScan';
import LoginPage from './pages/LoginPage';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Auth guard: redirects to /login if not authenticated
const RequireAuth = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-900">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center mb-4 shadow-lg">
          <span className="text-2xl">🐝</span>
        </div>
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm mt-3">Loading BeeERP...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AuthenticatedApp = () => {
  const { authError } = useAuth();

  // Handle specific auth errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required is handled by RequireAuth below
  }

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route path="/" element={
        <RequireAuth>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </RequireAuth>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <RequireAuth>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </RequireAuth>
          }
        />
      ))}
      <Route path="/QRInventory" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="QRInventory">
            <QRInventory />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/LogisticsScan" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="LogisticsScan">
            <LogisticsScan />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App