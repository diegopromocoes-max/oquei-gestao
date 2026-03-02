import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, query 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import {
  TrendingUp, Flame, Zap, CalendarClock, RefreshCw, 
  ChevronRight, MapPin, Globe, Calendar, BarChart3, 
  Target, AlertTriangle, Users, Trophy, X, Bell, 
  TrendingDown, ShieldAlert, Database, PlusCircle
} from 'lucide-react';

// IMPORTAÇÃO DO DESIGN SYSTEM (Assumindo que as variáveis estão no escopo ou via props)
// Para garantir funcionamento, usaremos constantes internas caso o import falhe
const colors = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6'
};

const globalStyles = {
  container: { padding: '30px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Manrope', sans-serif" },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: '0.3s' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '5px 0 0 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' },
  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
};

// --- CONFIGURAÇÃO FIREBASE AMBIENTE CANVAS ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leads, setLeads] = useState([]);
  const [cities, setCities] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  
  const [selectedStore, setSelectedStore] = useState(null);
  const [notif, setNotif] = useState(null);

  // 1. AUTENTICAÇÃO OBRIGATÓRIA (REGRA 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setError("Erro de Autenticação: " + err.message);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // 2. BUSCA DE DADOS (REGRA 1 E 2)
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // CAMINHO RESTRITO DO CANVAS
    const path = (coll) => collection(db, 'artifacts', appId, 'public', 'data', coll);

    const unsubCities = onSnapshot(path('cities'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filtragem por Cluster no JS (Regra 2)
      const myCluster = String(userData?.clusterId || "").trim();
      const filtered = myCluster ? data.filter(c => String(c.clusterId).trim() === myCluster) : data;
      setCities(filtered);
    }, (err) => setError("Permissão negada em 'cities'. Caminho: " + appId));

    const unsubLeads = onSnapshot(path('leads'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(data);
      setLoading(false);
    });

    const unsubHols = onSnapshot(path('holidays'), (snap) => {
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubCities(); unsubLeads(); unsubHols(); };
  }, [user, userData, appId]);

  // --- FUNÇÃO PARA CRIAR DADOS DE TESTE (SE O BANCO ESTIVER VAZIO) ---
  const seedTestData = async () => {
    try {
      setLoading(true);
      const citiesRef = collection(db, 'artifacts', appId, 'public', 'data', 'cities');
      const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
      
      const cluster = userData?.clusterId || 'cluster_bady';
      
      // Criar Cidade
      const cityDoc = await addDoc(citiesRef, {
        name: "Bady Bassitt",
        city: "Bady Bassitt",
        clusterId: cluster,
        goalPlanos: 60
      });

      // Criar Leads de Teste (Vendas)
      const today = new Date().toISOString().split('T')[0];
      await addDoc(leadsRef, {
        cityId: "Bady Bassitt",
        customerName: "Cliente Teste 1",
        date: today,
        status: "Instalado",
        leadType: "Plano Novo",
        attendantId: user.uid,
        attendantName: userData?.name || "Atendente Teste",
        productName: "Fibra 600MB",
        createdAt: { seconds: Math.floor(Date.now()/1000) }
      });

      setNotif("Dados de teste gerados! O painel irá atualizar.");
      setTimeout(() => setNotif(null), 3000);
    } catch (err) {
      setError("Erro ao gerar dados: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MOTOR DE PROJEÇÕES ---
  const calendar = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    let total = 0; let worked = 0;
    const now = new Date();
    for (let i = 1; i <= lastDay; i++) {
      const d = new Date(y, m - 1, i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      total++;
      if (d <= now) worked++;
    }
    return { total: total || 22, worked: worked || 1, remaining: Math.max(0, total - worked) };
  }, [selectedMonth]);

  const dashboardData = useMemo(() => {
    const monthLeads = leads.filter(l => l.date?.startsWith(selectedMonth));

    return cities.map(city => {
      const cityLeads = monthLeads.filter(l => l.cityId === city.name || l.cityId === city.id);
      const sales = cityLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
      const installs = cityLeads.filter(l => l.status === 'Instalado').length;
      const goal = city.goalPlanos || 30;
      
      const pace = sales / calendar.worked;
      const projection = Math.floor(sales + (pace * calendar.remaining));
      const recovery = calendar.remaining > 0 ? (Math.max(0, goal - sales) / calendar.remaining).toFixed(1) : 0;

      const sellers = {};
      cityLeads.forEach(l => {
        if (!sellers[l.attendantId]) sellers[l.attendantId] = { name: l.attendantName, sales: 0, leads: 0 };
        sellers[l.attendantId].leads++;
        if (['Contratado', 'Instalado'].includes(l.status)) sellers[l.attendantId].sales++;
      });

      return { 
        ...city, sales, installs, goal, projection, recovery, pace: pace.toFixed(1),
        sellers: Object.values(sellers).sort((a,b) => b.sales - a.sales)
      };
    }).sort((a, b) => (b.sales / b.goal) - (a.sales / a.goal));
  }, [cities, leads, calendar, selectedMonth]);

  if (loading || !user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', background: '#0f172a', color: 'white' }}>
      <RefreshCw size={40} className="animate-spin" color="#3b82f6" />
      <p style={{ marginTop: '20px', fontWeight: 'bold' }}>Sincronizando com o Banco...</p>
    </div>
  );

  return (
    <div style={{ ...globalStyles.container, background: 'transparent', minHeight: '100vh' }}>
      
      {notif && <div style={local.toast}>{notif}</div>}

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '56px', height: '56px', background: colors.danger, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={32} color="white" />
          </div>
          <div>
            <h1 style={globalStyles.title}>Sala de Guerra 2.0</h1>
            <p style={globalStyles.subtitle}>Gestão Táctica do Cluster: <strong>{userData?.clusterId || 'Geral'}</strong></p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
           <div style={local.miniStat}>
              <CalendarClock size={16} color={colors.primary} />
              <span>{calendar.remaining} dias úteis</span>
           </div>
           <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={local.dateInput} />
        </div>
      </div>

      {/* ERRO DE PERMISSÃO / CONFIGURAÇÃO */}
      {error && (
        <div style={local.errorCard}>
          <ShieldAlert size={24} color={colors.danger} />
          <div>
            <h4 style={{ margin: 0 }}>Erro de Acesso</h4>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>{error}</p>
          </div>
        </div>
      )}

      {/* ESTADO VAZIO COM BOTÃO DE SEED */}
      {cities.length === 0 && !error && (
        <div style={{ ...globalStyles.card, textAlign: 'center', padding: '60px' }}>
          <Database size={48} color="var(--border)" style={{ marginBottom: '20px' }} />
          <h3>Nenhuma cidade encontrada no Cluster</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
            O seu ID de Cluster é <strong>{userData?.clusterId || 'nulo'}</strong>. <br/>
            Não existem cidades no caminho <code>/artifacts/{appId}/public/data/cities</code> vinculadas a este ID.
          </p>
          <button onClick={seedTestData} style={{ ...globalStyles.btnPrimary, margin: '0 auto' }}>
             <PlusCircle size={18} /> Gerar Cidade e Vendas de Teste
          </button>
        </div>
      )}

      {/* CARDS DE PERFORMANCE */}
      <div style={globalStyles.grid}>
        {dashboardData.map((store, idx) => {
          const isAtRisk = store.projection < store.goal;
          return (
            <div key={idx} onClick={() => setSelectedStore(store)} style={{ ...globalStyles.card, borderTop: `5px solid ${isAtRisk ? colors.danger : colors.success}`, cursor: 'pointer' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>{store.name}</h3>
                  <div style={{ padding: '4px 10px', borderRadius: '8px', background: isAtRisk ? '#ef444415' : '#10b98115', color: isAtRisk ? colors.danger : colors.success, fontSize: '12px', fontWeight: '900' }}>
                     {Math.round((store.sales / store.goal) * 100)}%
                  </div>
               </div>

               <div style={local.recoveryBox}>
                  <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>RITMO DE RECUPERAÇÃO</span>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: isAtRisk ? colors.danger : 'var(--text-main)', marginTop: '5px' }}>
                     {store.recovery} <small style={{ fontWeight: 'normal', fontSize: '12px' }}>vendas/dia</small>
                  </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <MiniProgress label="Vendido" current={store.sales} target={store.goal} color={colors.primary} />
                  <MiniProgress label="Instalado" current={store.installs} target={store.sales} color={colors.success} />
               </div>

               <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Projeção: <strong>{store.projection}</strong></span>
                  <ChevronRight size={16} />
               </div>
            </div>
          );
        })}
      </div>

      {/* MODAL RAIO-X */}
      {selectedStore && (
        <div style={local.modalOverlay}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '500px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{selectedStore.name}</h2>
                <button onClick={() => setSelectedStore(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X/></button>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                   <span style={{ flex: 2 }}>CONSULTOR</span>
                   <span style={{ flex: 1, textAlign: 'center' }}>LEADS</span>
                   <span style={{ flex: 1, textAlign: 'right' }}>VENDAS</span>
                </div>
                {selectedStore.sellers.map((s, i) => (
                  <div key={i} style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                     <span style={{ flex: 2, fontWeight: 'bold' }}>{s.name}</span>
                     <span style={{ flex: 1, textAlign: 'center' }}>{s.leads}</span>
                     <span style={{ flex: 1, textAlign: 'right', fontWeight: '900', color: colors.primary }}>{s.sales}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MiniProgress = ({ label, current, target, color }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
      <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{label.toUpperCase()}</span>
      <span style={{ fontWeight: '900' }}>{current} / {target}</span>
    </div>
    <div style={{ height: '6px', background: 'var(--bg-app)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((current/target)*100 || 0, 100)}%`, height: '100%', background: color, transition: '1s' }} />
    </div>
  </div>
);

const local = {
  dateInput: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px', borderRadius: '12px', outline: 'none', fontWeight: 'bold' },
  miniStat: { background: 'var(--bg-card)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' },
  errorCard: { background: '#ef444410', border: '1px solid #ef444440', color: '#ef4444', padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', marginBottom: '30px' },
  recoveryBox: { background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '25px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  toast: { position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: 'white', padding: '15px 30px', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(16,185,129,0.3)', zIndex: 2000 }
};