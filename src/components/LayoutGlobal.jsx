import React, { useState, useEffect, useMemo } from "react";
import { 
  ChevronRight, LogOut, Menu, Zap, ChevronDown, 
  Settings, UserCircle, Moon, Sun, X, CheckCircle2, 
  AlertCircle, Activity 
} from "lucide-react";

// IMPORTAÇÃO DO NOVO COMPONENTE SEPARADO
import RadarLive from './RadarLive';

export default function LayoutGlobal({ children, userData, menuItems, activeTab, onTabChange, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [radarOpen, setRadarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 1. GERENCIADOR GLOBAL DE NOTIFICAÇÕES (TOAST)
  useEffect(() => {
    window.showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };
  }, []);

  // 2. TROCA DE TEMA (CLARO/ESCURO)
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // 3. AGRUPAMENTO DO MENU POR SEÇÕES
  const groupedMenu = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const section = item.section || 'Geral';
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    }, {});
  }, [menuItems]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-app)', fontFamily: "'Manrope', sans-serif" }}>
      
      {/* --- SIDEBAR ESQUERDA --- */}
      <aside style={{
        width: sidebarOpen ? '260px' : '80px',
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100
      }}>
        <div style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={24} color="var(--text-brand)" fill="var(--text-brand)" />
          {sidebarOpen && <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '18px', letterSpacing: '-1px' }}>OQUEI CRM</span>}
        </div>
        
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px' }} className="hide-scrollbar">
          {Object.entries(groupedMenu).map(([section, items]) => (
            <div key={section} style={{ marginBottom: '15px' }}>
              {sidebarOpen && <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', padding: '10px', textTransform: 'uppercase' }}>{section}</div>}
              {items.map(item => (
                <button key={item.id} onClick={() => onTabChange(item.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', padding: '12px', gap: '12px',
                  background: activeTab === item.id ? 'var(--bg-primary-light)' : 'transparent',
                  color: activeTab === item.id ? 'var(--text-brand)' : 'var(--text-muted)',
                  border: 'none', borderRadius: '12px', cursor: 'pointer', transition: '0.2s'
                }}>
                  <item.icon size={20} />
                  {sidebarOpen && <span style={{ fontSize: '14px', fontWeight: '600' }}>{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* BOTÃO SAIR (LOGOUT) */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center',
            gap: '12px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '10px'
          }}>
            <LogOut size={20} />
            {sidebarOpen && <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Sair da Conta</span>}
          </button>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* TOPBAR (HEADER) */}
        <header style={{ 
          height: '70px', padding: '0 30px', display: 'flex', 
          alignItems: 'center', justifyContent: 'space-between', 
          borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-panel)', zIndex: 90 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={local.headerIconBtn}><Menu size={20}/></button>
            <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{activeTab.replace('_', ' ')}</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* BOTÃO TEMA */}
            <button onClick={toggleTheme} style={local.headerIconBtn} title="Alterar Tema">
              {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            
            {/* BOTÃO CONFIGURAÇÕES */}
            <button onClick={() => onTabChange('configuracoes')} style={local.headerIconBtn} title="Configurações">
              <Settings size={20} />
            </button>

            {/* BOTÃO RADAR LIVE */}
            <button onClick={() => setRadarOpen(!radarOpen)} style={{
              ...local.headerIconBtn,
              backgroundColor: radarOpen ? 'var(--bg-primary-light)' : 'transparent',
              color: radarOpen ? 'var(--text-brand)' : 'var(--text-muted)'
            }} title="Atividade em Tempo Real">
              <Activity size={20}/>
            </button>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />
            
            {/* PERFIL USUÁRIO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{userData?.name || 'Usuário'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{userData?.role?.toUpperCase()}</div>
              </div>
              <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'var(--bg-app)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <UserCircle size={22} color="var(--text-brand)" />
              </div>
            </div>
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO (SCROLL E CENTRALIZAÇÃO BALANCEADA) */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-app)', padding: '40px 0' }} className="custom-scrollbar">
          <div style={{ 
            width: '95%', 
            maxWidth: '1400px', 
            margin: '0 auto', 
            zoom: '0.85', 
            WebkitZoom: '0.85',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'stretch' // Mantém o conteúdo alinhado à esquerda dentro do container centralizado
          }}>
            {children}
          </div>
        </div>
      </main>

      {/* --- COMPONENTE RADAR LIVE (SEPARADO) --- */}
      <RadarLive 
        isOpen={radarOpen} 
        onClose={() => setRadarOpen(false)} 
        userData={userData} 
      />

      {/* --- SISTEMA DE NOTIFICAÇÕES (TOAST) --- */}
      <div style={{
        position: 'fixed', 
        top: toast.show ? '30px' : '-100px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        background: 'rgba(23, 23, 23, 0.95)', 
        backdropFilter: 'blur(10px)',
        border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#2563eb'}`,
        padding: '12px 24px', 
        borderRadius: '50px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        zIndex: 9999, 
        transition: '0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        {toast.type === 'success' ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{toast.message}</span>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
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
  }
};