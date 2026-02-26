import React, { useState } from 'react';
import { ChevronDown, ChevronRight, LogOut, Settings } from 'lucide-react';

export default function LayoutGlobal({ 
  children,       // O conteúdo principal que vai aparecer no meio (ex: PainelVendas)
  userData,       // Dados do utilizador logado
  onLogout,       // Função para sair
  menuItems,      // Array com os botões do menu (dinâmico para cada perfil)
  activeTab,      // O separador que está selecionado atualmente
  onTabChange     // Função que muda o separador
}) {
  // Estado para controlar quais menus com submenus estão abertos (Acordeão)
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (menuId) => {
    setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const handleSubmenuClick = (parentId, sectionId) => {
    // Muda para o separador principal primeiro
    if (activeTab !== parentId) {
      onTabChange(parentId);
    }
    // Aguarda a renderização e faz o scroll suave até ao ID do gráfico
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const y = element.getBoundingClientRect().top + window.scrollY - 30;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div style={styles.layout}>
      
      {/* --- BARRA LATERAL MASTER --- */}
      <aside style={styles.sidebar}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>🚀</div>
          <h1 style={styles.logoText}>CRM <span style={{color: '#2563eb'}}>Pro</span></h1>
        </div>

        <nav style={styles.navMenu}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const hasSubmenus = item.submenus && item.submenus.length > 0;
            const isOpen = openMenus[item.id] || false;

            return (
              <div key={item.id} style={styles.menuWrapper}>
                <button 
                  style={isActive ? styles.menuItemActive : styles.menuItem}
                  onClick={() => {
                    onTabChange(item.id);
                    if (hasSubmenus) toggleMenu(item.id);
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </div>
                  {hasSubmenus && (
                    isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </button>

                {/* Renderização condicional dos Submenus */}
                {hasSubmenus && (isOpen || isActive) && (
                  <div style={styles.submenuContainer}>
                    {item.submenus.map((sub) => (
                      <button 
                        key={sub.id} 
                        style={styles.submenuItem}
                        onClick={() => handleSubmenuClick(item.id, sub.id)}
                      >
                        <sub.icon size={14} style={{color: '#94a3b8'}} />
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé Dinâmico do Utilizador */}
        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{userData?.name || 'Utilizador'}</span>
              <span style={styles.userRole}>{userData?.role || 'Acesso Restrito'}</span>
            </div>
          </div>
          <div style={styles.footerActions}>
            <button style={styles.iconButton} title="Definições"><Settings size={18} /></button>
            <button style={styles.iconButtonLogout} onClick={onLogout} title="Terminar Sessão"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>

      {/* --- ÁREA DE CONTEÚDO (Onde as páginas são injetadas) --- */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          {children}
        </div>
      </main>

    </div>
  );
}

// ESTILOS GLOBAIS DA ESTRUTURA
const styles = {
  layout: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f8fafc', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  sidebar: { width: '280px', minWidth: '280px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', zIndex: 10, boxShadow: '4px 0 20px rgba(0,0,0,0.02)' },
  logoArea: { padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' },
  logoIcon: { background: '#eff6ff', padding: '10px', borderRadius: '12px', fontSize: '18px' },
  logoText: { fontSize: '20px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  
  navMenu: { flex: 1, padding: '24px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
  menuWrapper: { display: 'flex', flexDirection: 'column' },
  menuItem: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' },
  menuItemActive: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#eff6ff', border: 'none', color: '#2563eb', fontSize: '14px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.05)' },
  
  submenuContainer: { display: 'flex', flexDirection: 'column', paddingLeft: '40px', marginTop: '4px', gap: '4px', animation: 'fadeIn 0.3s ease-out' },
  submenuItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' },
  
  sidebarFooter: { padding: '20px 16px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fcfcfc' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  userAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px' },
  userDetails: { display: 'flex', flexDirection: 'column' },
  userName: { fontSize: '13px', fontWeight: '800', color: '#1e293b' },
  userRole: { fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  footerActions: { display: 'flex', gap: '8px' },
  iconButton: { flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', backgroundColor: 'white', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', transition: '0.2s' },
  iconButtonLogout: { flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', transition: '0.2s' },

  mainContent: { flex: 1, overflowY: 'auto', position: 'relative' },
  contentWrapper: { padding: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }
};