// ============================================================
//  App.jsx — Oquei Gestão (v3.0 + Oquei Insights)
// ============================================================

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import { injectGlobalCSS } from './globalStyles';
import { Spinner, Btn, Card, colors } from './components/ui';
import { AppErrorBoundary } from './components/ModuleErrorBoundary';

import Login              from './pages/Login';
import PainelCoordenador  from './pages/PainelCoordenador';
import PainelSupervisor   from './pages/PainelSupervisor';
import CRMAtendente       from './pages/CRMAtendente';
import PainelGrowthTeam   from './pages/PainelGrowthTeam';

// Oquei Insights — módulo de pesquisa de campo
import OqueiInsights from './OqueiInsights';

// ─── 1. MAPEAMENTO DE CARGOS ─────────────────────────────────
const clean = (s) => String(s || '').toLowerCase().replace(/[\s_-]/g, '').trim();

const ROLES = {
  COORD:      'coordinator',
  SUPER:      'supervisor',
  ATTEND:     'attendant',
  GROWTH:     'growth_team',
  RESEARCHER: 'researcher',
  GUEST:      'guest',
};

const ROLE_MAP = {
  coordinator: ROLES.COORD,  coordenador: ROLES.COORD,  master: ROLES.COORD,  diretor: ROLES.COORD,
  supervisor:  ROLES.SUPER,
  attendant:   ROLES.ATTEND, atendente:   ROLES.ATTEND,
  growthteam:  ROLES.GROWTH, growth_team: ROLES.GROWTH, equipegrowth: ROLES.GROWTH,
  researcher:  ROLES.RESEARCHER, pesquisador: ROLES.RESEARCHER, fieldresearcher: ROLES.RESEARCHER,
};

const getRoleRoute = (role) => {
  const r = ROLE_MAP[clean(role)] || ROLES.GUEST;
  if (r === ROLES.COORD)      return '/coordenador';
  if (r === ROLES.SUPER)      return '/supervisor';
  if (r === ROLES.ATTEND)     return '/atendente';
  if (r === ROLES.GROWTH)     return '/growth';
  if (r === ROLES.RESEARCHER) return '/insights/campo';
  return '/unauthorized';
};

// ─── 2. COMPONENTE DE ROTA ───────────────────────────────────
function PrivateRoute({ children, allowedRoles, userData }) {
  if (!userData) return <Navigate to="/login" replace />;
  const userRole = ROLE_MAP[clean(userData.role)] || ROLES.GUEST;
  if (!allowedRoles.includes(userRole)) return <Navigate to="/unauthorized" replace />;
  return React.cloneElement(children, { userData });
}

// ─── 3. WRAPPER INSIGHTS (mobile-first, sem layout padrão) ──
function InsightsRoute({ userData }) {
  if (!userData) return <Navigate to="/login" replace/>;
  const r = ROLE_MAP[clean(userData?.role)] || ROLES.GUEST;
  if (![ROLES.RESEARCHER, ROLES.SUPER, ROLES.COORD, ROLES.GROWTH].includes(r)) return <Navigate to="/unauthorized" replace/>;
  return <OqueiInsights userData={userData}/>;
}

// ─── 4. APP CORE ─────────────────────────────────────────────
function AppCore() {
  const [user, setUser]         = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { injectGlobalCSS(); }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          setUserData({ uid: currentUser.uid, ...(snap.exists() ? snap.data() : { role: 'guest' }) });
        } catch {
          setUserData({ uid: currentUser.uid, role: 'guest' });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ display:'flex', height:'100vh', justifyContent:'center', alignItems:'center', backgroundColor:'var(--bg-app)' }}>
      <Spinner size={32}/>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user && userData ? <Navigate to={getRoleRoute(userData.role)} replace/> : <Login/>}/>

        <Route path="/coordenador/*" element={<PrivateRoute allowedRoles={[ROLES.COORD]}  userData={userData}><PainelCoordenador/></PrivateRoute>}/>
        <Route path="/supervisor/*"  element={<PrivateRoute allowedRoles={[ROLES.SUPER]}  userData={userData}><PainelSupervisor/></PrivateRoute>}/>
        <Route path="/atendente/*"   element={<PrivateRoute allowedRoles={[ROLES.ATTEND]} userData={userData}><CRMAtendente/></PrivateRoute>}/>
        <Route path="/growth/*"      element={<PrivateRoute allowedRoles={[ROLES.GROWTH]} userData={userData}><PainelGrowthTeam/></PrivateRoute>}/>

        {/* Oquei Insights — acesso por researcher (fullscreen) e outros roles via painel */}
        <Route path="/insights/*" element={<InsightsRoute userData={userData}/>}/>

        <Route path="/unauthorized" element={
          <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'var(--bg-app)' }}>
            <Card accent={colors.danger} style={{ maxWidth:'400px', textAlign:'center' }}>
              <h1 style={{ color:colors.danger, fontWeight:'900' }}>Acesso Restrito</h1>
              <p style={{ color:'var(--text-muted)' }}>Conta: {user?.email}<br/>Cargo: {userData?.role||'Nenhum'}</p>
              <Btn variant="danger" onClick={() => signOut(auth)} style={{ width:'100%' }}>Sair</Btn>
            </Card>
          </div>
        }/>

        <Route path="*" element={<Navigate to={user && userData ? getRoleRoute(userData.role) : '/login'} replace/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppErrorBoundary><AppCore/></AppErrorBoundary>;
}
