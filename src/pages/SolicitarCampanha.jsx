import React from 'react';
import { 
  Megaphone, Info, ExternalLink, Clock, 
  ListChecks, Flame, MessageCircle 
} from 'lucide-react';
import { colors } from '../styles/globalStyles';

export default function SolicitarCampanha() {
  
  // 👉 LINK OFICIAL DA OQUEI TELECOM
  const formUrl = "http://oferta.oquei.com.br/briefing-interno"; 

  return (
    <div style={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column' }} className="animated-view">

      {/* ── Cabeçalho padrão Oquei Gestão ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(245,158,11,0.35)',
          }}>
            <Megaphone size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Solicitar Campanha
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Envie o briefing da campanha para a equipe de marketing · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* AVISO RÁPIDO */}
      <div style={styles.alertBox}>
        <Info size={16} color={colors?.primary || '#3b82f6'} style={{ flexShrink: 0 }} />
        <span>Certifique-se de preencher todos os detalhes do briefing com atenção para garantir a agilidade da equipe de Marketing na entrega.</span>
      </div>

      {/* BANNER DE AÇÃO COMPACTO */}
      <div style={styles.actionBanner}>
        <div>
          <h3 style={styles.bannerTitle}>Pronto para iniciar?</h3>
          <p style={styles.bannerDesc}>Acesse o ambiente seguro para preencher o seu briefing.</p>
        </div>
        
        <a 
          href={formUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="cta-button"
          style={styles.mainCtaBtn}
        >
          <ExternalLink size={18} /> Abrir Formulário Oficial
        </a>
      </div>
      
      {/* DIRETRIZES DE ATENDIMENTO (SLA) */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={styles.sectionHeader}>Diretrizes de Atendimento e Prazos (SLA)</h3>
        
        <div style={styles.guidelinesGrid}>
          
          {/* Card 1: Prazo de Entrega */}
          <div style={styles.guideCard}>
            <div style={{...styles.guideIcon, color: colors?.primary || '#3b82f6', background: '#eff6ff'}}>
              <Clock size={24} />
            </div>
            <h4 style={styles.guideTitle}>Prazo de Entrega</h4>
            <p style={styles.guideText}>
              O prazo de entrega vai variar de acordo com a urgência e complexidade da demanda, sendo feito o mais rápido possível.
            </p>
          </div>

          {/* Card 2: Última Hora */}
          <div style={styles.guideCard}>
            <div style={{...styles.guideIcon, color: colors?.danger || '#ef4444', background: '#fef2f2'}}>
              <Flame size={24} />
            </div>
            <h4 style={styles.guideTitle}>Produção de Última Hora</h4>
            <p style={styles.guideText}>
              Será feito se for possível dentro do tempo solicitado. Porém, <b>reincidentes poderão ficar sem a demanda por falta de tempo</b>. Programem-se! :)
            </p>
          </div>

          {/* Card 3: Informações Importantes */}
          <div style={{...styles.guideCard, gridColumn: '1 / -1'}}>
            <div style={{...styles.guideIcon, color: colors?.success || '#10b981', background: '#ecfdf5'}}>
              <ListChecks size={24} />
            </div>
            <h4 style={styles.guideTitle}>Informações e Regras</h4>
            <ul style={styles.guideList}>
              <li><b>Sem Ansiedade:</b> Vamos entregar dentro do prazo solicitado, não sendo necessário perguntar o andamento.</li>
              <li><b>Bom Senso:</b> Colocar um prazo de entrega realista para a demanda solicitada.</li>
              <li><b>Fatores Externos:</b> Se atentar com a viabilidade de produção, como tempo extra para impressão de materiais físicos em gráficas, por exemplo.</li>
              <li><b>Hierarquia:</b> Por enquanto, as demandas poderão ser solicitadas apenas por líderes de setores, gerentes e supervisores.</li>
            </ul>
          </div>

          {/* Card 4: Dúvidas */}
          <div style={{...styles.guideCard, gridColumn: '1 / -1', background: 'var(--bg-app)', borderStyle: 'dashed'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{...styles.guideIcon, color: colors?.warning || '#f59e0b', background: '#fffbeb', marginBottom: 0}}>
                <MessageCircle size={24} />
              </div>
              <div>
                <h4 style={{...styles.guideTitle, margin: 0}}>Dúvidas e Informações Adicionais?</h4>
                <p style={{...styles.guideText, margin: 0, marginTop: '4px'}}>
                  Falar diretamente com o <b>Rodrigo</b> ou a <b>Eliane</b>.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.4s ease forwards; }
        .cta-button { transition: all 0.2s ease; }
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25) !important; background: #1d4ed8 !important; }
      `}</style>
    </div>
  );
}

const styles = {
  header: { marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  title: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '5px 0 0 0' },
  
  alertBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', color: '#1e3a8a', fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
  
  actionBanner: { 
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', 
    padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    flexWrap: 'wrap', gap: '15px', boxShadow: 'var(--shadow-sm)'
  },
  bannerTitle: { fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' },
  bannerDesc: { fontSize: '13px', color: 'var(--text-muted)', margin: 0 },
  mainCtaBtn: { 
    display: 'flex', alignItems: 'center', gap: '8px', background: colors?.primary || '#3b82f6', 
    color: 'white', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', 
    fontWeight: '800', textDecoration: 'none', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' 
  },

  sectionHeader: { 
    fontSize: '14px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', 
    letterSpacing: '0.05em', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' 
  },
  guidelinesGrid: { 
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' 
  },
  guideCard: { 
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', 
    padding: '24px', boxShadow: 'var(--shadow-sm)' 
  },
  guideIcon: { 
    width: '42px', height: '42px', borderRadius: '10px', display: 'flex', 
    alignItems: 'center', justifyContent: 'center', marginBottom: '16px' 
  },
  guideTitle: { fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0' },
  guideText: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 },
  guideList: { 
    margin: '10px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)', 
    fontSize: '13px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '8px' 
  }
};