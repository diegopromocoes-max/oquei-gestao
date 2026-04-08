import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  LogOut,
  Moon,
  Search,
  Sun,
  X,
  Zap,
} from 'lucide-react';

import RadarLive from './RadarLive';
import { colors } from './ui';
import { normalizeRole } from '../lib/roleUtils';

const SIDEBAR_OPEN = 240;
const SIDEBAR_COLLAPSED = 68;
const TOPBAR_H = 64;
const DEFAULT_APP_NAME = 'Hub Oquei';
const DEFAULT_LOGO_URL = '/favicon.png';

const PERFIL_CORES = {
  coordinator: { bg: colors.purple, shadow: 'rgba(124,58,237,0.35)', light: 'rgba(124,58,237,0.12)', label: 'Coordenador' },
  supervisor: { bg: colors.primary, shadow: 'rgba(37,99,235,0.35)', light: 'rgba(37,99,235,0.12)', label: 'Supervisor' },
  attendant: { bg: colors.success, shadow: 'rgba(16,185,129,0.35)', light: 'rgba(16,185,129,0.12)', label: 'Atendente' },
  growthteam: { bg: colors.warning, shadow: 'rgba(245,158,11,0.35)', light: 'rgba(245,158,11,0.12)', label: 'Growth' },
  growth_team: { bg: colors.warning, shadow: 'rgba(245,158,11,0.35)', light: 'rgba(245,158,11,0.12)', label: 'Growth' },
  default: { bg: colors.primary, shadow: 'rgba(37,99,235,0.35)', light: 'rgba(37,99,235,0.12)', label: 'Usuario' },
};

