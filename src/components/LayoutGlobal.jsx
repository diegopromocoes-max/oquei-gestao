// ============================================================
//  LayoutGlobal.jsx — Oquei Gestão  (v2.0)
//  ✅ Usa CSS variables do seu globalStyles (var(--bg-panel), etc.)
//  ✅ Inline styles — sem Tailwind, compatível com seu projeto
//  ✅ Conteúdo ocupa 100% da largura disponível (sem esmagamento)
//  ✅ Sidebar colapsável com grupos, busca e indicador ativo
//  ✅ Topbar com breadcrumb, dark mode, notificações e avatar
//  ✅ Sistema de Toast integrado (window.showToast)
//  ✅ Compatível com RadarLive existente
// ============================================================

import { useState, useEffect, useMemo, useRef } from "react";
import {
  LogOut, Zap, Settings, Moon, Sun,
  CheckCircle2, AlertCircle, Activity, X, Search,
  Bell, ChevronDown, ChevronRight, ChevronLeft, Info
} from "lucide-react";
import RadarLive from './RadarLive';
import { colors } from './ui';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const SIDEBAR_OPEN      = 240;
const SIDEBAR_COLLAPSED = 68;
const TOPBAR_H          = 64;

const PERFIL_CORES = {
  coordinator: { bg: colors.purple, shadow: 'rgba(124,58,237,0.35)', light: 'rgba(124,58,237,0.12)', label: 'Coordinator' },
  supervisor:  { bg: colors.primary, shadow: 'rgba(37,99,235,0.35)',  light: 'rgba(37,99,235,0.12)',  label: 'Supervisor'  },
  atendente:   { bg: colors.success, shadow: 'rgba(16,185,129,0.35)', light: 'rgba(16,185,129,0.12)', label: 'Atendente'   },
  default:     { bg: colors.primary, shadow: 'rgba(37,99,235,0.35)',  light: 'rgba(37,99,235,0.12)',  label: 'Usuário'     },
};

// ─── LAYOUT GLOBAL ────────────────────────────────────────────────────────────
export default function LayoutGlobal({
  children,
  userData,
  menuItems = [],
  activeTab,
  onTabChange,
  onLogout,
  appName = 'OQUEI CRM',
  logoUrl = null,
}) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('oquei-theme') || 'light';
  });
  
  const [busca,      setBusca]      = useState('');
  const [openSecs,   setOpenSecs]   = useState({});
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [radarOpen,  setRadarOpen]  = useState(false);
  const [toast,      setToast]      = useState({ show: false, message: '', type: 'success' });
  const notifRef = useRef(null);

  // Toast global — mantém compatibilidade com window.showToast existente
  useEffect(() => {
    window.showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast(p => ({ ...p, show: false })), 4000);
    };
  }, []);

  
  // Tema
