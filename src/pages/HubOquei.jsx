import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, where, onSnapshot, limit } from 'firebase/firestore';
import { 
  Activity, TrendingDown, TrendingUp, Target, Crosshair, Users, 
  X, Calendar, Zap, Share2, Headset, ShieldAlert, AlertTriangle, 
  Layers, Trophy, Map, ShieldCheck, Flame, ChevronRight, 
  BarChart3, Info, MapPin, Layout, Globe, Filter, Server, Bell,
  Clock, Award
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function HubOquei({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  // Abas e visualizações
  const [activeTab, setActiveTab] = useState('radar'); // Deixei "radar" como padrão novamente para veres as cidades logo de cara
  const [mapMode, setMapMode] = useState('panel'); 
  
  const [cityMetrics, setCityMetrics] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);

  // Filtros Safras
  const [safraFilterCluster, setSafraFilterCluster] = useState('all');
  const [safraFilterCity, setSafraFilterCity] = useState('all');

  // Estado: Feed Live
  const [liveLeads, setLiveLeads] = useState([]);

  // --- 1. CARREGAMENTO BLINDADO DE CIDADES E DADOS MENTAIS ---
  useEffect(() => {
    setLoading(true);

    const fetchRealData = async () => {
      try {
        // 1º Passo: Buscar as Cidades (Isto garante que os cards apareçam sempre)
        let qCities = query(collection(db, "cities"));
        if (userData?.role === 'supervisor' && userData?.clusterId) {
          qCities = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        }
        const snapCities = await getDocs(qCities);
        const citiesList = snapCities.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2º Passo: Buscar Leads do Mês (Protegido com try-catch independente)
        let leadsList = [];
        try {
          const qLeads = query(collection(db, "leads")); 
          const snapLeads = await getDocs(qLeads);
          // Filtrar as datas no front-end para não causar erros de Index no Firebase
          leadsList = snapLeads.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => {
            if (!l.date) return false;
            return l.date.startsWith(selectedMonth);
          });
        } catch (errLeads) {
          console.warn("Nenhum lead encontrado ou erro ao ler leads: ", errLeads);
        }

        // 3º Passo: Juntar Cidades com as Vendas (Se não houver vendas, fica tudo a zero)
        if (citiesList.length > 0) {
          const metrics = citiesList.map(city => {
            const cityLeads = leadsList.filter(l => l.cityId === city.name || l.cityId === city.id);
            const sales = cityLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
            const cancels = cityLeads.filter(l => l.status === 'Descartado' || l.status === 'Cancelado').length;
            
            return {
              id: city.id,
              city: city.name || city.id || 'Unidade Desconhecida',
              clusterId: city.clusterId || 'Sem Regional',
              lat: city.lat,
              lon: city.lon,
              hps: Number(city.hps) || 0,
              baseStart: Number(city.baseStart) || 0,
              targetNetAdds: Number(city.targetNetAdds) || 0,
              channels: { loja: sales, pap: 0, digital: 0, b2b: 0 }, 
              cancelReasons: { concorrencia: cancels, tecnico: 0, mudanca: 0, financeiro: 0, outros: 0 },
              realData: true
            };
          });
          setCityMetrics(metrics);
        } else {
          // MOCK DE FALLBACK (Se o supervisor não tiver cidades alocadas)
          const mockCities = [
            { id: 'bady', city: 'Bady Bassitt', clusterId: 'Regional Sul', lat: '-20.9167', lon: '-49.4444', hps: 5000, baseStart: 1200, targetNetAdds: 50, channels: { loja: 0, pap: 0, digital: 0, b2b: 0 }, cancelReasons: { concorrencia: 0, tecnico: 0, mudanca: 0, financeiro: 0, outros: 0 } },
            { id: 'borb', city: 'Borborema', clusterId: 'Regional Norte', lat: '-21.6194', lon: '-49.0736', hps: 3500, baseStart: 850, targetNetAdds: 20, channels: { loja: 0, pap: 0, digital: 0, b2b: 0 }, cancelReasons: { concorrencia: 0, tecnico: 0, mudanca: 0, financeiro: 0, outros: 0 } }
          ];
          setCityMetrics(mockCities);
        }
      } catch (err) {
        console.error("Erro ao montar o painel: ", err);
      }
      setLoading(false);
    };

    fetchRealData();
  }, [selectedMonth, userData]);

  // --- 2. ESCUTA EM TEMPO REAL (RADAR LIVE) ---
  useEffect(() => {
    // Buscamos sem orderBy para evitar crash de index. Ordenaremos no front-end.
    const qLive = query(collection(db, "leads"), limit(100));
    const unsub = onSnapshot(qLive, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      const filteredDocs = userData?.role === 'supervisor' 
        ? docs.filter(lead => lead.clusterId === userData.clusterId)
        : docs;
      setLiveLeads(filteredDocs);
    }, (error) => console.warn("Aguardando feed de leads..."));
    
    return () => unsub();
  }, [userData]);

  // CÁLCULOS DO RADAR LIVE
  const liveStats = useMemo(() => {
    const total = liveLeads.length;
    const emTratativa = liveLeads.filter(l => l.status === 'Novo' || l.status === 'Em Negociação').length;
    const agendados = liveLeads.filter(l => l.status === 'Agendado' || l.status === 'Contrato Assinado').length;
    const instalados = liveLeads.filter(l => l.status === 'Instalado' || l.status === 'Ativo').length;
    const conversao = total > 0 ? (((agendados + instalados) / total) * 100).toFixed(1) : 0;
    return { total, emTratativa, agendados, conversao };
  }, [liveLeads]);

  const liveRanking = useMemo(() => {
    const vendedores = {};
    liveLeads.forEach(lead => {
      if (['Agendado', 'Contrato Assinado', 'Instalado', 'Ativo'].includes(lead.status)) {
        const nome = lead.attendantName || 'Vendedor Oculto';
        if (!vendedores[nome]) vendedores[nome] = { nome, vendas: 0 };
        vendedores[nome].vendas += 1;
      }
    });
    return Object.values(vendedores).sort((a, b) => b.vendas - a.vendas).slice(0, 5);
  }, [liveLeads]);

  // --- CÁLCULOS PREDITIVOS DAS CIDADES (MENSAL) ---
  const processedData = useMemo(() => {
    return cityMetrics.map(city => {
      const totalSales = Object.values(city.channels).reduce((a, b) => a + b, 0);
      const cancelations = Object.values(city.cancelReasons).reduce((a, b) => a + b, 0);
      const netAdds = totalSales - cancelations;
      const currentBase = city.baseStart + netAdds;
      const churnRate = city.baseStart > 0 ? ((cancelations / city.baseStart) * 100).toFixed(1) : 0;
      const penetration = city.hps > 0 ? ((currentBase / city.hps) * 100).toFixed(1) : 0;
      
      let health = 'green';
      if (netAdds < 0) health = 'red'; 
      else if (netAdds < city.targetNetAdds) health = 'yellow'; 

      const targetProgress = city.targetNetAdds > 0 ? Math.min(Math.max((netAdds / city.targetNetAdds) * 100, 0), 100) : 0;
      const backlogAlert = (totalSales > 5 && cancelations > totalSales * 0.5) ? "Alto volume de descartes/churn" : null;

      return { ...city, totalSales, cancelations, netAdds, currentBase, churnRate, penetration, health, targetProgress, backlogAlert };
    });
  }, [cityMetrics]);

  // --- KPIS GLOBAIS ---
  const globalKpis = useMemo(() => {
    let totalBase = 0, totalGross = 0, totalNet = 0, totalTarget = 0;
    processedData.forEach(c => {
      totalBase += c.currentBase;
      totalGross += c.totalSales;
      totalNet += c.netAdds;
      totalTarget += c.targetNetAdds;
    });
    return { totalBase, totalGross, totalNet, totalTarget };
  }, [processedData]);

  // --- MOTOR DE ALERTAS ---
  const activeAlerts = useMemo(() => {
    const alerts = [];
    processedData.forEach(city => {
      if (city.health === 'red') alerts.push({ id: city.id + '1', type: 'danger', city: city.city, title: 'Crescimento Negativo', text: `A unidade está a perder base de clientes (Net Adds: ${city.netAdds}).` });
      if (parseFloat(city.churnRate) > 2) alerts.push({ id: city.id + '2', type: 'warning', city: city.city, title: 'Evasão Alta (Churn)', text: `O churn atingiu ${city.churnRate}%. Necessária ação de retenção.` });
      if (city.backlogAlert) alerts.push({ id: city.id + '3', type: 'warning', city: city.city, title: 'Risco Operacional', text: city.backlogAlert });
    });
    return alerts;
  }, [processedData]);

  const availableClusters = [...new Set(processedData.map(c => c.clusterId))];
  const availableCities = processedData.filter(c => safraFilterCluster === 'all' || c.clusterId === safraFilterCluster);

  // --- 🔴 VISÕES (ABAS) 🔴 ---

  const LiveView = () => (
    <div className="animated-card" style={local.tabContent}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <MetricCardLive title="Leads Captados" value={liveStats.total} icon={Users} color={colors.primary} />
        <MetricCardLive title="Em Negociação" value={liveStats.emTratativa} icon={Activity} color={colors.warning} />
        <MetricCardLive title="Vendas Agendadas" value={liveStats.agendados} icon={Target} color={colors.success} />
        <MetricCardLive title="Taxa Conversão" value={`${liveStats.conversao}%`} icon={TrendingUp} color={colors.cyan} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color={colors.cyan} /> Feed da Operação (Live)
              </h3>
              <span style={{ fontSize: '11px', background: 'var(--bg-danger-light)', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px', animation: 'pulse 2s infinite' }}>
                <Flame size={12} /> AO VIVO
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {liveLeads.slice(0, 10).map((lead, i) => (
                <div key={lead.id || i} className="hover-lift" style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)', transition: 'transform 0.2s', cursor: 'pointer' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: lead.status?.includes('Instalado') ? 'var(--bg-success-light)' : 'var(--bg-primary-light)', color: lead.status?.includes('Instalado') ? colors.success : colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {lead.status?.includes('Instalado') ? <Zap size={20} /> : <Crosshair size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{lead.customerName || 'Cliente em Captação'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{lead.cityId || 'Regional'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vendedor: <strong style={{color: 'var(--text-main)'}}>{lead.attendantName || 'Não Atribuído'}</strong></span>
                      <span style={{ color: 'var(--border)' }}>|</span>
                      <span style={{ fontWeight: '900', color: lead.status?.includes('Instalado') ? colors.success : colors.warning }}>{lead.status || 'Novo'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {liveLeads.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>A aguardar movimentos no radar...</div>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#f59e0b" /> Top Performers (Vendas)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {liveRanking.length > 0 ? liveRanking.map((vend, idx) => (
                <div key={vend.nome} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', background: idx === 0 ? 'linear-gradient(90deg, #f59e0b15 0%, transparent 100%)' : 'transparent', border: idx === 0 ? '1px solid #f59e0b40' : '1px solid transparent' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: idx === 0 ? '#f59e0b' : 'var(--bg-app)', color: idx === 0 ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>{idx + 1}º</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{vend.nome}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{vend.vendas} vendas</div>
                  </div>
                  {idx === 0 && <Award size={18} color="#f59e0b" />}
                </div>
              )) : <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Nenhuma venda hoje.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RadarView = () => (
    <div style={local.tabContent}>
      <div style={local.kpiGlobalGrid}>
        <div className="animated-card" style={{...local.kpiGlobalCard, animationDelay: '0.0s'}}>
          <div style={local.kpiGlobalIconWrapper}><Users size={24} color={colors.primary} /></div>
          <div>
            <span style={local.kpiGlobalLabel}>Base Total (Cluster)</span>
            <strong style={local.kpiGlobalValue}>{globalKpis.totalBase.toLocaleString('pt-BR')}</strong>
          </div>
        </div>
        <div className="animated-card" style={{...local.kpiGlobalCard, animationDelay: '0.1s'}}>
          <div style={{...local.kpiGlobalIconWrapper, background: `${colors.success}15`}}><TrendingUp size={24} color={colors.success} /></div>
          <div>
            <span style={local.kpiGlobalLabel}>Vendas Brutas (Mês)</span>
            <strong style={local.kpiGlobalValue}>{globalKpis.totalGross}</strong>
          </div>
        </div>
        <div className="animated-card" style={{...local.kpiGlobalCard, border: `1px solid ${globalKpis.totalNet >= 0 ? colors.success : colors.danger}`, animationDelay: '0.2s'}}>
          <div style={{...local.kpiGlobalIconWrapper, background: globalKpis.totalNet >= 0 ? `${colors.success}15` : `${colors.danger}15`}}>
            <Target size={24} color={globalKpis.totalNet >= 0 ? colors.success : colors.danger} />
          </div>
          <div>
            <span style={local.kpiGlobalLabel}>Net Adds (Real vs Meta)</span>
            <div style={{display:'flex', alignItems:'baseline', gap:'8px'}}>
              <strong style={{...local.kpiGlobalValue, color: globalKpis.totalNet >= 0 ? colors.success : colors.danger}}>
                {globalKpis.totalNet > 0 ? '+' : ''}{globalKpis.totalNet}
              </strong>
              <span style={{fontSize:'14px', color:'var(--text-muted)', fontWeight:'bold'}}>/ {globalKpis.totalTarget}</span>
            </div>
          </div>
        </div>
      </div>

      <h3 style={local.sectionTitle}><Crosshair size={20} color="var(--text-brand)"/> Raio-X por Unidade (Mês)</h3>
      
      {/* SEÇÃO DOS CARDS DAS CIDADES */}
      <div style={local.gridRadar}>
        {processedData.length > 0 ? processedData.map((city, index) => (
          <div key={city.id} className="animated-card" onClick={() => setSelectedCity(city)} style={{...local.cityCard, animationDelay: `${0.1 * index}s`, borderColor: selectedCity?.id === city.id ? 'var(--text-brand)' : 'var(--border)'}}>
            <div style={local.cityCardHeader}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{...local.statusDot, background: city.health === 'green' ? colors.success : city.health === 'yellow' ? colors.warning : colors.danger}} />
                <span style={local.cityName}>{city.city}</span>
              </div>
              <span style={local.badge}>{city.penetration}% HPs Ativos</span>
            </div>

            <div style={{marginBottom: '20px'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', marginBottom:'6px', textTransform:'uppercase'}}>
                <span>Crescimento (Net)</span>
                <span style={{color: city.health === 'red' ? colors.danger : 'var(--text-main)'}}>{city.targetProgress.toFixed(0)}% da Meta</span>
              </div>
              <div style={{width:'100%', height:'8px', background:'var(--bg-app)', borderRadius:'4px', overflow:'hidden'}}>
                <div style={{width: `${city.targetProgress}%`, height:'100%', background: city.health === 'green' ? colors.success : city.health === 'yellow' ? colors.warning : colors.danger, transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)'}} />
              </div>
            </div>

            <div style={local.cardKpiGrid}>
               <div style={local.kpiBox}>
                 <span style={local.kpiBoxLabel}>Vendas</span>
                 <strong style={local.kpiBoxValue}>{city.totalSales}</strong>
               </div>
               <div style={local.kpiBox}>
                 <span style={local.kpiBoxLabel}>Churn</span>
                 <strong style={{...local.kpiBoxValue, color: city.cancelations > city.totalSales ? colors.danger : 'var(--text-main)'}}>{city.cancelations}</strong>
               </div>
               <div style={local.kpiBox}>
                 <span style={local.kpiBoxLabel}>Saldo Net</span>
                 <strong style={{...local.kpiBoxValue, color: city.netAdds >= 0 ? colors.success : colors.danger}}>
                   {city.netAdds > 0 ? '+' : ''}{city.netAdds}
                 </strong>
               </div>
            </div>
          </div>
        )) : (
          <div style={{gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '20px', border: '1px dashed var(--border)'}}>
            <h4 style={{margin: 0, color: 'var(--text-main)'}}>Nenhuma cidade vinculada à sua regional.</h4>
            <p style={{color: 'var(--text-muted)', fontSize: '13px'}}>Acesse as configurações do sistema para alocar as cidades.</p>
          </div>
        )}
      </div>
    </div>
  );

  const GeoView = () => {
    const mapUrl = selectedCity?.lat && selectedCity?.lon 
      ? `https://maps.google.com/maps?q=${selectedCity.lat},${selectedCity.lon}&t=&z=14&ie=UTF8&iwloc=&output=embed`
      : `https://maps.google.com/maps?q=Sao+Jose+do+Rio+Preto&t=&z=10&ie=UTF8&iwloc=&output=embed`;

    return (
      <div className="animated-card" style={local.tabContent}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
          <h3 style={{...local.sectionTitle, margin: 0}}><Map size={20} color={colors.success}/> Geomarketing: Zonas de Calor</h3>
          <div style={local.toggleContainer}>
             <button onClick={() => setMapMode('panel')} style={mapMode === 'panel' ? local.toggleBtnActive : local.toggleBtn}><Layout size={14}/> Painel Visual</button>
             <button onClick={() => setMapMode('real_map')} style={mapMode === 'real_map' ? local.toggleBtnActive : local.toggleBtn}><Globe size={14}/> Mapa Real</button>
          </div>
        </div>

        <div style={local.geoGrid}>
          {mapMode === 'real_map' ? (
            <div style={local.mapWrapper}>
               {!selectedCity && <div style={local.mapOverlay}>Selecione uma cidade no menu ao lado para focar no mapa</div>}
               <iframe width="100%" height="500" frameBorder="0" scrolling="no" src={mapUrl} style={{ borderRadius: '24px', border: '1px solid var(--border)' }} />
            </div>
          ) : (
            <div style={local.mapSimulator}>
               <div style={{...local.heatCircle, top:'25%', left:'35%', width:'180px', height:'180px', background:`${colors.success}20`, border:`2px dashed ${colors.success}`}}><span style={local.heatText}>Domínio Central</span></div>
               <div style={{...local.heatCircle, top:'60%', left:'55%', width:'120px', height:'120px', background:`${colors.warning}20`, border:`2px dashed ${colors.warning}`}}><span style={local.heatText}>Expansão Sul</span></div>
               <div style={{...local.heatCircle, top:'40%', left:'10%', width:'100px', height:'100px', background:`${colors.danger}20`, border:`2px dashed ${colors.danger}`}}><span style={local.heatText}>Risco Churn</span></div>
            </div>
          )}

          <div style={local.geoLegend}>
             <h4 style={local.subTitle}>Selecione a Praça</h4>
             <div style={{display:'flex', flexDirection:'column', gap:'12px', maxHeight:'400px', overflowY:'auto'}} className="custom-scrollbar">
               {processedData.map((item, i) => (
                 <button key={i} onClick={() => setSelectedCity(item)} style={{...local.geoItemBtn, borderColor: selectedCity?.id === item.id ? 'var(--text-brand)' : 'var(--border)', background: selectedCity?.id === item.id ? 'var(--bg-primary-light)' : 'var(--bg-app)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', width:'100%', marginBottom:'10px', alignItems: 'center'}}>
                      <span style={local.geoName}>{item.city}</span>
                      <span style={{fontSize:'12px', color:'var(--text-main)', fontWeight: '900'}}>{item.penetration}%</span>
                    </div>
                    <div style={local.geoBarBg}>
                      <div style={{...local.geoBarFill, width: item.penetration + '%', background: item.health === 'green' ? colors.success : item.health === 'yellow' ? colors.warning : colors.danger}} />
                    </div>
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const SafrasView = () => {
    const safrasMock = [
      { id: 1, cityId: 'Bady Bassitt', clusterId: 'Regional Sul', mes: 'Out/25', base: 450, c30: '0.8%', c90: '1.5%', score: 'Excelente' },
      { id: 2, cityId: 'Bady Bassitt', clusterId: 'Regional Sul', mes: 'Nov/25', base: 510, c30: '1.2%', c90: '3.4%', score: 'Crítico' },
      { id: 3, cityId: 'Borborema', clusterId: 'Regional Norte', mes: 'Dez/25', base: 680, c30: '0.5%', c90: '1.1%', score: 'Excelente' },
    ];
    const filteredSafras = safrasMock.filter(s => (safraFilterCluster === 'all' || s.clusterId === safraFilterCluster) && (safraFilterCity === 'all' || s.cityId === safraFilterCity));

    return (
      <div className="animated-card" style={local.tabContent}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '20px', marginBottom:'25px'}}>
          <div><h3 style={{...local.sectionTitle, margin: 0}}><Layers size={20} color="var(--text-brand)"/> Tabela de Retenção (Cohort)</h3></div>
          <div style={{display: 'flex', gap: '10px'}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)'}}>
               <Filter size={16} color="var(--text-muted)" />
               <select style={local.selectMinimal} value={safraFilterCluster} onChange={e => { setSafraFilterCluster(e.target.value); setSafraFilterCity('all'); }}>
                 <option value="all">Todas as Regionais</option>
                 {availableClusters.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             
             <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)'}}>
               <MapPin size={16} color="var(--text-muted)" />
               <select 
                 style={local.selectMinimal} 
                 value={safraFilterCity} 
                 onChange={e => setSafraFilterCity(e.target.value)}
                 disabled={safraFilterCluster === 'all'}
               >
                 <option value="all">Todas as Cidades</option>
                 {availableCities.map(c => <option key={c.id} value={c.city}>{c.city}</option>)}
               </select>
             </div>
          </div>
        </div>

        <div style={local.tableCard}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)'}}>
                <th style={local.th}>Mês</th><th style={local.th}>Unidade</th><th style={{...local.th, textAlign: 'center'}}>Base</th>
                <th style={{...local.th, textAlign: 'center'}}>Churn 30d</th><th style={{...local.th, textAlign: 'center'}}>Churn 90d</th><th style={{...local.th, textAlign: 'right'}}>Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredSafras.map((s, i) => (
                <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={local.td}><strong>{s.mes}</strong></td>
                  <td style={local.td}><strong>{s.cityId}</strong><br/><span style={{fontSize:'10px', color:'var(--text-muted)'}}>{s.clusterId}</span></td>
                  <td style={{...local.td, textAlign: 'center'}}>{s.base} clis</td>
                  <td style={{...local.td, textAlign: 'center'}}>{s.c30}</td>
                  <td style={{...local.td, textAlign: 'center', color: s.score === 'Crítico' ? colors.danger : colors.success, fontWeight:'900'}}>{s.c90}</td>
                  <td style={{...local.td, textAlign: 'right'}}><span style={{padding:'4px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'900', background: s.score === 'Excelente' ? 'var(--bg-success-light)' : 'var(--bg-danger-light)', color: s.score === 'Excelente' ? colors.success : colors.danger}}>{s.score}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const AlertasView = () => (
    <div className="animated-card" style={local.tabContent}>
       <h3 style={local.sectionTitle}><Bell size={20} color={colors.warning}/> Central de Alertas e Riscos</h3>
       
       {activeAlerts.length === 0 ? (
         <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <ShieldCheck size={48} color={colors.success} style={{marginBottom: '15px'}} />
            <h3 style={{color: 'var(--text-main)', margin: 0}}>Operação Saudável</h3>
            <p style={{color: 'var(--text-muted)'}}>Nenhum alerta crítico detetado na sua regional neste momento.</p>
         </div>
       ) : (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
           {activeAlerts.map((alert, index) => (
             <div key={alert.id} className="animated-card" style={{...local.alertCard, animationDelay: `${index * 0.1}s`, borderLeft: `4px solid ${alert.type === 'danger' ? colors.danger : colors.warning}`}}>
                <div style={{ padding: '12px', background: alert.type === 'danger' ? `${colors.danger}15` : `${colors.warning}15`, borderRadius: '12px', color: alert.type === 'danger' ? colors.danger : colors.warning }}>
                   {alert.type === 'danger' ? <TrendingDown size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div style={{ flex: 1 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{alert.title}</strong>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{alert.city}</span>
                   </div>
                   <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{alert.text}</p>
                </div>
                <button style={local.btnResolveAlert}>Analisar</button>
             </div>
           ))}
         </div>
       )}
    </div>
  );


  if (loading) return (
    <div style={local.loadingContainer}>
      <Activity size={48} color="var(--text-brand)" className="animate-spin" />
      <span style={{fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '20px'}}>Sincronizando Radar...</span>
    </div>
  );

  return (
    <div style={{...global.container, position: 'relative'}}>
      
      {/* CALENDÁRIO NO CANTO */}
      <div style={local.calendarCorner}>
         <Calendar size={14} color="var(--text-muted)" />
         <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={local.monthInputSmall} />
      </div>

      <div style={{...global.headerBox, paddingRight: '150px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{...global.iconHeader, background: colors.cyan}}><Zap size={32} color="white" fill="white" /></div>
          <div>
            <h1 style={global.title}>HubOquei Radar</h1>
            <p style={global.subtitle}>Inteligência Comercial, Geomarketing e Operação ao Vivo</p>
          </div>
        </div>
      </div>

      {/* MENU DE NAVEGAÇÃO INTERNO */}
      <div style={local.navBar}>
        <button onClick={() => setActiveTab('radar')} style={activeTab === 'radar' ? local.navBtnActive : local.navBtn}><Crosshair size={16}/> S&OP Regional</button>
        <button onClick={() => setActiveTab('live')} style={activeTab === 'live' ? local.navBtnActive : local.navBtn}><Zap size={16}/> Operação Live</button>
        <button onClick={() => setActiveTab('alertas')} style={activeTab === 'alertas' ? local.navBtnActive : local.navBtn}>
          <Bell size={16}/> Alertas {activeAlerts.length > 0 && <span style={{background: colors.danger, color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px'}}>{activeAlerts.length}</span>}
        </button>
        <button onClick={() => setActiveTab('geo')} style={activeTab === 'geo' ? local.navBtnActive : local.navBtn}><Map size={16}/> Zonas de Calor</button>
        <button onClick={() => setActiveTab('safras')} style={activeTab === 'safras' ? local.navBtnActive : local.navBtn}><Layers size={16}/> Safras</button>
      </div>

      <div style={{marginTop: '30px', paddingBottom: '40px'}}>
        {activeTab === 'radar' && <RadarView />}
        {activeTab === 'live' && <LiveView />}
        {activeTab === 'alertas' && <AlertasView />}
        {activeTab === 'geo' && <GeoView />}
        {activeTab === 'safras' && <SafrasView />}
      </div>
    </div>
  );
}

// Subcomponente de KPI para o Radar Live
const MetricCardLive = ({ title, value, icon: Icon, color }) => (
  <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', borderTop: `4px solid ${color}`, boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
      <Icon size={100} color={color} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <div style={{ background: `${color}15`, padding: '8px', borderRadius: '10px' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </div>
  </div>
);

// --- ESTILOS E ANIMAÇÕES COMPLETOS ---
const local = {
  loadingContainer: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'500px' },
  
  calendarCorner: { position: 'absolute', top: '30px', right: '30px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', zIndex: 10 },
  monthInputSmall: { background: 'transparent', border: 'none', color: 'var(--text-main)', outline:'none', fontWeight:'bold', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
  
  navBar: { display: 'flex', gap: '5px', background: 'var(--bg-panel)', padding: '6px', borderRadius: '16px', width: 'fit-content', border: '1px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', flexWrap: 'wrap', marginTop: '30px' },
  navBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', borderRadius:'12px', transition:'0.2s', fontSize: '13px' },
  navBtnActive: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', borderRadius:'12px', boxShadow:'var(--shadow-sm)', fontSize: '13px' },
  
  tabContent: { },
  sectionTitle: { fontSize: '20px', fontWeight: '900', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  
  kpiGlobalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '35px' },
  kpiGlobalCard: { background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)' },
  kpiGlobalIconWrapper: { padding: '16px', borderRadius: '16px', background: 'var(--bg-primary-light)' },
  kpiGlobalLabel: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '5px' },
  kpiGlobalValue: { fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 },

  gridRadar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '25px' },
  cityCard: { background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', border: '2px solid var(--border)', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'transform 0.2s, box-shadow 0.2s' },
  cityCardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px' },
  statusDot: { width: '14px', height: '14px', borderRadius: '50%', boxShadow: '0 0 10px currentColor' },
  cityName: { fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0 },
  badge: { background: 'var(--bg-panel)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '900', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border)' },
  cardKpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' },
  kpiBox: { display:'flex', flexDirection:'column', gap: '4px', textAlign: 'center' },
  kpiBoxLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' },
  kpiBoxValue: { fontSize: '22px', fontWeight: '900', color: 'var(--text-main)' },
  
  geoGrid: { display:'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' },
  mapWrapper: { position: 'relative', height: '500px', background: 'var(--bg-app)', borderRadius: '24px', border: '1px solid var(--border)' },
  mapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: '24px', zIndex: 5, textAlign: 'center', padding: '40px', backdropFilter: 'blur(4px)' },
  mapSimulator: { background: 'var(--bg-panel)', height: '500px', borderRadius: '24px', border: '1px solid var(--border)', position: 'relative', overflow:'hidden', backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '20px 20px' },
  heatCircle: { position: 'absolute', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', textAlign: 'center', boxShadow: 'inset 0 0 20px currentColor' },
  heatText: { fontSize: '11px', fontWeight: '900', color: 'var(--text-main)' },
  
  geoLegend: { background: 'var(--bg-card)', padding: '35px 30px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' },
  subTitle: { fontSize:'18px', fontWeight:'900', marginBottom:'10px', color: 'var(--text-main)', margin: 0 },
  geoItemBtn: { width: '100%', padding: '20px', borderRadius: '16px', border: '2px solid', marginBottom: '15px', cursor: 'pointer', textAlign: 'left', transition: '0.2s', background: 'var(--bg-app)' },
  geoName: { fontSize:'15px', fontWeight:'800', color: 'var(--text-main)' },
  geoBarBg: { height:'8px', background:'var(--bg-panel)', borderRadius:'4px', overflow:'hidden', border: '1px solid var(--border)' },
  geoBarFill: { height:'100%', borderRadius:'4px' },
  
  toggleContainer: { background: 'var(--bg-panel)', padding: '6px', borderRadius: '14px', display: 'flex', gap: '4px', border: '1px solid var(--border)' },
  toggleBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' },
  toggleBtnActive: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' },

  selectMinimal: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit' },
  tableCard: { background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  th: { padding: '20px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '900' },
  td: { padding: '20px', fontSize: '15px', color: 'var(--text-main)', verticalAlign: 'middle' },

  alertCard: { background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)' },
  btnResolveAlert: { background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }
};

if (typeof document !== 'undefined') {
  const styleId = 'huboquei-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes slideUpFade {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      .animated-card {
        opacity: 0;
        animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animated-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important;
      }
      .hover-lift:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        border-color: var(--text-brand) !important;
      }
    `;
    document.head.appendChild(style);
  }
}