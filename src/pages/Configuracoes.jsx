import React, { useState } from 'react';
import { Target, Database, History, Users, Settings } from 'lucide-react';
import { styles as global, colors } from '../styles/globalStyles';

// Importação dos Componentes Satélites (direto da subpasta)
import ConfigMetas from './configuracoes/ConfigMetas';
import ConfigBaseAtiva from './configuracoes/ConfigBaseAtiva';
import ConfigHistorico from './configuracoes/ConfigHistorico';

export default function Configuracoes({ userData }) {
  const [activeTab, setActiveTab] = useState('metas');

  const menuItems = [
    { id: 'metas', label: 'Metas Diretoria', icon: Target },
    { id: 'base', label: 'Base de Clientes', icon: Database },
    { id: 'historico', label: 'Lançar Histórico', icon: History },
    { id: 'usuarios', label: 'Gestão Acessos', icon: Users },
  ];

  return (
    <div style={{...global.container, padding: '20px'}}>
      <div style={local.layout}>
        {/* SIDEBAR PERSISTENTE */}
        <aside style={local.sidebar}>
          <div style={local.sideTitle}>Configurações S&OP</div>
          {menuItems.map(item => (
            <button 
              key={item.id}
              style={activeTab === item.id ? local.sideBtnActive : local.sideBtn} 
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={18}/> {item.label}
            </button>
          ))}
        </aside>

        {/* ÁREA DE CONTEÚDO DINÂMICA (Renderiza os satélites) */}
        <main style={local.main}>
          {activeTab === 'metas' && <ConfigMetas userData={userData} />}
          {activeTab === 'base' && <ConfigBaseAtiva userData={userData} />}
          {activeTab === 'historico' && <ConfigHistorico userData={userData} />}
          {activeTab === 'usuarios' && (
            <div className="animated-view" style={local.panel}>
              <h2 style={{fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Users size={24} color={colors.primary} /> Gestão de Acessos
              </h2>
              <p style={{color: 'var(--text-muted)'}}>Módulo de permissões em desenvolvimento.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ESTILOS LOCAIS DO LAYOUT
const local = {
  layout: { display: 'flex', gap: '30px' },
  sidebar: { width: '250px', background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', display:'flex', flexDirection:'column', gap:'8px', height: 'fit-content' },
  sideTitle: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '12px' },
  sideBtn: { padding:'12px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', color:'var(--text-main)', cursor:'pointer', fontWeight:'600', background:'transparent', border:'none', width:'100%', textAlign:'left', transition: '0.2s' },
  sideBtnActive: { padding:'12px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', color:'white', background:colors.primary, fontWeight:'800', border:'none', width:'100%', textAlign:'left', boxShadow:'0 4px 10px rgba(37,99,235,0.2)' },
  main: { flex: 1 },
  panel: { background:'var(--bg-panel)', padding:'30px', borderRadius:'24px', border:'1px solid var(--border)' }
};