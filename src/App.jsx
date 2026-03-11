import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// ✅ IMPORTAÇÃO DO DESIGN SYSTEM
import { injectGlobalCSS, colors, styles as global } from './styles/globalStyles';
import { Spinner, Btn, Page, Card } from './components/ui';

// Importação das páginas
import Login from './pages/Login';
import PainelCoordenador from './pages/PainelCoordenador';
import PainelSupervisor from './pages/PainelSupervisor';
import CRMAtendente from './pages/CRMAtendente';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ INICIALIZA O CSS GLOBAL (Variáveis, Reset e Temas)
  useEffect(() => {
    injectGlobalCSS();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Normaliza a role
            data.role = data.role ? data.role.toLowerCase().trim() : 'guest';
            setUserData(data);
          } else {
            setUserData({ role: 'guest', name: currentUser.email });
          }
        } catch (error) {
          console.error("Erro ao buscar dados do utilizador:", error);
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

  // ✅ LOADING PADRONIZADO
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', height: '100vh', width: '100vw', 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner />
          <p style={{ marginTop: '16px', fontWeight: '800', fontSize: '14px', letterSpacing: '0.05em' }}>
            INICIALIZANDO ECOSSISTEMA OQUEI...
          </p>
        </div>
      </div>
    );
  }

  // Helpers de Roteamento
  const getRoleRoute = (role) => {
    const r = String(role).toLowerCase();
    if (r === 'coordinator' || r === 'coordenador') return "/coordenador";
    if (r === 'supervisor') return "/supervisor";
    if (r === 'attendant' || r === 'atendente') return "/atendente";
    return "/unauthorized";
  };

  // Componente de Proteção
  const PrivateRoute = ({ children, allowedRoles }) => {
    if (!user) return <Navigate to="/login" replace />;

    const roleMap = {
      'coordinator': 'coordinator', 'coordenador': 'coordinator',
      'supervisor': 'supervisor',
      'attendant': 'attendant', 'atendente': 'attendant'
    };

    const normalizedRole = roleMap[userData?.role] || 'guest';

    if (!allowedRoles.includes(normalizedRole)) {
      return <Navigate to={getRoleRoute(userData?.role)} replace />;
    }

    return React.cloneElement(children, { userData });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user && userData ? (
            <Navigate to={getRoleRoute(userData.role)} replace />
          ) : (
            <Login />
          )
        } />

        <Route path="/coordenador/*" element={
          <PrivateRoute allowedRoles={['coordinator']}>
            <PainelCoordenador />
          </PrivateRoute>
        } />

        <Route path="/supervisor/*" element={
          <PrivateRoute allowedRoles={['supervisor']}>
            <PainelSupervisor />
          </PrivateRoute>
        } />

        <Route path="/atendente/*" element={
          <PrivateRoute allowedRoles={['attendant']}>
            <CRMAtendente />
          </PrivateRoute>
        } />

        {/* ✅ PÁGINA UNAUTHORIZED PADRONIZADA */}
        <Route path="/unauthorized" element={
          <div style={{ 
            height: '100vh', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', backgroundColor: 'var(--bg-app)' 
          }}>
            <Card style={{ maxWidth: '450px', textAlign: 'center' }} accent={colors.danger}>
              <h1 style={{ ...global.pageTitle, color: colors.danger }}>Acesso Restrito</h1>
              <p style={{ ...global.pageSubtitle, margin: '15px 0 25px' }}>
                A conta <strong>{user?.email}</strong> não possui permissões para acessar esta área.
                <br /><br />
                Cargo atual: <span style={{ color: 'var(--text-brand)', fontWeight: 'bold' }}>{userData?.role?.toUpperCase() || 'NENHUM'}</span>
              </p>
              <Btn variant="primary" onClick={() => signOut(auth)} style={{ width: '100%' }}>
                Sair e Tentar Outra Conta
              </Btn>
            </Card>
          </div>
        } />

        <Route path="*" element={<Navigate to={user && userData ? getRoleRoute(userData.role) : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}