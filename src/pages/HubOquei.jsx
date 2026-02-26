import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, TrendingDown, TrendingUp, Target, Crosshair, Users, 
  X, Calendar, UploadCloud, Zap, Lightbulb, Share2, Headset, 
  ShieldAlert, AlertTriangle, Layers, Trophy, Medal, Map, 
  ShieldCheck, Flame, ChevronRight, BarChart3, Info, MapPin, Smartphone
} from 'lucide-react';

// ============================================================================
// --- MOCKS PARA AMBIENTE DE DESENVOLVIMENTO (CANVAS) ---
// Nota: No seu projeto real, as funções abaixo devem ler dados do Firestore
// das coleções 'leads', 'city_metrics' e 'action_plans'.
// ============================================================================

const HubOquei = ({ userData }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('radar');
  
  // Estados para dados simulados
  const [cityMetrics, setCityMetrics] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);

  // --- CARREGAMENTO DE DADOS (SIMULAÇÃO) ---
  useEffect(() => {
    setLoading(true);
    // Simula tempo de resposta do Firebase
    setTimeout(() => {
      setCityMetrics([
        { 
          id: 'bady', city: 'Bady Bassitt', hps: 5000, baseStart: 1200, targetNetAdds: 50,
          channels: { loja: 25, pap: 15, digital: 5, b2b: 5 },
          cancelReasons: { concorrencia: 8, tecnico: 5, mudanca: 4, financeiro: 3, outros: 0 },
          histAvgGrowth: 2.1, histAvgChurn: 1.2
        },
        { 
          id: 'borb', city: 'Borborema', hps: 3500, baseStart: 850, targetNetAdds: 20,
          channels: { loja: 10, pap: 5, digital: 2, b2b: 0 },
          cancelReasons: { concorrencia: 15, tecnico: 5, mudanca: 2, financeiro: 3, outros: 0 },
          histAvgGrowth: 1.5, histAvgChurn: 2.4
        },
        { 
          id: 'nova', city: 'Nova Granada', hps: 4200, baseStart: 950, targetNetAdds: 30,
          channels: { loja: 20, pap: 10, digital: 8, b2b: 2 },
          cancelReasons: { concorrencia: 5, tecnico: 2, mudanca: 5, financeiro: 3, outros: 0 },
          histAvgGrowth: 1.8, histAvgChurn: 1.1
        }
      ]);
      setLoading(false);
    }, 800);
  }, [selectedMonth]);

  // --- MOTOR DE CÁLCULO BI ---
  const processedData = useMemo(() => {
    return cityMetrics.map(city => {
      const totalSales = Object.values(city.channels).reduce((a, b) => a + b, 0);
      const cancelations = Object.values(city.cancelReasons).reduce((a, b) => a + b, 0);
      const netAdds = totalSales - cancelations;
      const currentBase = city.baseStart + netAdds;
      const churnRate = ((cancelations / city.baseStart) * 100).toFixed(1);
      const penetration = ((currentBase / city.hps) * 100).toFixed(1);
      
      let health = 'green';
      if (netAdds < 0) health = 'red'; 
      else if (netAdds < city.targetNetAdds) health = 'yellow'; 

      return { ...city, totalSales, cancelations, netAdds, currentBase, churnRate, penetration, health };
    });
  }, [cityMetrics]);

  // --- COMPONENTES DAS ABAS ---

  const RadarView = () => (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}><Crosshair size={20} color="#3b82f6"/> Radar de Performance (Real-Time)</h3>
      <div style={styles.grid2}>
        {processedData.map(city => (
          <div key={city.id} onClick={() => setSelectedCity(city)} style={{...styles.cityCard, borderColor: selectedCity?.id === city.id ? '#3b82f6' : '#1e293b'}}>
            <div style={styles.cityCardHeader}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={{...styles.statusDot, background: city.health === 'green' ? '#10b981' : city.health === 'yellow' ? '#f59e0b' : '#ef4444'}} />
                <span style={styles.cityName}>{city.city}</span>
              </div>
              <span style={styles.badge}>{city.penetration}% Share</span>
            </div>
            <div style={styles.cardKpiGrid}>
               <div style={styles.kpiBox}><span>Net Adds</span><strong style={{color: city.netAdds >= 0 ? '#10b981' : '#ef4444'}}>{city.netAdds > 0 ? '+' : ''}{city.netAdds}</strong></div>
               <div style={styles.kpiBox}><span>Churn</span><strong>{city.churnRate}%</strong></div>
               <div style={styles.kpiBox}><span>Base</span><strong>{city.currentBase}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AlertasView = () => (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}><ShieldAlert size={20} color="#ef4444"/> Alertas de Integridade</h3>
      <div style={styles.alertList}>
        {processedData.filter(c => c.netAdds < 0).map(city => (
          <div key={city.id} style={styles.alertCard}>
            <div style={styles.alertIcon}><Flame size={24} color="#ef4444"/></div>
            <div style={{flex: 1}}>
              <h4 style={styles.alertTitle}>SANGRAMENTO: {city.city}</h4>
              <p style={styles.alertText}>Alerta crítico! O volume de cancelamentos ({city.cancelations}) está a superar as novas vendas ({city.totalSales}).</p>
            </div>
            <button style={styles.btnPrescrever}>Prescrever Ação</button>
          </div>
        ))}
        {processedData.filter(c => c.netAdds < 0).length === 0 && (
          <div style={styles.emptyState}>Nenhum alerta crítico de sangramento ativo.</div>
        )}
      </div>
    </div>
  );

  const SafrasView = () => (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}><Layers size={20} color="#8b5cf6"/> Análise de Safras (Cohort)</h3>
      <p style={styles.tabSubText}>Monitorização da retenção por mês de entrada do cliente.</p>
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Mês de Entrada</th>
              <th style={styles.th}>Base Original</th>
              <th style={styles.th}>Churn 30 dias</th>
              <th style={styles.th}>Churn 90 dias</th>
              <th style={styles.th}>Score Qualidade</th>
            </tr>
          </thead>
          <tbody>
            {[
              { mes: 'Out/24', base: 450, c30: '0.8%', c90: '1.5%', score: 'Excelente' },
              { mes: 'Nov/24', base: 510, c30: '1.2%', c90: '3.4%', score: 'Crítico' },
              { mes: 'Dez/24', base: 680, c30: '0.5%', c90: '1.1%', score: 'Excelente' },
              { mes: 'Jan/25', base: 420, c30: '2.1%', c90: '---', score: 'Alerta' },
            ].map((s, i) => (
              <tr key={i} style={styles.tr}>
                <td style={styles.td}><strong>{s.mes}</strong></td>
                <td style={styles.td}>{s.base} clientes</td>
                <td style={styles.td}>{s.c30}</td>
                <td style={{...styles.td, color: s.score === 'Crítico' ? '#ef4444' : '#10b981', fontWeight:'bold'}}>{s.c90}</td>
                <td style={styles.td}>
                   <span style={{
                     padding:'4px 10px', borderRadius:'6px', fontSize:'10px', fontWeight:'bold',
                     background: s.score === 'Excelente' ? '#ecfdf5' : s.score === 'Alerta' ? '#fffbeb' : '#fef2f2',
                     color: s.score === 'Excelente' ? '#059669' : s.score === 'Alerta' ? '#d97706' : '#dc2626'
                   }}>{s.score}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const GeoView = () => (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}><Map size={20} color="#059669"/> Zonas de Calor (Geomarketing)</h3>
      <div style={styles.geoGrid}>
        <div style={styles.mapSimulator}>
           <div style={{...styles.heatCircle, top:'25%', left:'35%', width:'140px', height:'140px', background:'rgba(16,185,129,0.2)', border:'2px solid #10b981'}}><span style={styles.heatText}>Domínio Central</span></div>
           <div style={{...styles.heatCircle, top:'60%', left:'55%', width:'100px', height:'100px', background:'rgba(245,158,11,0.2)', border:'2px solid #f59e0b'}}><span style={styles.heatText}>Expansão Sul</span></div>
           <div style={{...styles.heatCircle, top:'45%', left:'15%', width:'80px', height:'80px', background:'rgba(239,68,68,0.2)', border:'2px solid #ef4444'}}><span style={styles.heatText}>Concorrência Ativa</span></div>
           <div style={{position:'absolute', bottom:'20px', right:'20px', color:'#64748b', fontSize:'11px'}}>Radar Geo HubOquei</div>
        </div>
        <div style={styles.geoLegend}>
           <h4 style={styles.subTitle}>Dominância por Bairro</h4>
           {[
             { name: 'Centro', density: 92, status: 'dominado' },
             { name: 'Parque Industrial', density: 38, status: 'oportunidade' },
             { name: 'Residencial II', density: 12, status: 'vulneravel' }
           ].map((item, i) => (
             <div key={i} style={styles.geoItem}>
                <div style={{flex: 1}}>
                  <span style={styles.geoName}>{item.name}</span>
                  <div style={styles.geoBarBg}><div style={{...styles.geoBarFill, width: item.density + '%', background: item.status === 'dominado' ? '#10b981' : item.status === 'oportunidade' ? '#f59e0b' : '#ef4444'}} /></div>
                </div>
                <span style={styles.geoPerc}>{item.density}%</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );

  const ClubeElite = () => (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}><Trophy size={20} color="#f59e0b"/> Clube de Elite (Gamificação)</h3>
      <div style={styles.grid2}>
         <div style={styles.gamingCard}>
            <h4 style={styles.subTitle}>Missões Ativas</h4>
            <div style={styles.missionRow}>
               <div style={styles.missionInfo}><Zap size={18} color="#3b82f6"/> <span>Meta Regional: 45% de Penetração</span></div>
               <span style={styles.missionProgress}>82%</span>
            </div>
            <div style={styles.missionRow}>
               <div style={styles.missionInfo}><ShieldCheck size={18} color="#10b981"/> <span>Meta Retenção: Churn abaixo de 1.2%</span></div>
               <span style={styles.missionProgress}>Em curso</span>
            </div>
         </div>
         <div style={styles.gamingCard}>
            <h4 style={styles.subTitle}>Vendedores Diamante</h4>
            <div style={styles.badgeGrid}>
               <div style={styles.badgeItem}>
                  <div style={{...styles.badgeIcon, background: '#10b981'}}><ShieldCheck size={24} color="white"/></div>
                  <span style={styles.badgeLabel}>Escudo Retenção</span>
                  <small style={styles.badgeOwner}>Mariana Silva</small>
               </div>
               <div style={styles.badgeItem}>
                  <div style={{...styles.badgeIcon, background: '#f59e0b'}}><Trophy size={24} color="white"/></div>
                  <span style={styles.badgeLabel}>Líder de Conversão</span>
                  <small style={styles.badgeOwner}>João Pedro</small>
               </div>
            </div>
         </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Activity size={48} color="#3b82f6" style={{animation:'pulse 1.5s infinite'}} />
        <h2 style={{color:'white', marginTop:'20px'}}>Iniciando HubOquei Inteligência...</h2>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      
      {/* HEADER HUB */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBox}><Zap size={32} color="#00f2fe" fill="#00f2fe" /></div>
          <div>
            <h1 style={styles.title}>HubOquei</h1>
            <p style={styles.subtitle}>Núcleo de Inteligência Comercial Proativa</p>
          </div>
        </div>
        <div style={styles.headerRight}>
           <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={styles.monthInput} />
        </div>
      </div>

      {/* NAVEGAÇÃO HUB */}
      <div style={styles.navBar}>
        <button onClick={() => setActiveTab('radar')} style={activeTab === 'radar' ? styles.navBtnActive : styles.navBtn}><Crosshair size={18}/> Radar</button>
        <button onClick={() => setActiveTab('alertas')} style={activeTab === 'alertas' ? styles.navBtnActive : styles.navBtn}><ShieldAlert size={18}/> Alertas</button>
        <button onClick={() => setActiveTab('safras')} style={activeTab === 'safras' ? styles.navBtnActive : styles.navBtn}><Layers size={18}/> Safras</button>
        <button onClick={() => setActiveTab('geo')} style={activeTab === 'geo' ? styles.navBtnActive : styles.navBtn}><Map size={18}/> Geo</button>
        <button onClick={() => setActiveTab('games')} style={activeTab === 'games' ? styles.navBtnActive : styles.navBtn}><Trophy size={18}/> Elite</button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{marginTop: '30px'}}>
        {activeTab === 'radar' && <RadarView />}
        {activeTab === 'alertas' && <AlertasView />}
        {activeTab === 'safras' && <SafrasView />}
        {activeTab === 'geo' && <GeoView />}
        {activeTab === 'games' && <ClubeElite />}
      </div>

    </div>
  );
};

// --- ESTILOS INLINE (TEMA EXECUTIVO HUB) ---
const styles = {
  pageContainer: { background: '#020617', minHeight: '100vh', padding: '40px', color: 'white', fontFamily: "'Inter', sans-serif" },
  loadingContainer: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#020617', color:'white' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom:'20px', borderBottom:'1px solid #1e293b' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  iconBox: { background: 'rgba(0, 242, 254, 0.1)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.3)', boxShadow:'0 0 20px rgba(0, 242, 254, 0.2)' },
  title: { fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.03em' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '5px 0 0 0' },
  monthInput: { background: '#0f172a', border: '1px solid #1e293b', color: 'white', padding: '10px 15px', borderRadius: '12px', outline:'none', fontWeight:'bold' },

  navBar: { display: 'flex', gap: '5px', background: '#0f172a', padding: '6px', borderRadius: '14px', width: 'fit-content' },
  navBtn: { background: 'transparent', border: 'none', color: '#64748b', padding: '12px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', borderRadius:'10px', transition:'0.2s' },
  navBtnActive: { background: '#1e293b', border: 'none', color: '#00f2fe', padding: '12px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', borderRadius:'10px', boxShadow:'0 4px 6px rgba(0,0,0,0.2)' },

  tabContent: { animation: 'fadeIn 0.4s ease-out' },
  sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' },
  tabSubText: { fontSize: '14px', color: '#94a3b8', marginTop: '-15px', marginBottom: '25px' },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  cityCard: { background: '#0f172a', padding: '25px', borderRadius: '24px', border: '2px solid #1e293b', cursor: 'pointer', transition: 'all 0.2s' },
  cityCardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  statusDot: { width: '12px', height: '12px', borderRadius: '50%' },
  cityName: { fontSize: '18px', fontWeight: 'bold', color: 'white' },
  badge: { background: '#1e293b', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '8px' },
  cardKpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px' },
  kpiBox: { display:'flex', flexDirection:'column', fontSize:'11px', color:'#64748b' },

  alertList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  alertCard: { background: '#0f172a', border: '1px solid #334155', borderLeft: '6px solid #ef4444', padding: '25px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '25px' },
  alertTitle: { fontSize: '16px', fontWeight: '900', color: '#ef4444', margin: 0 },
  alertText: { fontSize: '14px', color: '#94a3b8', margin: '5px 0 0 0', lineHeight: '1.5' },
  btnPrescrever: { background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  emptyState: { textAlign:'center', padding:'60px', background:'#0f172a', borderRadius:'20px', color:'#64748b', fontStyle:'italic' },

  tableCard: { background: '#0f172a', borderRadius: '20px', border: '1px solid #1e293b', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: 'rgba(255,255,255,0.03)' },
  th: { padding: '15px 20px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #1e293b' },
  td: { padding: '15px 20px', fontSize: '14px' },

  geoGrid: { display:'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' },
  mapSimulator: { background: '#0f172a', height: '450px', borderRadius: '24px', border: '1px solid #1e293b', position: 'relative', overflow:'hidden' },
  heatCircle: { position: 'absolute', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' },
  heatText: { fontSize: '10px', fontWeight: 'bold', whiteSpace:'nowrap' },
  geoLegend: { background: '#0f172a', padding: '30px', borderRadius: '24px', border: '1px solid #1e293b' },
  subTitle: { fontSize:'16px', fontWeight:'bold', marginBottom:'25px', color:'white', display:'flex', alignItems:'center', gap:'10px' },
  geoItem: { marginBottom:'25px' },
  geoName: { fontSize:'13px', fontWeight:'bold', display:'block', marginBottom:'8px' },
  geoBarBg: { height:'8px', background:'#1e293b', borderRadius:'4px', overflow:'hidden' },
  geoBarFill: { height:'100%', borderRadius:'4px', transition:'width 1s ease' },
  geoPerc: { fontSize:'15px', fontWeight:'900', color:'white', marginTop:'5px', textAlign:'right', display:'block' },

  gamingCard: { background: '#0f172a', padding: '30px', borderRadius: '24px', border: '1px solid #1e293b' },
  missionRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', background:'rgba(255,255,255,0.02)', borderRadius:'12px', marginBottom:'15px' },
  missionInfo: { display:'flex', alignItems:'center', gap:'12px', fontSize:'14px', color:'#cbd5e1' },
  missionProgress: { fontSize:'11px', fontWeight:'900', color:'#3b82f6', textTransform:'uppercase' },
  badgeGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  badgeItem: { textAlign:'center', padding:'20px', background:'rgba(255,255,255,0.02)', borderRadius:'16px', border:'1px solid #1e293b' },
  badgeIcon: { width:'56px', height:'56px', borderRadius:'50%', margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 15px rgba(0,0,0,0.3)' },
  badgeLabel: { display:'block', fontSize:'13px', fontWeight:'bold', color:'white' },
  badgeOwner: { display:'block', fontSize:'11px', color:'#64748b', marginTop:'5px' }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = "@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }";
document.head.appendChild(styleSheet);

export default HubOquei;