import React, { useState, useEffect } from 'react';
import { ChevronRight, LogOut, Menu, Zap, Bell, ChevronDown, Settings, UserCircle, Moon, Sun } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function LayoutGlobal({ 
  children,       
  userData,       
  onLogout,       
  menuItems = [],      
  activeTab,      
  onTabChange     
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [theme, setTheme] = useState(() => localStorage.getItem('oquei_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('oquei_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // NOVA PALETA: Azul predominante, Verde para Sucesso, Cinza para neutros.
  const accentColors = {
    primary: '#2563eb', // Azul Royal (Blue 600)
    success: '#10b981', // Verde Esmeralda (Emerald 500)
    warning: '#f59e0b', // Amarelo/Laranja para alertas mantido
    neutral: '#64748b', // Cinza Azulado (Slate 500)
  };

  const getRoleConfig = () => {
    const role = userData?.role?.toLowerCase() || 'guest';
    if (role === 'coordinator' || role === 'coordenador') 
      return { color: accentColors.primary, title: 'MASTER', sub: 'OQUEI TELECOM' };
    if (role === 'supervisor') 
      return { color: accentColors.primary, title: 'GESTÃO', sub: 'OQUEI TELECOM' };
    return { color: accentColors.success, title: 'VENDAS', sub: 'OQUEI TELECOM' };
  };

  const roleConfig = getRoleConfig();

  return (
    <Tooltip.Provider delayDuration={100}>
      <div style={{...styles.layout, backgroundColor: 'var(--bg-app)', color: 'var(--text-main)'}}>
        
        {/* SIDEBAR */}
        <aside 
          className="hide-scrollbar"
          style={{ 
            ...styles.sidebar, 
            width: isSidebarOpen ? '260px' : '72px',
            backgroundColor: 'var(--bg-panel)',
            borderColor: 'var(--border)' 
          }}
        >
          <div style={{...styles.logoArea, borderColor: 'var(--border)'}}>
            <div style={{ color: roleConfig.color, filter: `drop-shadow(0 0 10px ${roleConfig.color}40)` }}>
              <Zap size={22} fill="currentColor" />
            </div>
            {isSidebarOpen && (
              <div style={{ marginLeft: '12px' }}>
                <h1 style={{...styles.logoText, color: 'var(--text-main)'}}>{roleConfig.title}</h1>
                <p style={{...styles.logoSub, color: 'var(--text-muted)'}}>{roleConfig.sub}</p>
              </div>
            )}
          </div>

          <nav style={styles.navMenu}>
            {menuItems.map((item, index) => {
              const isActive = activeTab === item.id;
              const showHeader = isSidebarOpen && (index === 0 || menuItems[index - 1].section !== item.section);
              const itemColor = item.color || roleConfig.color;

              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {showHeader && item.section && (
                    <div style={{...styles.sectionLabel, color: 'var(--text-muted)'}}>{item.section}</div>
                  )}
                  
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button 
                        onClick={() => item.url ? window.open(item.url, '_blank') : onTabChange(item.id)}
                        style={{
                          ...styles.menuItem,
                          backgroundColor: isActive ? 'var(--bg-primary-light)' : 'transparent',
                          color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <item.icon size={18} color={isActive ? itemColor : 'var(--text-muted)'} strokeWidth={isActive ? 2.5 : 2} />
                          {isSidebarOpen && <span style={{ fontWeight: isActive ? '700' : '500', fontSize: '13px' }}>{item.label}</span>}
                        </div>
                        {isActive && <div style={{ ...styles.activeIndicator, backgroundColor: itemColor }} />}
                        {isSidebarOpen && item.badge > 0 && <span style={{...styles.badge, backgroundColor: 'var(--border)', color: 'var(--text-main)'}}>{item.badge}</span>}
                      </button>
                    </Tooltip.Trigger>
                    {!isSidebarOpen && (
                      <Tooltip.Portal>
                        <Tooltip.Content style={{...styles.tooltip, backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border)'}} side="right" sideOffset={10}>
                          {item.label}
                          <Tooltip.Arrow style={{fill: 'var(--bg-card)'}} />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    )}
                  </Tooltip.Root>
                </div>
              );
            })}
          </nav>

          <div style={{...styles.sidebarFooter, borderColor: 'var(--border)'}}>
            <button onClick={onLogout} style={styles.logoutBtn}>
              <LogOut size={18} color="var(--text-muted)" />
              {isSidebarOpen && <span style={{...styles.logoutText, color: 'var(--text-muted)'}}>Encerrar Sessão</span>}
            </button>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL */}
        <main style={styles.mainContent}>
          <header style={{...styles.header, backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.iconBtn}>
                <Menu size={20} color="var(--text-muted)" />
              </button>
              <div style={styles.breadcrumb}>
                <span style={{ color: 'var(--text-muted)' }}>Módulo</span> 
                <ChevronRight size={14} color="var(--border)" /> 
                <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{roleConfig.title}</span>
                <ChevronRight size={14} color="var(--border)" /> 
                <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>
                  {menuItems.find(i => i.id === activeTab)?.label || 'Visão Geral'}
                </span>
              </div>
            </div>
            
            <div style={styles.userInfo}>
              <div style={{...styles.headerActions, borderColor: 'var(--border)'}}>
                <Bell size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
              </div>
              
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <div style={{...styles.userBadge, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)'}}>
                    <div style={{...styles.userInitial, backgroundColor: 'var(--bg-primary-light)', color: 'var(--text-brand)'}}>{userData?.name?.[0] || 'U'}</div>
                    <span style={{...styles.userNameHeader, color: 'var(--text-main)'}}>{userData?.name?.split(' ')[0]}</span>
                    <ChevronDown size={14} color="var(--text-muted)" />
                  </div>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content style={{...styles.dropdownMenu, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)'}} sideOffset={8} align="end">
                    <DropdownMenu.Label style={{...styles.dropdownLabel, color: 'var(--text-muted)'}}>Minha Conta</DropdownMenu.Label>
                    <DropdownMenu.Item style={{...styles.dropdownItem, color: 'var(--text-main)'}}>
                      <UserCircle size={16} color="var(--text-muted)"/> Ver Perfil
                    </DropdownMenu.Item>
                    
                    <DropdownMenu.Item onClick={toggleTheme} style={{...styles.dropdownItem, color: 'var(--text-main)'}}>
                      {theme === 'light' ? <Moon size={16} color="var(--text-muted)"/> : <Sun size={16} color="var(--text-muted)"/>} 
                      Mudar para {theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator style={{height: '1px', backgroundColor: 'var(--border)', margin: '5px 0'}} />
                    <DropdownMenu.Item onClick={onLogout} style={{...styles.dropdownItem, color: '#ef4444'}}>
                      <LogOut size={16} /> Sair do Sistema
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </header>

          <div style={styles.contentScroll} className="hide-scrollbar legacy-normalizer">
            <div style={styles.contentWrapper}>
              {children}
            </div>
          </div>
        </main>

        <style>{`
          /* PALETA AZUL, BRANCO, VERDE E CINZA */
          :root, [data-theme="light"] {
            --bg-app: #f8fafc;        /* Slate 50 - Cinza quase branco */
            --bg-panel: #ffffff;      /* Branco Puro */
            --bg-card: #ffffff;       /* Branco Puro */
            --border: #e2e8f0;        /* Slate 200 - Borda cinza suave */
            --text-main: #0f172a;     /* Slate 900 - Quase preto, mais elegante */
            --text-muted: #64748b;    /* Slate 500 - Cinza texto neutro */
            --text-brand: #2563eb;    /* Blue 600 - Azul Oquei */
            
            --bg-badge: #f1f5f9;      /* Slate 100 */
            --text-badge: #334155;    /* Slate 700 */
            
            --bg-primary-light: #eff6ff; /* Blue 50 */
            --bg-success-light: #ecfdf5; /* Emerald 50 */
            --bg-danger-light: #fef2f2;  /* Red 50 */
            --border-success: #a7f3d0;   /* Emerald 200 */
            --border-danger: #fecaca;    /* Red 200 */
            
            --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03);
          }
          
          [data-theme="dark"] {
            --bg-app: #020617;        /* Slate 950 - Fundo Azul Marinho muito escuro */
            --bg-panel: #0f172a;      /* Slate 900 - Menu Azul Marinho escuro */
            --bg-card: #1e293b;       /* Slate 800 - Cards Azul Marinho médio */
            --border: #334155;        /* Slate 700 - Bordas sutis no escuro */
            --text-main: #f8fafc;     /* Slate 50 - Texto Branco */
            --text-muted: #94a3b8;    /* Slate 400 - Texto Cinza claro */
            --text-brand: #60a5fa;    /* Blue 400 - Azul mais claro pro escuro */
            
            --bg-badge: #0f172a;      /* Slate 900 */
            --text-badge: #cbd5e1;    /* Slate 300 */
            
            --bg-primary-light: rgba(37, 99, 235, 0.15);
            --bg-success-light: rgba(16, 185, 129, 0.1);
            --bg-danger-light: rgba(239, 68, 68, 0.1);
            --border-success: rgba(16, 185, 129, 0.2);
            --border-danger: rgba(239, 68, 68, 0.2);
            
            --shadow-sm: none;
          }
          
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          /* NORMALIZADOR AGRESSIVO */
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: rgb(255, 255, 255)"],
          [data-theme="dark"] .legacy-normalizer *[style*="background: rgb(255, 255, 255)"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: white"],
          [data-theme="dark"] .legacy-normalizer *[style*="background: white"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: #ffffff"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: #fff"],
          [data-theme="dark"] .legacy-normalizer *[style*="background: #ffffff"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: rgb(248, 250, 252)"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: #f8fafc"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: rgb(241, 245, 249)"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: #f1f5f9"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: rgb(250, 250, 250)"],
          [data-theme="dark"] .legacy-normalizer *[style*="background-color: #fafafa"] {
            background-color: var(--bg-card) !important;
            border-color: var(--border) !important;
            box-shadow: none !important;
          }

          [data-theme="dark"] .legacy-normalizer *[style*="color: rgb(15, 23, 42)"],
          [data-theme="dark"] .legacy-normalizer *[style*="color: #0f172a"],
          [data-theme="dark"] .legacy-normalizer *[style*="color: black"],
          [data-theme="dark"] .legacy-normalizer *[style*="color: #000"],
          [data-theme="dark"] .legacy-normalizer *[style*="color: rgb(0, 0, 0)"] {
            color: var(--text-main) !important;
          }

          [data-theme="dark"] .legacy-normalizer *[style*="color: rgb(71, 85, 105)"],
          [data-theme="dark"] .legacy-normalizer *[style*="color: #475569"],
          [data-theme="dark"] .legacy-normalizer *[style*="color: rgb(100, 116, 139)"],
          [data-theme="dark"] .legacy-normalizer *[style*="color: #64748b"] {
            color: var(--text-muted) !important;
          }

          [data-theme="dark"] .legacy-normalizer *[style*="border-color: rgb(226, 232, 240)"],
          [data-theme="dark"] .legacy-normalizer *[style*="border: 1px solid rgb(226, 232, 240)"],
          [data-theme="dark"] .legacy-normalizer *[style*="border-color: #e2e8f0"],
          [data-theme="dark"] .legacy-normalizer *[style*="border-color: rgb(241, 245, 249)"],
          [data-theme="dark"] .legacy-normalizer *[style*="border-color: #f1f5f9"] {
            border-color: var(--border) !important;
          }

          [data-theme="dark"] .legacy-normalizer h1, 
          [data-theme="dark"] .legacy-normalizer h2, 
          [data-theme="dark"] .legacy-normalizer h3, 
          [data-theme="dark"] .legacy-normalizer h4,
          [data-theme="dark"] .legacy-normalizer strong,
          [data-theme="dark"] .legacy-normalizer b { color: var(--text-main) !important; }
          
          [data-theme="dark"] .legacy-normalizer p, 
          [data-theme="dark"] .legacy-normalizer label,
          [data-theme="dark"] .legacy-normalizer small { color: var(--text-muted) !important; }
          
          [data-theme="dark"] .legacy-normalizer input, 
          [data-theme="dark"] .legacy-normalizer select, 
          [data-theme="dark"] .legacy-normalizer textarea {
            background-color: var(--bg-app) !important; 
            color: var(--text-main) !important; 
            border: 1px solid var(--border) !important;
          }

          [data-theme="dark"] .legacy-normalizer table { color: var(--text-main) !important; }
          [data-theme="dark"] .legacy-normalizer th { background-color: var(--bg-panel) !important; color: var(--text-muted) !important; border-bottom: 1px solid var(--border) !important; }
          [data-theme="dark"] .legacy-normalizer tr { border-bottom: 1px solid var(--border) !important; }
          [data-theme="dark"] .legacy-normalizer td { color: var(--text-main) !important; }
        `}</style>
      </div>
    </Tooltip.Provider>
  );
}

const styles = {
  layout: { display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  sidebar: { display: 'flex', flexDirection: 'column', zIndex: 100, transition: 'width 0.2s', borderRight: '1px solid' },
  logoArea: { padding: '0 24px', display: 'flex', alignItems: 'center', height: '65px', flexShrink: 0, borderBottom: '1px solid' },
  logoText: { fontSize: '14px', fontWeight: '800', margin: 0, letterSpacing: '0.05em' },
  logoSub: { fontSize: '9px', fontWeight: '700', margin: 0, letterSpacing: '0.05em' },
  navMenu: { flex: 1, padding: '20px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' },
  sectionLabel: { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '20px 0 8px 12px' },
  menuItem: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: 'none', cursor: 'pointer', borderRadius: '6px', transition: '0.2s', position: 'relative', outline: 'none' },
  activeIndicator: { position: 'absolute', left: '-12px', height: '18px', width: '2px', borderRadius: '0 2px 2px 0' },
  badge: { padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' },
  sidebarFooter: { padding: '12px', flexShrink: 0, borderTop: '1px solid' },
  logoutBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' },
  logoutText: { fontSize: '13px', fontWeight: '600' },
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, zIndex: 10, borderBottom: '1px solid' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', textTransform: 'uppercase' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
  headerActions: { paddingRight: '20px', borderRight: '1px solid', display: 'flex', alignItems: 'center' },
  userBadge: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', outline: 'none' },
  userInitial: { width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' },
  userNameHeader: { fontSize: '13px', fontWeight: '600' },
  dropdownMenu: { minWidth: '200px', borderRadius: '12px', padding: '8px', boxShadow: '0 10px 38px -10px rgba(0,0,0,0.3)', zIndex: 200, outline: 'none' },
  dropdownLabel: { padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' },
  dropdownItem: { width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px', textAlign: 'left', outline: 'none' },
  contentScroll: { flex: 1, overflowY: 'auto', padding: '32px' },
  contentWrapper: { maxWidth: '1400px', margin: '0 auto', width: '100%' },
  tooltip: { padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', zIndex: 1000 }
};