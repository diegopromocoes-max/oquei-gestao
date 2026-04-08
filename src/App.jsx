// ============================================================
//  App.jsx - Oquei Gestao
// ============================================================
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from './firebase';
import { injectGlobalCSS, injectPublicCSS } from './globalStyles';
import { AppErrorBoundary } from './components/ModuleErrorBoundary';
import { Btn, Card, Spinner, colors } from './components/ui';
import { ROLE_KEYS, normalizeRole } from './lib/roleUtils';
import OqueiInsights from './OqueiInsights';
import CRMAtendente from './pages/CRMAtendente';
import Login from './pages/Login';
import PainelCoordenador from './pages/PainelCoordenador';
import PainelGrowthTeam from './pages/PainelGrowthTeam';
import PainelSupervisor from './pages/PainelSupervisor';

const PublicSurveyAccess = lazy(() => import('./OqueiInsights/pages/PublicSurveyAccess'));

const PublicSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
    <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
  </div>
);

function PublicSurveyRoute() {
  const { surveyId } = useParams();
  injectPublicCSS();
  return (
    <Suspense fallback={<PublicSpinner />}>
      <PublicSurveyAccess surveyId={surveyId} />
    </Suspense>
  );
}

function PublicSurveyEntrevistadorRoute() {
  const { surveyId, entrevistadorId } = useParams();
  injectPublicCSS();
  return (
    <Suspense fallback={<PublicSpinner />}>
      <PublicSurveyAccess surveyId={surveyId} entrevistadorId={entrevistadorId} />
    </Suspense>
  );
}

const getRoleRoute = (role) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === ROLE_KEYS.COORDINATOR) return '/coordenador';
  if (normalizedRole === ROLE_KEYS.SUPERVISOR) return '/supervisor';
  if (normalizedRole === ROLE_KEYS.ATTENDANT) return '/atendente';
  if (normalizedRole === ROLE_KEYS.GROWTH) return '/growth';
  if (normalizedRole === ROLE_KEYS.RESEARCHER) return '/insights/campo';
  return '/unauthorized';
};

function PrivateRoute({ children, allowedRoles, userData }) {
  if (!userData) return <Navigate to="/login" replace />;
  const userRole = normalizeRole(userData.role);
  if (!allowedRoles.includes(userRole)) return <Navigate to="/unauthorized" replace />;
  return React.cloneElement(children, { userData });
}

function InsightsRoute({ userData }) {
  if (!userData) return <Navigate to="/login" replace />;
  const userRole = normalizeRole(userData?.role);
  if (![ROLE_KEYS.RESEARCHER, ROLE_KEYS.SUPERVISOR, ROLE_KEYS.COORDINATOR, ROLE_KEYS.GROWTH].includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <OqueiInsights userData={userData} />;
}

function AuthApp() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    injectGlobalCSS();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
          setUserData({ uid: currentUser.uid, ...(snapshot.exists() ? snapshot.data() : { role: 'guest' }) });
        } catch (error) {
          console.warn('Nao foi possivel carregar o perfil do usuario no bootstrap:', error);
          setUserData({ uid: currentUser.uid, role: 'guest' });
        } finally {
          setLoading(false);
        }
        return;
      }

      setUser(null);
      setUserData(null);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user && userData ? <Navigate to={getRoleRoute(userData.role)} replace /> : <Login />} />

      <Route path="/coordenador/*" element={<PrivateRoute allowedRoles={[ROLE_KEYS.COORDINATOR]} userData={userData}><PainelCoordenador /></PrivateRoute>} />
      <Route path="/supervisor/*" element={<PrivateRoute allowedRoles={[ROLE_KEYS.SUPERVISOR]} userData={userData}><PainelSupervisor /></PrivateRoute>} />
      <Route path="/atendente/*" element={<PrivateRoute allowedRoles={[ROLE_KEYS.ATTENDANT]} userData={userData}><CRMAtendente /></PrivateRoute>} />
      <Route path="/growth/*" element={<PrivateRoute allowedRoles={[ROLE_KEYS.GROWTH]} userData={userData}><PainelGrowthTeam /></PrivateRoute>} />
      <Route path="/insights/*" element={<InsightsRoute userData={userData} />} />

      <Route
        path="/unauthorized"
        element={(
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
            <Card accent={colors.danger} style={{ maxWidth: '400px', textAlign: 'center' }}>
              <h1 style={{ color: colors.danger, fontWeight: '900' }}>Acesso Restrito</h1>
              <p style={{ color: 'var(--text-muted)' }}>Conta: {user?.email}<br />Cargo: {userData?.role || 'Nenhum'}</p>
              <Btn variant="danger" onClick={() => signOut(auth)} style={{ width: '100%' }}>Sair</Btn>
            </Card>
          </div>
        )}
      />

      <Route path="/pesquisa/:surveyId/entrevistador/:entrevistadorId" element={<PublicSurveyEntrevistadorRoute />} />
      <Route path="/pesquisa/:surveyId" element={<PublicSurveyRoute />} />
      <Route path="*" element={<Navigate to={user && userData ? getRoleRoute(userData.role) : '/login'} replace />} />
    </Routes>
  );
}

function AppCore() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pesquisa/:surveyId/entrevistador/:entrevistadorId" element={<PublicSurveyEntrevistadorRoute />} />
        <Route path="/pesquisa/:surveyId" element={<PublicSurveyRoute />} />
        <Route path="/*" element={<AuthApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppErrorBoundary><AppCore /></AppErrorBoundary>;
}
