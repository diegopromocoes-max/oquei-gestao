import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import Login from './pages/Login';
import PainelCoordenador from './pages/PainelCoordenador';
import PainelSupervisor from './pages/PainelSupervisor';
import CRMAtendente from './pages/CRMAtendente';

export default function App() {
const [user, setUser] = useState(null);
const [userData, setUserData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
if (currentUser) {
setUser(currentUser);
try {
const userDoc = await getDoc(doc(db, "users", currentUser.uid));
if (userDoc.exists()) {
const data = userDoc.data();
// PROTEÇÃO: Converte a role para minúsculas e remove espaços para evitar loops
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

if (loading) {
return (
<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', color: '#64748b', fontFamily: 'sans-serif' }}>
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
<div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #2563eb', borderRadius: '50%' }} />
<h2 style={{ fontSize: '16px', fontWeight: 'bold' }}>A inicializar o Ecossistema Oquei...</h2>
</div>
</div>
);
}

// Função para saber a rota correta do usuário
const getRoleRoute = (role) => {
if (role === 'coordinator' || role === 'coordenador') return "/coordenador";
if (role === 'supervisor') return "/supervisor";
if (role === 'attendant' || role === 'atendente') return "/atendente";
return "/unauthorized";
};

const PrivateRoute = ({ children, allowedRoles }) => {
if (!user) return <Navigate to="/login" replace />;

// Mapeamento extra para garantir que traduções não quebram o acesso
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
{/* ROTA DE LOGIN */}
<Route path="/login" element={
user && userData ? (
<Navigate to={getRoleRoute(userData.role)} replace />
) : (
<Login />
)
} />

    {/* ROTAS PROTEGIDAS */}
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

    {/* ROTA DE SEGURANÇA (Para usuários sem cargo definido) */}
    <Route path="/unauthorized" element={
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: '#ef4444', fontSize: '28px', fontWeight: 'bold' }}>Acesso Restrito</h1>
        <p style={{ color: '#64748b', marginTop: '10px', maxWidth: '400px', lineHeight: '1.5' }}>
          A sua conta (<strong>{user?.email}</strong>) não possui uma função reconhecida pelo sistema no banco de dados.
          <br/><br/>Cargo atual registado: <strong style={{color: '#1e293b'}}>{userData?.role || 'Nenhum'}</strong>
        </p>
        <button onClick={() => auth.signOut()} style={{ padding: '12px 25px', cursor: 'pointer', marginTop: '20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          Voltar ao Login
        </button>
      </div>
    } />

    {/* ROTA PADRÃO */}
    <Route path="*" element={<Navigate to={user && userData ? getRoleRoute(userData.role) : "/login"} replace />} />
  </Routes>
</BrowserRouter>


);
}