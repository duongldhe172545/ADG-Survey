/**
 * D2Com Survey — App Router
 * Route definitions with auth guard + Google OAuth provider.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SurveyListPage from './pages/SurveyListPage';
import SurveyNewPage from './pages/SurveyNewPage';
import SurveyFormPage from './pages/SurveyFormPage';
import UsersPage from './pages/UsersPage';
import ResultsPage from './pages/ResultsPage';
import ResultsListPage from './pages/ResultsListPage';
import FormEditorPage from './pages/FormEditorPage';
import FormsManagementPage from './pages/FormsManagementPage';

// Google Client ID from env (injected by Vite)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Auth guard component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/surveys" element={<SurveyListPage />} />
              <Route path="/surveys/new" element={<SurveyNewPage />} />
              <Route path="/surveys/:id" element={<SurveyFormPage />} />
              <Route path="/settings/users" element={<UsersPage />} />
              <Route path="/results" element={<ResultsListPage />} />
              <Route path="/results/:formId" element={<ResultsPage />} />
              <Route path="/forms" element={<FormsManagementPage />} />
              <Route path="/forms/:formId/edit" element={<FormEditorPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
