import React from 'react';
import { 
  Globe, Zap, PhoneCall, BarChart3, Database, FileText, 
  Monitor, Video, Shield, Users, Link as LinkIcon, BookOpen,
  ExternalLink, LayoutGrid
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

// O segredo do Dark Mode: Passamos o HEX e geramos a opacidade direto no CSS style
const AVAILABLE_ICONS = {
  Globe: { icon: Globe, color: '#0ea5e9' },
  Zap: { icon: Zap, color: '#f59e0b' },
  PhoneCall: { icon: PhoneCall, color: '#2563eb' },
  BarChart3: { icon: BarChart3, color: '#db2777' },
  Database: { icon: Database, color: '#7c3aed' },
  FileText: { icon: FileText, color: '#64748b' },
  Monitor: { icon: Monitor, color: '#10b981' },
  Video: { icon: Video, color: '#ef4444' },
  Shield: { icon: Shield, color: '#ea580c' },
  Users: { icon: Users, color: '#4f46e5' },
  BookOpen: { icon: BookOpen, color: '#0284c7' },
  LinkIcon: { icon: LinkIcon, color: '#94a3b8' }
};

// =========================================================================
// LISTA DE LINKS FIXOS (Altere aqui para adicionar/remover da plataforma)
// =========================================================================
const STATIC_LINKS = [
  { 
    id: '1', 
    title: 'Integrador Oquei', 
    description: 'Sistemas e ferramentas internas da operação.', 
    url: 'https://integrador.oquei.com.br/login', 
    iconName: 'Zap' 
  },
  { 
    id: '2', 
    title: 'Painel Analítica 3M', 
    description: 'Relatórios de performance e dashboards de vendas.', 
    url: 'https://oquei.analitica3m.com.br/', 
    iconName: 'BarChart3' 
  },
  { 
    id: '3', 
    title: 'Wiki Oquei', 
    description: 'Base de conhecimento, regras e manuais de processos.', 
    url: 'http://wiki.oquei.com.br/', 
    iconName: 'Globe' 
  },
  { 
    id: '4', 
    title: 'Ponto Sólides', 
    description: 'Portal do colaborador para marcação de ponto e RH.', 
    url: 'https://app.solides.com.br/', 
    iconName: 'Users' 
  },
  { 
    id: '5', 
    title: 'Tangerino', 
    description: 'Sistema alternativo de gestão de jornada de trabalho.', 
    url: 'https://app.tangerino.com.br/', 
    iconName: 'Clock' 
  }
];

export default function LinksUteis() {
  
  return (
    <div style={global.container}>
      
      {/* CABEÇALHO */}
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{...(global.iconHeader || {}), background: '#0f172a'}}>
            <LayoutGrid size={28} color="white"/>
          </div>
          <div>
            <h1 style={global.title}>Links Úteis</h1>
            <p style={global.subtitle}>Acesse rapidamente as principais ferramentas da Oquei.</p>
          </div>
        </div>
      </div>

      {/* GRID DE LINKS */}
      <div style={global.gridCards}>
        {STATIC_LINKS.map(link => {
          const IconData = AVAILABLE_ICONS[link.iconName] || AVAILABLE_ICONS['LinkIcon'];
          const IconComponent = IconData.icon;

          return (
            <div key={link.id} style={{...(global.card || {}), display: 'flex', flexDirection: 'column'}}>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px'}}>
                {/* Fundo com 20% de opacidade da cor principal para suportar Dark Mode */}
                <div style={{ padding: '14px', borderRadius: '14px', background: `${IconData.color}20`, color: IconData.color }}>
                  <IconComponent size={24} />
                </div>
              </div>
              
              <h3 style={{fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0'}}>
                {link.title}
              </h3>
              <p style={{fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 24px 0', flex: 1, lineHeight: '1.5'}}>
                {link.description}
              </p>
              
              <button 
                onClick={() => window.open(link.url, '_blank')} 
                style={{ 
                  width: '100%', border: 'none', padding: '12px', borderRadius: '12px', 
                  fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', 
                  justifyContent: 'center', alignItems: 'center', gap: '8px', 
                  color: IconData.color, background: `${IconData.color}15`, transition: 'filter 0.2s' 
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
              >
                Acessar Plataforma <ExternalLink size={16} />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}