export default function LayoutGlobal({
  children,
  userData,
  menuItems = [],
  activeTab,
  onTabChange,
  onLogout,
  extraFooter,
  appName = DEFAULT_APP_NAME,
  logoUrl = DEFAULT_LOGO_URL,
  preferences = null,
  onPreferenceChange,
}) {
  const [collapsed, setCollapsed] = useState(() => Boolean(preferences?.sidebarCollapsed));
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return preferences?.theme || 'light';
    }
    return window.localStorage.getItem('oquei-theme') || preferences?.theme || 'light';
  });
  const [busca, setBusca] = useState('');
  const [openSecs, setOpenSecs] = useState({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [radarOpen, setRadarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const notifRef = useRef(null);

  const density = preferences?.density || 'comfortable';
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_OPEN;
  const contentPadding = density === 'compact' ? '24px' : '32px';
  const contentGap = density === 'compact' ? '20px' : '28px';
  const contentMaxWidth = density === 'compact' ? '1680px' : '1600px';
  const topbarPadding = density === 'compact' ? '0 20px' : '0 28px';
  const searchContainerPadding = density === 'compact' ? '8px 10px 6px' : '10px 12px 8px';

  const persistPreference = (patch) => {
    if (typeof onPreferenceChange === 'function') {
      Promise.resolve(onPreferenceChange(patch)).catch(() => {});
    }
  };

  useEffect(() => {
    window.showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-density', density);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('oquei-theme', theme);
    }
  }, [density, theme]);

  useEffect(() => {
    if (preferences?.theme && preferences.theme !== theme) {
      setTheme(preferences.theme);
    }
  }, [preferences?.theme, theme]);

  useEffect(() => {
    if (typeof preferences?.sidebarCollapsed === 'boolean' && preferences.sidebarCollapsed !== collapsed) {
      setCollapsed(preferences.sidebarCollapsed);
    }
  }, [preferences?.sidebarCollapsed, collapsed]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const groupedMenu = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const section = item.section || 'Geral';
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    }, {});
  }, [menuItems]);

  useEffect(() => {
    const nextSections = {};
    Object.keys(groupedMenu).forEach((section) => {
      nextSections[section] = openSecs[section] ?? true;
    });
    setOpenSecs(nextSections);
  }, [groupedMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) {
      return null;
    }

    return menuItems.filter((item) => item.label.toLowerCase().includes(busca.toLowerCase()));
  }, [busca, menuItems]);

  const role = normalizeRole(userData?.role) || 'default';
  const profileTone = PERFIL_CORES[role] || PERFIL_CORES.default;
  const activeItem = menuItems.find((item) => item.id === activeTab);
  const activeSection = activeItem?.section || '';

  const notifications = [
    { id: 1, tipo: 'alerta', msg: 'Meta de vendas abaixo de 70%', tempo: '5 min' },
    { id: 2, tipo: 'ok', msg: 'Relatorio de marco disponivel', tempo: '1h' },
    { id: 3, tipo: 'info', msg: 'Novo comunicado publicado', tempo: '2h' },
  ];

  const notificationColors = {
    alerta: colors.warning,
    ok: colors.success,
    info: colors.primary,
  };

  const notificationIcons = {
    alerta: AlertCircle,
    ok: CheckCircle2,
    info: Info,
  };

  const iconBtn = (extra = {}) => ({
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    background: isActive ? profileTone.light : 'transparent',
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
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: profileTone.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '13px',
    fontWeight: '900',
    color: '#ffffff',
    boxShadow: `0 2px 8px ${profileTone.shadow}`,
  };

  const fade = {
    overflow: 'hidden',
    opacity: collapsed ? 0 : 1,
    maxWidth: collapsed ? 0 : '200px',
    transition: 'opacity 0.15s, max-width 0.25s',
    whiteSpace: 'nowrap',
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      persistPreference({ theme: nextTheme });
      return nextTheme;
    });
  };

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const nextValue = !prev;
      persistPreference({ sidebarCollapsed: nextValue });
      return nextValue;
    });
  };

  const handleMenuClick = (moduleId) => {
    onTabChange(moduleId);
    setBusca('');
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <aside
        style={{
          width: `${sidebarW}px`,
          minWidth: `${sidebarW}px`,
          backgroundColor: 'var(--bg-panel)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          zIndex: 100,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: `${TOPBAR_H}px`,
            padding: collapsed ? '0 16px' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              flexShrink: 0,
              background: logoUrl ? 'transparent' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: logoUrl ? 'none' : '0 4px 12px rgba(37,99,235,0.4)',
              overflow: 'hidden',
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '9px' }}
              />
            ) : (
              <Zap size={17} color="#ffffff" fill="#ffffff" />
            )}
          </div>
          <span
            style={{
              ...fade,
              fontWeight: '900',
              color: 'var(--text-main)',
              fontSize: '16px',
              letterSpacing: '-0.5px',
            }}
          >
            {appName || DEFAULT_APP_NAME}
          </span>
        </div>

        {!collapsed && (
          <div
            style={{
              padding: searchContainerPadding,
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '7px 11px',
              }}
            >
              <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  fontFamily: "'Manrope', sans-serif",
                }}
                placeholder="Buscar pagina..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
              {busca ? (
                <button
                  onClick={() => setBusca('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={12} color="var(--text-muted)" />
                </button>
              ) : null}
            </div>
          </div>
        )}

        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: collapsed ? '8px 6px' : '8px 10px',
          }}
          className="hide-scrollbar"
        >
          {resultadosBusca !== null ? (
            <div>
              {resultadosBusca.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 8px' }}>
                  Nenhuma pagina encontrada
                </p>
              ) : (
                resultadosBusca.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    style={navBtn(activeTab === item.id)}
                    onMouseEnter={(event) => {
                      if (activeTab !== item.id) event.currentTarget.style.background = 'var(--bg-app)';
                    }}
                    onMouseLeave={(event) => {
                      if (activeTab !== item.id) event.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {activeTab === item.id ? (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '3px',
                          height: '18px',
                          borderRadius: '0 4px 4px 0',
                          backgroundColor: 'var(--text-brand)',
                        }}
                      />
                    ) : null}
                    <item.icon size={18} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>{item.label}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            Object.entries(groupedMenu).map(([section, items]) => (
              <div key={section} style={{ marginBottom: '4px' }}>
                {!collapsed ? (
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: '900',
                      color: 'var(--text-muted)',
                      padding: '10px 8px 5px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderRadius: '8px',
                    }}
                    onClick={() => setOpenSecs((prev) => ({ ...prev, [section]: !prev[section] }))}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'var(--bg-app)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{section}</span>
                    <ChevronDown
                      size={11}
                      style={{
                        transition: 'transform 0.2s',
                        transform: openSecs[section] ? 'rotate(0deg)' : 'rotate(-90deg)',
                      }}
                    />
                  </div>
                ) : null}

                {(collapsed || openSecs[section] !== false) &&
                  items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      title={collapsed ? item.label : undefined}
                      style={navBtn(activeTab === item.id)}
                      onMouseEnter={(event) => {
                        if (activeTab !== item.id) event.currentTarget.style.background = 'var(--bg-app)';
                      }}
                      onMouseLeave={(event) => {
                        if (activeTab !== item.id) event.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {activeTab === item.id ? (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3px',
                            height: '18px',
                            borderRadius: '0 4px 4px 0',
                            backgroundColor: 'var(--text-brand)',
                          }}
                        />
                      ) : null}
                      <item.icon size={18} style={{ flexShrink: 0 }} />
                      <span style={{ ...fade, fontSize: '13px', fontWeight: '600' }}>{item.label}</span>
                    </button>
                  ))}
              </div>
            ))
          )}
        </nav>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: collapsed ? '12px 8px' : '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {collapsed ? (
            <button
              onClick={onLogout}
              title="Sair"
              style={{ ...iconBtn({ color: colors.danger }), width: '100%', justifyContent: 'center' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={18} />
            </button>
          ) : (
            <>
              <div style={avatar}>{userData?.name?.[0]?.toUpperCase() || 'U'}</div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userData?.name || 'Usuario'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{profileTone.label}</div>
              </div>
              <button
                onClick={onLogout}
                title="Sair"
                style={iconBtn({ color: colors.danger })}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut size={17} />
              </button>
            </>
          )}
        </div>

        {!collapsed && extraFooter ? (
          <div style={{ padding: '0 10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>{extraFooter}</div>
        ) : null}

        <button
          onClick={toggleSidebar}
          style={{
            position: 'absolute',
            top: '80px',
            right: '10px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            zIndex: 101,
            boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
            transition: 'background 0.15s, color 0.15s, transform 0.15s',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'var(--bg-app)';
            event.currentTarget.style.color = 'var(--text-main)';
            event.currentTarget.style.transform = 'translateX(0)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'var(--bg-panel)';
            event.currentTarget.style.color = 'var(--text-muted)';
            event.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header
          style={{
            height: `${TOPBAR_H}px`,
            minHeight: `${TOPBAR_H}px`,
            padding: topbarPadding,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-panel)',
            zIndex: 90,
            flexShrink: 0,
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
            {activeSection ? (
              <>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {activeSection}
                </span>
                <ChevronRight size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </>
            ) : null}
            <span
              style={{
                fontSize: '13px',
                fontWeight: '900',
                color: 'var(--text-main)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              {activeItem?.label || 'Dashboard'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              style={iconBtn()}
              onClick={toggleTheme}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--bg-app)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
              }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                style={{ ...iconBtn(), position: 'relative' }}
                onClick={() => setNotifOpen((prev) => !prev)}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--bg-app)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                }}
              >
                <Bell size={18} />
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: colors.danger,
                    border: '2px solid var(--bg-panel)',
                  }}
                />
              </button>

              {notifOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '46px',
                    width: '290px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    zIndex: 999,
                  }}
                >
                  <div
                    style={{
                      padding: '13px 16px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Notificacoes</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{notifications.length} novas</span>
                  </div>
                  {notifications.map((notification) => {
                    const Icon = notificationIcons[notification.tipo];
                    return (
                      <div
                        key={notification.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '11px',
                          padding: '11px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.background = 'var(--bg-app)';
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon size={14} color={notificationColors[notification.tipo]} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: 0, lineHeight: 1.45 }}>{notification.msg}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0' }}>ha {notification.tempo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              style={iconBtn()}
              onClick={() => setRadarOpen((prev) => !prev)}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--bg-app)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
              }}
            >
              <Activity size={18} />
            </button>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 6px', flexShrink: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'default' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{userData?.name || 'Usuario'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {profileTone.label}
                </div>
              </div>
              <div style={avatar}>{userData?.name?.[0]?.toUpperCase() || 'U'}</div>
              <button
                onClick={onLogout}
                title="Sair"
                style={iconBtn({ color: colors.danger })}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-app)' }} className="custom-scrollbar">
          <div
            style={{
              width: '100%',
              maxWidth: contentMaxWidth,
              margin: '0 auto',
              padding: contentPadding,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: contentGap,
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            {children}
          </div>
        </div>
      </main>

      <RadarLive isOpen={radarOpen} onClose={() => setRadarOpen(false)} userData={userData} />

      {toast.show ? (
        <div
          style={{
            position: 'fixed',
            top: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.97)',
            border: `1px solid ${toast.type === 'error' ? colors.danger : colors.primary}`,
            padding: '11px 22px',
            borderRadius: '50px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={15} color={colors.success} />
          ) : (
            <AlertCircle size={15} color={colors.danger} />
          )}
          <span style={{ fontWeight: '700', fontSize: '13px' }}>{toast.message}</span>
        </div>
      ) : null}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
