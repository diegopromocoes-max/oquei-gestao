// ============================================================
//  App.jsx — Oquei Gestão
//  Sprint 1 — Tarefa 1.4: AppErrorBoundary adicionado
//  Sprint 1 — Tarefa 1.3: injectGlobalCSS da fonte única
// ============================================================

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// ✅ ÚNICA fonte de verdade para CSS — globalStyles unificado
import { injectGlobalCSS } from './globalStyles';

// ✅ Design System
import { Spinner, Btn, Page, Card, colors } from './components/ui';

// ✅ Error Boundary global
import { AppErrorBoundary } from './components/ModuleErrorBoundary';

// Páginas (lazy loading nas rotas protegidas já está nos Painéis)
import Login from './pages/Login';
import PainelCoordenador from './pages/PainelCoordenador';
import PainelSupervisor  from './pages/PainelSupervisor';
import CRMAtendente      from './pages/CRMAtendente';

// ─────────────────────────────────────────────────────────────
const ROLE_MAP = {
  coordinator: 'coordinator',
  coordenador: 'coordinator',
  supervisor:  'supervisor',
  attendant:   'attendant',
  atendente:   'attendant',
};

function getRoleRoute(role) {
  const r = String(role).toLowerCase();
  if (r === 'coordinator' || r === 'coordenador') return '/coordenador';
  if (r === 'supervisor')                         return '/supervisor';
  if (r === 'attendant'   || r === 'atendente')   return '/atendente';
  return '/unauthorized';
}

// ─────────────────────────────────────────────────────────────
function AppCore() {
  const [user,     setUser]     = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Injeta CSS global uma única vez
  useEffect(() => { injectGlobalCSS(); }, []);

  // Escuta mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          const data = snap.exists() ? snap.data() : {};
          data.role = data.role
            ? ROLE_MAP[data.role.toLowerCase().trim()] || data.role.toLowerCase().trim()
            : 'guest';
          setUserData(data);
        } catch (err) {
          console.error('[App] Erro ao buscar perfil:', err);
          setUserData({ role: 'guest', name: currentUser.email });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Loading inicial ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', width: '100vw',
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'var(--bg-app)',
        flexDirection: 'column', gap: '16px',
      }}>
        <Spinner size={32} />
        <p style={{
          fontWeight: '900', fontSize: '12px',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Inicializando Ecossistema Oquei...
        </p>
      </div>
    );
  }

  // ── Componente de rota protegida ────────────────────────────
  function PrivateRoute({ children, allowedRoles }) {
    if (!user) return <Navigate to="/login" replace />;
    const normalizedRole = ROLE_MAP[userData?.role] || 'guest';
    if (!allowedRoles.includes(normalizedRole)) {
      return <Navigate to={getRoleRoute(userData?.role)} replace />;
    }
    return React.cloneElement(children, { userData });
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Login ─────────────────────────────────────────── */}
        <Route
          path="/login"
          element={
            user && userData
              ? <Navigate to={getRoleRoute(userData.role)} replace />
              : <Login />
          }
        />

        {/* ── Coordenador ───────────────────────────────────── */}
        <Route
          path="/coordenador/*"
          element={
            <PrivateRoute allowedRoles={['coordinator']}>
              <PainelCoordenador />
            </PrivateRoute>
          }
        />

        {/* ── Supervisor ────────────────────────────────────── */}
        <Route
          path="/supervisor/*"
          element={
            <PrivateRoute allowedRoles={['supervisor']}>
              <PainelSupervisor />
            </PrivateRoute>
          }
        />

        {/* ── Atendente ─────────────────────────────────────── */}
        <Route
          path="/atendente/*"
          element={
            <PrivateRoute allowedRoles={['attendant']}>
              <CRMAtendente />
            </PrivateRoute>
          }
        />

        {/* ── Acesso negado ─────────────────────────────────── */}
        <Route
          path="/unauthorized"
          element={
            <div style={{
              height: '100vh', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--bg-app)',
            }}>
              <Card
                accent={colors.danger}
                style={{ maxWidth: '440px', textAlign: 'center' }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: `${colors.danger}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <span style={{ fontSize: '22px' }}>🚫</span>
                </div>
                <h1 style={{
                  fontSize: '20px', fontWeight: '900',
                  color: colors.danger, margin: '0 0 12px',
                }}>
                  Acesso Restrito
                </h1>
                <p style={{
                  fontSize: '13px', color: 'var(--text-muted)',
                  lineHeight: 1.6, margin: '0 0 24px',
                }}>
                  A conta <strong style={{ color: 'var(--text-main)' }}>
                    {user?.email}
                  </strong> não possui permissão para acessar esta área.
                  <br /><br />
                  Cargo atual:{' '}
                  <strong style={{ color: 'var(--text-brand)' }}>
                    {userData?.role?.toUpperCase() || 'NENHUM'}
                  </strong>
                </p>
                <Btn
                  variant="danger"
                  onClick={() => signOut(auth)}
                  style={{ width: '100%' }}
                >
                  Sair e Tentar Outra Conta
                </Btn>
              </Card>
            </div>
          }
        />

        {/* ── Wildcard ──────────────────────────────────────── */}
        <Route
          path="*"
          element={
            <Navigate
              to={user && userData ? getRoleRoute(userData.role) : '/login'}
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Root com AppErrorBoundary como camada mais externa
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppErrorBoundary>
      <AppCore />
    </AppErrorBoundary>
  );
}