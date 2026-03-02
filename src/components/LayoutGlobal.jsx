import React, { useState, useEffect } from "react";
import { 
  ChevronRight, LogOut, Menu, Zap, Bell, ChevronDown, 
  Settings, UserCircle, Moon, Sun, Activity, 
  TrendingUp, Clock, MapPin, X, Flame
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { db } from "../firebase";
import { collection, onSnapshot, query, limit, orderBy } from "firebase/firestore";

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global, colors } from "../styles/globalStyles";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function LayoutGlobal({ children, userData, menuItems, activeTab, onTabChange, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [radarOpen, setRadarOpen] = useState(true);
  const [recentActions, setRecentActions] = useState([]);
  const [theme, setTheme] = useState('dark');

  // ESCUTA EM TEMPO REAL PARA O RADAR (COLUNA DIREITA)
  useEffect(() => {
    // Escuta os últimos 10 leads criados no sistema
    const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
    const unsub = onSnapshot(leadsRef, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordena por criação e pega os últimos 8
      const sorted = docs
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 8);
      setRecentActions(sorted);
    });

    return () => unsub();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      overflow: 'hidden', 
      backgroundColor: 'var(--bg-app)',
      fontFamily: "'Manrope', sans-serif"
    }}>
      
      {/* 1. SIDEBAR ESQUERDA (MENU) */}
      <aside style={{
        width: sidebarOpen ? '280px' : '80px',
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50
      }}>
        {/* LOGO AREA */}
        <div style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            minWidth: '40px', height: '40px', borderRadius: '10px', 
            background: 'var(--text-brand)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center' 
          }}>
            <Zap size={24} color="white" />
          </div>
          {sidebarOpen && <span style={{ fontWeight: '900', fontSize: '20px', color: 'var(--text-main)', letterSpacing: '-1px' }}>OQUEI <span style={{fontWeight: '400', opacity: 0.6}}>Geral</span></span>}
        </div>

        {/* MENU ITEMS */}
        <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }} className="hide-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '12px 15px',
                marginBottom: '4px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                gap: '12px',
                backgroundColor: activeTab === item.id ? 'var(--bg-primary-light)' : 'transparent',
                color: activeTab === item.id ? 'var(--text-brand)' : 'var(--text-muted)',
                transition: '0.2s'
              }}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              {sidebarOpen && <span style={{ fontSize: '14px', fontWeight: activeTab === item.id ? '800' : '600' }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* FOOTER SIDEBAR */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
            background: 'transparent', border: 'none', color: '#ef4444', 
            cursor: 'pointer', padding: '10px'
          }}>
            <LogOut size={20} />
            {sidebarOpen && <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Sair da Conta</span>}
          </button>
        </div>
      </aside>

      {/* 2. CONTEÚDO PRINCIPAL (MEIO) */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* HEADER TOPBAR */}
        <header style={{
          height: '70px',
          padding: '0 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-panel)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={local.headerIconBtn}><Menu size={20}/></button>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {activeTab.replace('_', ' ')}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={toggleTheme} style={local.headerIconBtn}>
              {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{userData?.name || 'Utilizador'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{userData?.role?.toUpperCase()}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCircle size={24} color="var(--text-brand)" />
              </div>
            </div>
            <button onClick={() => setRadarOpen(!radarOpen)} style={{
              ...local.headerIconBtn,
              backgroundColor: radarOpen ? 'var(--bg-primary-light)' : 'transparent',
              color: radarOpen ? 'var(--text-brand)' : 'var(--text-muted)'
            }}>
              <Activity size={20}/>
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }} className="custom-scrollbar">
          {children}
        </div>
      </main>

      {/* 3. HUB OQUEI RADAR (COLUNA FIXA DIREITA) */}
      {radarOpen && (
        <aside style={{
          width: '320px',
          backgroundColor: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s ease',
          animation: 'slideInRight 0.4s ease-out'
        }}>
          {/* RADAR HEADER */}
          <div style={{ padding: '25px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={local.pulseContainer}>
                <div style={local.pulseCircle}></div>
                <div style={local.pulseRing}></div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>RADAR <span style={{color: 'var(--text-brand)'}}>LIVE</span></h3>
            </div>
            <button onClick={() => setRadarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18}/></button>
          </div>

          {/* RADAR CONTENT */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="hide-scrollbar">
            
            {/* KPI RÁPIDO DO RADAR */}
            <div style={local.radarKpi}>
               <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <TrendingUp size={16} color="#10b981" />
                 <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Vendas Hoje</span>
               </div>
               <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>
                 {recentActions.filter(l => l.status === 'Contratado' || l.status === 'Instalado').length}
               </div>
            </div>

            <div style={{ marginTop: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Atividade Recente</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-app)', color: 'var(--text-muted)' }}>LIVE</span>
              </div>

              {/* LISTA DE AÇÕES NO RADAR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                     <Clock size={32} style={{ margin: '0 auto 10px' }} />
                     <p style={{ fontSize: '12px' }}>Aguardando atividade...</p>
                  </div>
                ) : (
                  recentActions.map((action, idx) => (
                    <div key={action.id} style={{
                      padding: '12px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                      animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s backward`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px',
                          background: action.status === 'Novo' ? '#3b82f620' : '#10b98120',
                          color: action.status === 'Novo' ? '#3b82f6' : '#10b981',
                          textTransform: 'uppercase'
                        }}>{action.status || 'Negociação'}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Agora mesmo</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>{action.customerName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <MapPin size={10} /> {action.cityId}
                      </div>
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-brand)' }}>
                          {action.attendantName?.[0]}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{action.attendantName?.split(' ')[0]} registou lead</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RADAR FOOTER */}
          <div style={{ padding: '20px', background: 'var(--bg-app)', margin: '15px', borderRadius: '16px', border: '1px solid var(--border)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Flame size={16} color="#ef4444" />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>Estado da Rede</span>
             </div>
             <div style={{ marginTop: '10px', height: '4px', width: '100%', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '92%', height: '100%', background: '#10b981' }}></div>
             </div>
             <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>Operação estável em 14 clusters.</p>
          </div>
        </aside>
      )}

      {/* ESTILOS DE ANIMAÇÃO */}
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
    </div>
  );
}

const local = {
  headerIconBtn: {
    width: '40px', height: '40px', borderRadius: '10px', border: 'none',
    backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
  },
  pulseContainer: { position: 'relative', width: '10px', height: '10px' },
  pulseCircle: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', position: 'relative', zIndex: 2 },
  pulseRing: {
    position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981',
    animation: 'pulse 2s infinite', zIndex: 1
  },
  radarKpi: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-app) 100%)',
    padding: '20px', borderRadius: '20px', border: '1px solid var(--border)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }
};

// Injeção de Keyframes Globais
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.8; }
      70% { transform: scale(3); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}