const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('oquei-theme', theme);
  }, [theme]);

  // Fecha notificações ao clicar fora
  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Agrupa menu por seção — igual ao seu código original
  const groupedMenu = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const section = item.section || 'Geral';
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    }, {});
  }, [menuItems]);

  // Inicializa grupos abertos
  useEffect(() => {
    const init = {};
    Object.keys(groupedMenu).forEach(k => { init[k] = true; });
    setOpenSecs(init);
  }, [menuItems]);

  // Busca de páginas
  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return null;
    return menuItems.filter(i =>
      i.label.toLowerCase().includes(busca.toLowerCase())
    );
  }, [busca, menuItems]);

  // Perfil e cores
  const role    = userData?.role?.toLowerCase() || 'default';
  const pc      = PERFIL_CORES[role] || PERFIL_CORES.default;

  // Item ativo para breadcrumb
  const activeItem    = menuItems.find(i => i.id === activeTab);
  const activeSection = activeItem?.section || '';

  // Notificações — substitua por dados reais do Firebase
  const notificacoes = [
    { id: 1, tipo: 'alerta', msg: 'Meta de vendas abaixo de 70%',  tempo: '5 min' },
    { id: 2, tipo: 'ok',     msg: 'Relatório de março disponível', tempo: '1h'    },
    { id: 3, tipo: 'info',   msg: 'Novo comunicado publicado',      tempo: '2h'    },
  ];
  const notifCor = { alerta: colors.warning, ok: colors.success, info: colors.primary };
  const notifIc  = { alerta: AlertCircle, ok: CheckCircle2, info: Info };

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_OPEN;

  const iconBtn = (extra = {}) => ({
    width: '38px', height: '38px', borderRadius: '10px',
    border: 'none', backgroundColor: 'transparent',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
    ...extra,
  });

  const navBtn = (isActive) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: collapsed ? '10px 0' : '9px 12px',
    gap: '11px',
    background: isActive ? pc.light : 'transparent',
    color: isActive ? 'var(--text-brand)' : 'var(--text-muted)',
    border: 'none',
    borderRadius: '11px',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    marginBottom: '2px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'relative',
    textAlign: 'left',
  });

  const avatar = {
    width: '34px', height: '34px', borderRadius: '50%',
    background: pc.bg, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
    fontSize: '13px', fontWeight: '900', color: '#ffffff',
    boxShadow: `0 2px 8px ${pc.shadow}`,
  };

  const fade = {
    overflow: 'hidden',
    opacity: collapsed ? 0 : 1,
    maxWidth: collapsed ? 0 : '200px',
    transition: 'opacity 0.15s, max-width 0.25s',
    whiteSpace: 'nowrap',
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      overflow: 'hidden', backgroundColor: 'var(--bg-app)',
      fontFamily: "'Manrope', sans-serif",
    }}>

      {/* ══════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside style={{
        width: `${sidebarW}px`,
        minWidth: `${sidebarW}px`,
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', zIndex: 100,
        position: 'relative', flexShrink: 0,
      }}>

        {/* Cabeçalho / Logo */}
        <div style={{
          height: `${TOPBAR_H}px`, padding: collapsed ? '0 16px' : '0 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
            background: logoUrl ? 'transparent' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: logoUrl ? 'none' : '0 4px 12px rgba(37,99,235,0.4)',
            overflow: 'hidden',
          }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '9px' }} />
              : <Zap size={17} color="#ffffff" fill="#ffffff" />
            }
          </div>
          <span style={{ ...fade, fontWeight: '900', color: 'var(--text-main)', fontSize: '16px', letterSpacing: '-0.5px' }}>
            {appName}
          </span>
        </div>

        {/* Busca rápida */}
        {!collapsed && (
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '7px 11px',
            }}>
              <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '13px', color: 'var(--text-main)', fontFamily: "'Manrope', sans-serif",
                }}
                placeholder="Buscar página..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              {busca && (
                <button onClick={() => setBusca('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={12} color="var(--text-muted)" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navegação */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '8px 6px' : '8px 10px' }} className="hide-scrollbar">

          {/* Modo busca */}
          {resultadosBusca !== null ? (
            <div>
              {resultadosBusca.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 8px' }}>Nenhuma página encontrada</p>
              ) : resultadosBusca.map(item => (
                <button key={item.id} onClick={() => { onTabChange(item.id); setBusca(''); }}
                  style={navBtn(activeTab === item.id)}
                  onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'var(--bg-app)'; }}
                  onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'transparent'; }}>
                  {activeTab === item.id && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '18px', borderRadius: '0 4px 4px 0', backgroundColor: 'var(--text-brand)' }} />}
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            // Modo normal
            Object.entries(groupedMenu).map(([section, items]) => (
              <div key={section} style={{ marginBottom: '4px' }}>
                {!collapsed && (
                  <div
                    style={{
                      fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)',
                      padding: '10px 8px 5px', textTransform: 'uppercase', letterSpacing: '0.08em',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', userSelect: 'none', borderRadius: '8px',
                    }}
                    onClick={() => setOpenSecs(p => ({ ...p, [section]: !p[section] }))}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{section}</span>
                    <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: openSecs[section] ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                  </div>
                )}
                {(collapsed || openSecs[section] !== false) && items.map(item => (
                  <button key={item.id} onClick={() => onTabChange(item.id)}
                    title={collapsed ? item.label : undefined}
                    style={navBtn(activeTab === item.id)}
                    onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'var(--bg-app)'; }}
                    onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'transparent'; }}>
                    {activeTab === item.id && (
                      <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '18px', borderRadius: '0 4px 4px 0', backgroundColor: 'var(--text-brand)' }} />
                    )}
                    <item.icon size={18} style={{ flexShrink: 0 }} />
                    <span style={{ ...fade, fontSize: '13px', fontWeight: '600' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>

        {/* Perfil + Logout */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: collapsed ? '12px 8px' : '12px 14px',
          display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={avatar}>{userData?.name?.[0]?.toUpperCase() || 'U'}</div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userData?.name || 'Usuário'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {pc.label}
                </div>
              </div>
              <button onClick={onLogout} title="Sair"
                style={iconBtn({ color: colors.danger })}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LogOut size={17} />
              </button>
            </>
          )}
        </div>

        {/* Botão de colapsar */}
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            position: 'absolute', top: '80px', right: '-11px',
            width: '22px', height: '22px', borderRadius: '50%',
            backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)', zIndex: 101,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--text-main)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-panel)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ══════════════════════════════════════════════════
          ÁREA PRINCIPAL
      ══════════════════════════════════════════════════ */}
      <main style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,   // CRÍTICO: impede que o flex item quebre o layout
      }}>

        {/* TOPBAR */}
        <header style={{
          height: `${TOPBAR_H}px`, minHeight: `${TOPBAR_H}px`,
          padding: '0 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-panel)', zIndex: 90, flexShrink: 0, gap: '16px',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
            {activeSection && (
              <>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {activeSection}
                </span>
                <ChevronRight size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </>
            )}
            <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
              {activeItem?.label || 'Dashboard'}
            </span>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

            {/* Dark / Light */}
            <button style={iconBtn()} onClick={toggleTheme}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notificações */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button style={{ ...iconBtn(), position: 'relative' }} onClick={() => setNotifOpen(v => !v)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Bell size={18} />
                <span style={{ position: 'absolute', top: '8px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: colors.danger, border: '2px solid var(--bg-panel)' }} />
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '46px', width: '290px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                  overflow: 'hidden', zIndex: 999,
                }}>
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Notificações</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>3 novas</span>
                  </div>
                  {notificacoes.map(n => {
                    const Ic = notifIc[n.tipo];
                    return (
                      <div key={n.id}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Ic size={14} color={notifCor[n.tipo]} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: 0, lineHeight: 1.45 }}>{n.msg}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0' }}>há {n.tempo}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding: '9px 16px' }}>
                    <button style={{ width: '100%', background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-brand)', cursor: 'pointer', fontWeight: '700' }}>
                      Ver todas as notificações
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Activity / Radar */}
            <button style={iconBtn()} onClick={() => setRadarOpen(v => !v)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Activity size={18} />
            </button>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 6px', flexShrink: 0 }} />

            {/* Usuário */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'default' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {userData?.name || 'Usuário'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {pc.label}
                </div>
              </div>
              <div style={avatar}>{userData?.name?.[0]?.toUpperCase() || 'U'}</div>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════
            CONTEÚDO PRINCIPAL
            ─────────────────────────────────────────────
            scrollArea:     sem alignItems — preenche tudo
            contentWrapper: width 100% + maxWidth 1600px
                            Isso garante que o conteúdo ocupa
                            toda a área disponível e só centraliza
                            em telas acima de 1600px.
        ══════════════════════════════════════════════════ */}
        <div
          style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-app)' }}
          className="custom-scrollbar"
        >
          <div style={{
            width: '100%',
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '32px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            {children}
          </div>
        </div>
      </main>

      {/* RadarLive — componente já existente no seu projeto */}
      <RadarLive isOpen={radarOpen} onClose={() => setRadarOpen(false)} userData={userData} />

      {/* Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '28px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.97)',
          border: `1px solid ${toast.type === 'error' ? colors.danger : colors.primary}`,
          padding: '11px 22px', borderRadius: '50px',
          display: 'flex', alignItems: 'center', gap: '10px',
          zIndex: 9999, color: '#ffffff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          fontFamily: "'Manrope', sans-serif",
        }}>
          {toast.type === 'success'
            ? <CheckCircle2 size={15} color={colors.success} />
            : <AlertCircle  size={15} color={colors.danger} />}
          <span style={{ fontWeight: '700', fontSize: '13px' }}>{toast.message}</span>
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}