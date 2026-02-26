import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { 
  Activity, TrendingDown, TrendingUp, Target, MapPin, 
  Plus, Crosshair, Users, X, CheckCircle, PieChart, 
  Share2, ShieldAlert, AlertTriangle, WifiOff, DollarSign,
  Briefcase, Headset, Smartphone, AlertCircle, BarChart3, Store,
  Save, Calendar as CalendarIcon, UploadCloud, ArrowRight, Zap, 
  Lightbulb, Sliders, GripVertical, AlertOctagon, Info, ShieldCheck
} from 'lucide-react';

// --- COMPONENTE ISOLADO PARA EVITAR LAG NOS SLIDERS E GERAR INSIGHTS ---
const InteligenciaView = ({ processedData }) => {
  const [simCityId, setSimCityId] = useState('');
  const [simGrowthPerc, setSimGrowthPerc] = useState(2.0); 
  const [simChurnPerc, setSimChurnPerc] = useState(1.5); 

  useEffect(() => {
    if (processedData.length > 0 && !simCityId) {
      setSimCityId(processedData[0].id);
    }
  }, [processedData]);

  const selectedCityData = processedData.find(c => c.id === simCityId);

  let targetNetAdds = 0;
  let projectedChurnVol = 0;
  let requiredGrossAdds = 0;
  let distLoja = 0, distPap = 0, distCentral = 0, distB2b = 0;
  let errorMsg = null;
  
  let growthInsight = null;
  let churnInsight = null;

  if (selectedCityData) {
    const base = selectedCityData.currentBase;
    targetNetAdds = Math.ceil(base * (simGrowthPerc / 100));
    projectedChurnVol = Math.ceil(base * (simChurnPerc / 100));
    requiredGrossAdds = targetNetAdds + projectedChurnVol;

    // Simulação do Histórico de 6 Meses
    const hist = selectedCityData.channels;
    const histTotal = hist.loja + hist.pap + hist.central + hist.b2b;

    if (histTotal === 0) {
      errorMsg = "A cidade não possui histórico de vendas nos últimos 6 meses para calcular a distribuição dos canais.";
    } else {
      const wLoja = hist.loja / histTotal;
      const wPap = hist.pap / histTotal;
      const wCentral = hist.central / histTotal;
      const wB2b = hist.b2b / histTotal;

      distLoja = Math.round(requiredGrossAdds * wLoja);
      distPap = Math.round(requiredGrossAdds * wPap);
      distCentral = Math.round(requiredGrossAdds * wCentral);
      distB2b = requiredGrossAdds - (distLoja + distPap + distCentral); 
    }

    // --- MOTOR DE INSIGHTS ESTRATÉGICOS (BASEADO NO HISTÓRICO DA CIDADE) ---
    const growth = simGrowthPerc;
    const histGrowth = selectedCityData.histAvgGrowth || 1.5;

    if (growth <= 0) {
      growthInsight = { 
        type: "error", 
        title: "Meta de Retração (Sangramento)", 
        message: "Seu planejamento aponta para o encolhimento da base nesta praça. Se a meta de churn for incontornável, revise as ações de retenção com urgência.", 
        color: "#ef4444", bg: "#fef2f2", icon: TrendingDown 
      };
    } else if (growth > histGrowth * 2) {
      growthInsight = { 
        type: "error", 
        title: "Meta Irrealista (> " + Math.round(histGrowth * 2) + "%)", 
        message: "Historicamente, " + selectedCityData.city + " cresce em média " + histGrowth + "% ao mês. Exigir " + growth + "% é dobrar o esforço histórico. Valide se há orçamento extra de marketing e viabilidade técnica.", 
        color: "#ef4444", bg: "#fef2f2", icon: AlertOctagon 
      };
    } else if (growth > histGrowth * 1.3) {
      growthInsight = { 
        type: "warning", 
        title: "Meta Agressiva (Desafio Forte)", 
        message: "O crescimento histórico nesta cidade é de " + histGrowth + "%. A meta de " + growth + "% exigirá um esforço comercial consideravelmente maior que a média. Trade marketing e PAP precisarão de foco total.", 
        color: "#f59e0b", bg: "#fffbeb", icon: Target 
      };
    } else if (growth < histGrowth * 0.7) {
      growthInsight = { 
        type: "info", 
        title: "Meta Conservadora (Abaixo do Histórico)", 
        message: "A praça de " + selectedCityData.city + " costuma entregar " + histGrowth + "% organicamente. Definir apenas " + growth + "% pode deixar a equipe na zona de conforto. Considere aumentar a régua.", 
        color: "#3b82f6", bg: "#eff6ff", icon: Info 
      };
    } else {
      growthInsight = { 
        type: "success", 
        title: "Meta Realista e Alinhada", 
        message: "Crescimento de " + growth + "% está perfeitamente alinhado com a média histórica de " + histGrowth + "% da cidade. O cenário é viável e os canais de venda já estão habituados a esse volume.", 
        color: "#10b981", bg: "#ecfdf5", icon: CheckCircle 
      };
    }

    // --- MOTOR DE INSIGHTS ESTRATÉGICOS (VIABILIDADE DE CHURN) ---
    const churn = simChurnPerc;
    const histChurn = selectedCityData.histAvgChurn || 1.5;

    if (churn < histChurn * 0.5) {
      churnInsight = { 
        type: "warning", 
        title: "Retenção Utópica (< " + (histChurn * 0.5).toFixed(1) + "%)", 
        message: "A média de cancelamentos em " + selectedCityData.city + " é de " + histChurn + "%. Reduzir para " + churn + "% repentinamente exigirá uma mudança brutal. Cuidado ao basear as vendas nesta projeção.", 
        color: "#f59e0b", bg: "#fffbeb", icon: AlertOctagon 
      };
    } else if (churn < histChurn * 0.85) {
      churnInsight = { 
        type: "success", 
        title: "Meta de Excelência em Retenção", 
        message: "Desafio excelente! A cidade costuma perder " + histChurn + "%. Travar o churn em " + churn + "% forçará uma atuação preventiva impecável da Ouvidoria/Retenção.", 
        color: "#10b981", bg: "#ecfdf5", icon: ShieldCheck 
      };
    } else if (churn <= histChurn * 1.1) {
      churnInsight = { 
        type: "info", 
        title: "Evasão Padrão (Conforme Histórico)", 
        message: "Projetar " + churn + "% está dentro do comportamento histórico (" + histChurn + "%) de " + selectedCityData.city + ". O funil de vendas cobrirá as perdas habituais.", 
        color: "#3b82f6", bg: "#eff6ff", icon: Info 
      };
    } else {
      churnInsight = { 
        type: "error", 
        title: "Alerta Crítico: Degradação de Base", 
        message: "Aceitar um churn de " + churn + "% é assumir um cenário pior que a média histórica local de " + histChurn + "%. Essa evasão vai engolir quase todo o esforço bruto de vendas.", 
        color: "#ef4444", bg: "#fef2f2", icon: TrendingDown 
      };
    }
  }

  return (
    <div style={{animation: 'fadeIn 0.3s'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px'}}>
        <div>
          <h2 style={{fontSize:'22px', fontWeight:'bold', color:'white', margin:0, display:'flex', alignItems:'center', gap:'10px'}}>
            <Lightbulb size={24} color="#f59e0b"/> Inteligência de Metas (S&OP)
          </h2>
          <p style={{color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0'}}>
            Distribuição de metas baseada no comportamento histórico dos <strong style={{color:'#f8fafc'}}>últimos 6 meses</strong> de cada praça.
          </p>
        </div>
      </div>

      <div style={{display: 'flex', gap: '30px', flexWrap: 'wrap'}}>
        {/* PAINEL DE CONTROLE (INPUTS) */}
        <div style={{flex: 1, minWidth: '300px', background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '25px', display:'flex', flexDirection:'column'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
              <Sliders size={20} color="#3b82f6"/>
              <h3 style={{color: 'white', margin: 0, fontSize: '16px'}}>Parâmetros da Cidade</h3>
           </div>

           <div style={styles.form}>
             <div style={styles.field}>
               <label style={styles.label}>Selecione a Praça</label>
               <select style={styles.select} value={simCityId} onChange={e => setSimCityId(e.target.value)}>
                 {processedData.map(c => <option key={c.id} value={c.id}>{c.city} (Penetração: {c.penetration}%)</option>)}
               </select>
             </div>

             <div style={styles.field}>
               <label style={styles.label}>Meta de Crescimento Líquido (%)</label>
               <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                 <input type="range" min="-5" max="10" step="0.1" value={simGrowthPerc} onChange={e => setSimGrowthPerc(parseFloat(e.target.value))} style={{flex: 1}} />
                 <span style={{background: '#0f172a', padding: '8px 12px', borderRadius: '8px', color: '#10b981', fontWeight: 'bold', minWidth: '50px', textAlign: 'center'}}>{simGrowthPerc}%</span>
               </div>
             </div>

             <div style={styles.field}>
               <label style={styles.label}>Trava de Churn Permitido (%)</label>
               <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                 <input type="range" min="0" max="5" step="0.1" value={simChurnPerc} onChange={e => setSimChurnPerc(parseFloat(e.target.value))} style={{flex: 1}} />
                 <span style={{background: '#0f172a', padding: '8px 12px', borderRadius: '8px', color: '#ef4444', fontWeight: 'bold', minWidth: '50px', textAlign: 'center'}}>{simChurnPerc}%</span>
               </div>
             </div>
           </div>

           {selectedCityData && (
              <div style={{marginTop: 'auto', paddingTop: '20px'}}>
                  <div style={{padding: '15px', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155'}}>
                     <p style={{fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: '1.6'}}>
                       Base atual de <strong>{selectedCityData.city}</strong>: {selectedCityData.currentBase} clientes.<br/>
                       Para crescer <strong>{simGrowthPerc}%</strong>, o alvo é <strong>+{targetNetAdds}</strong> clientes líquidos.<br/>
                       Aceitando um vazamento de <strong>{simChurnPerc}%</strong> ({projectedChurnVol} cancelamentos), 
                       a operação precisa trazer <strong>{requiredGrossAdds} Vendas Brutas (Gross Adds)</strong>.
                     </p>
                  </div>
              </div>
           )}
        </div>

        {/* RESULTADO (SLA) E INSIGHTS */}
        <div style={{flex: 1.5, minWidth: '400px', display:'flex', flexDirection:'column', gap: '20px'}}>
           {errorMsg ? (
             <div style={{padding: '40px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '20px', color: '#fca5a5', textAlign: 'center'}}>
               <AlertTriangle size={32} style={{marginBottom: '10px'}} />
               <p>{errorMsg}</p>
             </div>
           ) : selectedCityData && (
             <div style={{background: '#f8fafc', borderRadius: '20px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column'}}>
               <h3 style={{fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: '0 0 20px 0'}}>
                 Acordo de Nível de Serviço (SLA) de Vendas
               </h3>
               <p style={{fontSize: '13px', color: '#64748b', marginBottom: '25px'}}>
                 Com base na média histórica (6 meses) de tração em <strong>{selectedCityData.city}</strong>, as {requiredGrossAdds} vendas brutas necessárias para bater a meta da cidade devem ser cobradas da seguinte forma:
               </p>

               <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px'}}>
                  <div style={{background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px'}}>
                     <div style={{background: '#ecfdf5', color: '#10b981', padding: '12px', borderRadius: '12px'}}><Store size={24}/></div>
                     <div>
                       <span style={{display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase'}}>Meta Lojas Oquei</span>
                       <span style={{fontSize: '24px', fontWeight: '900', color: '#1e293b'}}>{distLoja} <small style={{fontSize:'12px', color:'#10b981'}}>vendas</small></span>
                     </div>
                  </div>

                  <div style={{background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px'}}>
                     <div style={{background: '#fff7ed', color: '#ea580c', padding: '12px', borderRadius: '12px'}}><MapPin size={24}/></div>
                     <div>
                       <span style={{display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase'}}>Meta Equipe PAP</span>
                       <span style={{fontSize: '24px', fontWeight: '900', color: '#1e293b'}}>{distPap} <small style={{fontSize:'12px', color:'#ea580c'}}>vendas</small></span>
                     </div>
                  </div>

                  <div style={{background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px'}}>
                     <div style={{background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px'}}><Headset size={24}/></div>
                     <div>
                       <span style={{display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase'}}>Meta Central de Vendas</span>
                       <span style={{fontSize: '24px', fontWeight: '900', color: '#1e293b'}}>{distCentral} <small style={{fontSize:'12px', color:'#2563eb'}}>vendas</small></span>
                     </div>
                  </div>

                  <div style={{background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px'}}>
                     <div style={{background: '#faf5ff', color: '#9333ea', padding: '12px', borderRadius: '12px'}}><Briefcase size={24}/></div>
                     <div>
                       <span style={{display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase'}}>Meta B2B Empresas</span>
                       <span style={{fontSize: '24px', fontWeight: '900', color: '#1e293b'}}>{distB2b} <small style={{fontSize:'12px', color:'#9333ea'}}>vendas</small></span>
                     </div>
                  </div>
               </div>

               <div style={{marginTop: '20px', padding: '15px', background: '#eff6ff', borderRadius: '12px', borderLeft: '4px solid #3b82f6'}}>
                  <p style={{fontSize: '12px', color: '#1e3a8a', margin: 0}}>
                    <strong>💡 Distribuição da Força de Vendas:</strong> A dependência das vendas da loja local (Receptivo) nesta praça é de <strong>{requiredGrossAdds > 0 ? Math.round((distLoja/requiredGrossAdds)*100) : 0}%</strong>.
                  </p>
               </div>
             </div>
           )}

           {/* CAIXA DE INSIGHTS (DUPLA) */}
           {selectedCityData && (
             <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
               {growthInsight && (
                 <div style={{padding: '20px', background: growthInsight.bg, borderRadius: '16px', border: "1px solid " + growthInsight.color + "40", display: 'flex', gap: '15px', alignItems: 'flex-start', animation: 'fadeIn 0.4s ease-out'}}>
                    <div style={{padding: '10px', background: 'white', borderRadius: '12px', color: growthInsight.color, boxShadow: "0 2px 10px " + growthInsight.color + "20"}}>
                      <growthInsight.icon size={24} />
                    </div>
                    <div>
                      <h4 style={{margin: '0 0 5px 0', color: growthInsight.color, fontSize: '15px', fontWeight: '900', letterSpacing: '-0.02em'}}>{growthInsight.title}</h4>
                      <p style={{margin: 0, color: '#334155', fontSize: '13px', lineHeight: '1.5', fontWeight: '500'}}>{growthInsight.message}</p>
                    </div>
                 </div>
               )}

               {churnInsight && (
                 <div style={{padding: '20px', background: churnInsight.bg, borderRadius: '16px', border: "1px solid " + churnInsight.color + "40", display: 'flex', gap: '15px', alignItems: 'flex-start', animation: 'fadeIn 0.6s ease-out'}}>
                    <div style={{padding: '10px', background: 'white', borderRadius: '12px', color: churnInsight.color, boxShadow: "0 2px 10px " + churnInsight.color + "20"}}>
                      <churnInsight.icon size={24} />
                    </div>
                    <div>
                      <h4 style={{margin: '0 0 5px 0', color: churnInsight.color, fontSize: '15px', fontWeight: '900', letterSpacing: '-0.02em'}}>{churnInsight.title}</h4>
                      <p style={{margin: 0, color: '#334155', fontSize: '13px', lineHeight: '1.5', fontWeight: '500'}}>{churnInsight.message}</p>
                    </div>
                 </div>
               )}
             </div>
           )}

        </div>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---
export default function LaboratorioChurn({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  // TABS REORDENÁVEIS
  const DEFAULT_TABS = [
    { id: 'radar', label: 'Radar de Cidades', icon: Crosshair },
    { id: 'projecoes', label: 'Projeções de Fechamento', icon: Zap },
    { id: 'inteligencia', label: 'Inteligência de Metas', icon: Lightbulb },
    { id: 'omnichannel', label: 'Vendas Omnichannel', icon: Share2 },
    { id: 'relacionamento', label: 'Relacionamento & Churn', icon: Headset }
  ];

  const [tabsOrder, setTabsOrder] = useState(() => {
    const saved = localStorage.getItem('oquei_churn_tabs');
    if (saved) return JSON.parse(saved);
    return DEFAULT_TABS.map(t => t.id);
  });

  const [activeLabTab, setActiveLabTab] = useState(tabsOrder[0] || 'radar');
  const [draggedTab, setDraggedTab] = useState(null);

  // Dados Core
  const [cityMetrics, setCityMetrics] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  
  // UI State (Radar)
  const [selectedCity, setSelectedCity] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ title: '', problem: '', expected: '', relatedReason: '' });

  // UI State (Alimentação em Massa)
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState('sales'); 
  const [entryForm, setEntryForm] = useState({ 
    month: selectedMonth, cityId: '', 
    pap: '', b2b: '', central: '', 
    concorrencia: '', tecnico: '', mudanca: '', financeiro: '', outros: '' 
  });

  // Catálogo de Motivos de Cancelamento
  const CHURN_REASONS = [
    { id: 'concorrencia', label: 'Concorrência (Oferta/Preço)', color: '#ef4444' },
    { id: 'tecnico', label: 'Insatisfação Técnica/Suporte', color: '#f59e0b' },
    { id: 'mudanca', label: 'Mudança de Endereço/Cidade', color: '#64748b' },
    { id: 'financeiro', label: 'Financeiro / Inadimplência', color: '#3b82f6' },
    { id: 'outros', label: 'Outros Motivos', color: '#94a3b8' }
  ];

  // --- MOCK DATA PARA PREVIEW ---
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const mockMetrics = [
        {
          id: '1', city: 'Bady Bassitt', hps: 5000, baseStart: 1200, targetNetAdds: 50,
          channels: { loja: 25, pap: 15, central: 5, b2b: 5 }, 
          cancelReasons: { concorrencia: 8, tecnico: 5, mudanca: 4, financeiro: 3, outros: 0 },
          histAvgGrowth: 3.2, histAvgChurn: 1.8 
        },
        {
          id: '2', city: 'Borborema', hps: 3500, baseStart: 850, targetNetAdds: 20,
          channels: { loja: 10, pap: 5, central: 2, b2b: 0 }, 
          cancelReasons: { concorrencia: 15, tecnico: 5, mudanca: 2, financeiro: 3, outros: 0 },
          histAvgGrowth: 1.5, histAvgChurn: 2.8 
        },
        {
          id: '3', city: 'Nova Aliança', hps: 2000, baseStart: 1700, targetNetAdds: 10,
          channels: { loja: 15, pap: 1, central: 2, b2b: 0 }, 
          cancelReasons: { concorrencia: 2, tecnico: 1, mudanca: 1, financeiro: 1, outros: 0 },
          histAvgGrowth: 0.8, histAvgChurn: 0.6 
        },
        {
          id: '4', city: 'Nova Granada', hps: 4200, baseStart: 950, targetNetAdds: 30,
          channels: { loja: 20, pap: 10, central: 8, b2b: 2 }, 
          cancelReasons: { concorrencia: 5, tecnico: 2, mudanca: 5, financeiro: 3, outros: 0 },
          histAvgGrowth: 2.5, histAvgChurn: 1.4 
        }
      ];

      const mockPlans = [
        { id: '101', cityId: '2', city: 'Borborema', title: 'Mutirão PAP Centro', status: 'Em Andamento', problem: 'Evasão para concorrência X', relatedReason: 'concorrencia', expected: 'Recuperar 10 clientes' }
      ];

      setCityMetrics(mockMetrics);
      setActionPlans(mockPlans);
      
      setLoading(false);
    }, 800);
  }, [selectedMonth]);

  // --- CÁLCULO DE DIAS ÚTEIS (PARA PROJEÇÕES) ---
  const globalCalendar = useMemo(() => {
    const parts = selectedMonth.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; 
    
    const lastDay = new Date(y, m + 1, 0).getDate();
    let total = 0; let worked = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    for (let i = 1; i <= lastDay; i++) {
        const dateObj = new Date(y, m, i);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        total++;
        if (y < currentYear || (y === currentYear && m < currentMonth) || (y === currentYear && m === currentMonth && i <= currentDate)) {
            worked++;
        }
    }
    if (y > currentYear || (y === currentYear && m > currentMonth)) worked = 0;
    return { total: total || 22, worked: worked || 1, remaining: (total - worked) || 21 };
  }, [selectedMonth]);

  // --- PROCESSAMENTO DO MOTOR BI (COM PROJEÇÕES) ---
  const processedData = useMemo(() => {
    const { worked, total } = globalCalendar;
    const workRatio = worked > 0 ? (total / worked) : 0;

    return cityMetrics.map(city => {
      const totalSales = Object.values(city.channels).reduce((a, b) => a + b, 0);
      const cancelations = Object.values(city.cancelReasons).reduce((a, b) => a + b, 0);
      
      const netAdds = totalSales - cancelations;
      const currentBase = city.baseStart + netAdds;
      const churnRate = ((cancelations / city.baseStart) * 100).toFixed(1);
      const penetration = ((currentBase / city.hps) * 100).toFixed(1);
      const targetPerc = city.targetNetAdds > 0 ? Math.min((Math.max(netAdds, 0) / city.targetNetAdds) * 100, 100).toFixed(0) : 0;
      
      let health = 'green';
      if (netAdds < 0) health = 'red'; 
      else if (netAdds < city.targetNetAdds) health = 'yellow'; 

      const projSales = Math.floor(totalSales * workRatio);
      const projCancelations = Math.floor(cancelations * workRatio);
      const projNetAdds = projSales - projCancelations;
      const projBase = city.baseStart + projNetAdds;
      const projChurnRate = ((projCancelations / city.baseStart) * 100).toFixed(1);
      const projPenetration = ((projBase / city.hps) * 100).toFixed(1);
      const projTargetPerc = city.targetNetAdds > 0 ? Math.min((Math.max(projNetAdds, 0) / city.targetNetAdds) * 100, 100).toFixed(0) : 0;

      let projHealth = 'green';
      if (projNetAdds < 0) projHealth = 'red';
      else if (projNetAdds < city.targetNetAdds) projHealth = 'yellow';

      return {
        ...city,
        totalSales, cancelations, netAdds, currentBase, churnRate, penetration, targetPerc, health,
        projSales, projCancelations, projNetAdds, projBase, projChurnRate, projPenetration, projTargetPerc, projHealth
      };
    }).sort((a, b) => b.netAdds - a.netAdds);
  }, [cityMetrics, globalCalendar]);

  // --- ESTATÍSTICAS GLOBAIS ---
  const globalStats = useMemo(() => {
    if (processedData.length === 0) return null;
    const tBase = processedData.reduce((acc, c) => acc + c.currentBase, 0);
    const tSales = processedData.reduce((acc, c) => acc + c.totalSales, 0);
    const tCancels = processedData.reduce((acc, c) => acc + c.cancelations, 0);
    const tNet = tSales - tCancels;
    const avgChurn = ((tCancels / (tBase - tNet)) * 100).toFixed(2);
    
    const channelsTotal = { loja: 0, pap: 0, central: 0, b2b: 0 };
    const reasonsTotal = { concorrencia: 0, tecnico: 0, mudanca: 0, financeiro: 0, outros: 0 };

    processedData.forEach(c => {
      channelsTotal.loja += c.channels.loja;
      channelsTotal.pap += c.channels.pap;
      channelsTotal.central += c.channels.central;
      channelsTotal.b2b += c.channels.b2b;
      
      reasonsTotal.concorrencia += c.cancelReasons.concorrencia;
      reasonsTotal.tecnico += c.cancelReasons.tecnico;
      reasonsTotal.mudanca += c.cancelReasons.mudanca;
      reasonsTotal.financeiro += c.cancelReasons.financeiro;
      reasonsTotal.outros += c.cancelReasons.outros;
    });
    
    return { tBase, tSales, tCancels, tNet, avgChurn, channelsTotal, reasonsTotal };
  }, [processedData]);

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e, id) => {
    setDraggedTab(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (draggedTab === targetId) return;

    const newOrder = [...tabsOrder];
    const draggedIndex = newOrder.indexOf(draggedTab);
    const targetIndex = newOrder.indexOf(targetId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTab);

    setTabsOrder(newOrder);
    localStorage.setItem('oquei_churn_tabs', JSON.stringify(newOrder));
    setDraggedTab(null);
  };

  // --- HANDLERS ---
  const handleSavePlan = (e) => {
    e.preventDefault();
    if (!selectedCity) return;
    const newPlan = {
      id: Date.now().toString(),
      cityId: selectedCity.id,
      city: selectedCity.city,
      title: planForm.title,
      problem: planForm.problem,
      relatedReason: planForm.relatedReason,
      expected: planForm.expected,
      status: 'Planejado'
    };
    setActionPlans([newPlan, ...actionPlans]);
    setShowPlanModal(false);
    setPlanForm({ title: '', problem: '', expected: '', relatedReason: '' });
    alert("Plano de Ação registado na Clínica!");
  };

  const openDataEntry = (type) => {
    setEntryType(type);
    setEntryForm({ 
      month: selectedMonth, cityId: '', 
      pap: '', b2b: '', central: '', 
      concorrencia: '', tecnico: '', mudanca: '', financeiro: '', outros: '' 
    });
    setShowEntryModal(true);
  };

  const handleSaveDataEntry = (e) => {
    e.preventDefault();
    if (!entryForm.cityId || !entryForm.month) return alert("Selecione a cidade e o mês de referência.");
    
    const updatedMetrics = cityMetrics.map(city => {
      if (city.id === entryForm.cityId) {
        if (entryType === 'sales') {
          return {
            ...city,
            channels: {
              ...city.channels,
              pap: parseInt(entryForm.pap) || 0,
              central: parseInt(entryForm.central) || 0,
              b2b: parseInt(entryForm.b2b) || 0
            }
          };
        } else {
          return {
            ...city,
            cancelReasons: {
              ...city.cancelReasons,
              concorrencia: parseInt(entryForm.concorrencia) || 0,
              tecnico: parseInt(entryForm.tecnico) || 0,
              mudanca: parseInt(entryForm.mudanca) || 0,
              financeiro: parseInt(entryForm.financeiro) || 0,
              outros: parseInt(entryForm.outros) || 0
            }
          };
        }
      }
      return city;
    });

    setCityMetrics(updatedMetrics);
    setShowEntryModal(false);
    alert('Lote de ' + (entryType === 'sales' ? 'Vendas Externas' : 'Cancelamentos') + ' substituído e integrado ao painel!');
  };

  if (loading) {
    return <div style={styles.loadingContainer}><Activity size={48} color="#3b82f6" style={{animation: 'pulse 1.5s infinite'}} /><h2>Inicializando Laboratório Churn...</h2></div>;
  }

  // --- SUB-VIEWS ---

  const RadarView = () => (
    <div style={styles.mainLayout}>
      <div style={styles.radarColumn}>
        <h3 style={styles.sectionTitle}><Crosshair size={20} color="#3b82f6"/> Radar de Cidades</h3>
        <div style={styles.cityList}>
          {processedData.map(city => {
            const isSelected = selectedCity?.id === city.id;
            const healthColor = city.health === 'green' ? '#10b981' : city.health === 'yellow' ? '#f59e0b' : '#ef4444';
            
            return (
              <div 
                key={city.id} 
                onClick={() => setSelectedCity(city)}
                style={{
                  ...styles.cityCard, 
                  borderColor: isSelected ? '#3b82f6' : '#1e293b',
                  background: isSelected ? '#1e293b' : '#0f172a'
                }}
              >
                <div style={styles.cityCardHeader}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <div style={{
                      width:'12px', height:'12px', borderRadius:'50%', 
                      background: healthColor,
                      boxShadow: '0 0 10px ' + healthColor
                    }}/>
                    <h4 style={styles.cityName}>{city.city}</h4>
                  </div>
                  <span style={styles.penetrationBadge}>{city.penetration + '%'} Domínio</span>
                </div>
                
                <div style={styles.cityCardMetrics}>
                  <div style={styles.metricMicro}>
                    <span>Net Adds</span>
                    <strong style={{color: city.netAdds >= 0 ? '#10b981' : '#ef4444'}}>{city.netAdds > 0 ? '+' : ''}{city.netAdds}</strong>
                  </div>
                  <div style={styles.metricMicro}>
                    <span>Meta Net</span>
                    <strong style={{color:'#cbd5e1'}}>{city.targetNetAdds}</strong>
                  </div>
                  <div style={styles.metricMicro}>
                    <span>Churn</span>
                    <strong style={{color: city.churnRate > 2.5 ? '#ef4444' : '#f59e0b'}}>{city.churnRate + '%'}</strong>
                  </div>
                </div>

                <div style={{marginTop:'15px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#94a3b8', marginBottom:'4px'}}>
                    <span>Alcance Meta Líquida</span>
                    <span>{city.targetPerc + '%'}</span>
                  </div>
                  <div style={{width:'100%', height:'4px', background:'#1e293b', borderRadius:'2px', overflow:'hidden'}}>
                    <div style={{height:'100%', background: city.health === 'red' ? '#ef4444' : '#3b82f6', width: city.targetPerc + '%'}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.detailsColumn}>
        {!selectedCity ? (
          <div style={styles.emptySelect}>
            <MapPin size={48} color="#1e293b" style={{marginBottom:'15px'}}/>
            <h3>Selecione uma cidade no Radar</h3>
            <p>Analise o funil de crescimento e os planos de ação específicos.</p>
          </div>
        ) : (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px'}}>
              <h2 style={{fontSize:'28px', fontWeight:'900', color:'white', margin:0}}>Raio-X: {selectedCity.city}</h2>
              <div style={{textAlign:'right'}}>
                <span style={{fontSize:'12px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'bold'}}>Base Atual</span>
                <div style={{fontSize:'24px', fontWeight:'900', color:'#3b82f6'}}>{selectedCity.currentBase} <span style={{fontSize:'12px', color:'#64748b'}}>/ {selectedCity.hps} HPs</span></div>
              </div>
            </div>

            <div style={styles.funnelContainer}>
              <div style={styles.funnelBox}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#10b981', marginBottom:'10px'}}>
                  <TrendingUp size={24}/> <span style={{fontWeight:'bold'}}>Entradas (Gross)</span>
                </div>
                <h3 style={{fontSize:'32px', margin:0, color:'white'}}>{selectedCity.totalSales}</h3>
                <div style={{fontSize:'12px', color:'#94a3b8', marginTop:'5px'}}>
                  {selectedCity.channels.loja} Loja • {selectedCity.channels.pap} PAP • {selectedCity.channels.central} Central
                </div>
              </div>

              <div style={{display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', fontSize:'24px', fontWeight:'bold'}}>-</div>

              <div style={{...styles.funnelBox, borderTop: '4px solid #ef4444'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#ef4444', marginBottom:'10px'}}>
                  <TrendingDown size={24}/> <span style={{fontWeight:'bold'}}>Saídas (Cancel.)</span>
                </div>
                <h3 style={{fontSize:'32px', margin:0, color:'white'}}>{selectedCity.cancelations}</h3>
                <div style={{fontSize:'12px', color:'#ef4444', marginTop:'5px', fontWeight:'bold'}}>
                  Churn: {selectedCity.churnRate + '%'}
                </div>
              </div>

              <div style={{display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', fontSize:'24px', fontWeight:'bold'}}>=</div>

              <div style={{...styles.funnelBox, background: selectedCity.health === 'red' ? 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)' : 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', borderTop:'none'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', color: selectedCity.health === 'red' ? '#fca5a5' : '#6ee7b7', marginBottom:'10px'}}>
                  <Target size={24}/> <span style={{fontWeight:'bold'}}>Resultado (Net)</span>
                </div>
                <h3 style={{fontSize:'36px', margin:0, color:'white'}}>{selectedCity.netAdds > 0 ? '+' : ''}{selectedCity.netAdds}</h3>
                <div style={{fontSize:'12px', color: selectedCity.health === 'red' ? '#fca5a5' : '#6ee7b7', marginTop:'5px'}}>
                  Meta Mês: {selectedCity.targetNetAdds}
                </div>
              </div>
            </div>

            <div style={styles.clinicSection}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <h3 style={{fontSize:'18px', fontWeight:'bold', color:'white', display:'flex', alignItems:'center', gap:'10px'}}>
                  <ShieldAlert size={20} color="#f59e0b"/> Clínica (Planos de Ação)
                </h3>
                <button onClick={() => setShowPlanModal(true)} style={styles.btnAction}>
                  <Plus size={16}/> Nova Ação
                </button>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                {actionPlans.filter(p => p.cityId === selectedCity.id).map(plan => {
                  const reasonLabel = CHURN_REASONS.find(r => r.id === plan.relatedReason)?.label || 'Geral';
                  return (
                    <div key={plan.id} style={styles.planCard}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                        <h4 style={{margin:0, color:'white', fontSize:'15px'}}>{plan.title}</h4>
                        <span style={{fontSize:'10px', padding:'4px 8px', borderRadius:'12px', background:'#1e3a8a', color:'#60a5fa', fontWeight:'bold'}}>{plan.status}</span>
                      </div>
                      <div style={{fontSize:'11px', color:'#94a3b8', marginBottom:'10px', display:'flex', alignItems:'center', gap:'5px'}}>
                         <AlertTriangle size={12}/> Combate à: {reasonLabel}
                      </div>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', fontSize:'13px'}}>
                        <div>
                          <strong style={{color:'#f87171', display:'block', marginBottom:'4px'}}>Problema Foco:</strong>
                          <span style={{color:'#cbd5e1'}}>{plan.problem}</span>
                        </div>
                        <div>
                          <strong style={{color:'#6ee7b7', display:'block', marginBottom:'4px'}}>Resultado Esperado:</strong>
                          <span style={{color:'#cbd5e1'}}>{plan.expected}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {actionPlans.filter(p => p.cityId === selectedCity.id).length === 0 && (
                  <p style={{color:'#64748b', fontStyle:'italic', fontSize:'13px', textAlign:'center', padding:'20px'}}>
                    Nenhum plano de ação ativo para esta cidade.
                  </p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );

  const OmnichannelView = () => {
    const channelGoals = { loja: 50, pap: 30, central: 15, b2b: 10 };

    const OmniCard = ({ title, value, goal, icon: Icon, color }) => {
      const perc = Math.min((value / goal) * 100, 100).toFixed(0);
      return (
        <div style={{background: '#1e293b', border: '1px solid ' + color + '40', padding: '20px', borderRadius: '16px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'15px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', color: color}}>
              <Icon size={24} />
              <h3 style={{margin:0, fontSize:'16px', fontWeight:'bold', color:'white'}}>{title}</h3>
            </div>
            <span style={{fontSize:'24px', fontWeight:'900', color:'white'}}>{value}</span>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#94a3b8', marginBottom:'5px'}}>
            <span>Meta: {goal}</span>
            <span style={{color: color, fontWeight:'bold'}}>{perc + '%'} Alcançado</span>
          </div>
          <div style={{width:'100%', height:'6px', background:'#0f172a', borderRadius:'3px', overflow:'hidden'}}>
            <div style={{height:'100%', background: color, width: perc + '%'}}></div>
          </div>
        </div>
      );
    };

    return (
      <div style={{animation: 'fadeIn 0.3s'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h2 style={{fontSize:'22px', fontWeight:'bold', color:'white', margin:0, display:'flex', alignItems:'center', gap:'10px'}}>
            <Share2 size={24} color="#3b82f6"/> Performance Omnichannel
          </h2>
          <button onClick={() => openDataEntry('sales')} style={{...styles.btnDanger, background: '#2563eb', boxShadow: '0 4px 10px rgba(37,99,235,0.2)'}}>
            <UploadCloud size={16} /> Alimentar Dados (Massa)
          </button>
        </div>
        
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'20px', marginBottom:'30px'}}>
          <OmniCard title="Lojas Físicas (CRM)" value={globalStats.channelsTotal.loja} goal={channelGoals.loja} icon={Store} color="#10b981" />
          <OmniCard title="Porta a Porta (PAP)" value={globalStats.channelsTotal.pap} goal={channelGoals.pap} icon={MapPin} color="#f59e0b" />
          <OmniCard title="Central de Vendas" value={globalStats.channelsTotal.central} goal={channelGoals.central} icon={Headset} color="#2563eb" />
          <OmniCard title="Oquei Empresas" value={globalStats.channelsTotal.b2b} goal={channelGoals.b2b} icon={Briefcase} color="#8b5cf6" />
        </div>

        <div style={{background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden'}}>
          <div style={{padding: '20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid #334155'}}>
            <h3 style={{margin:0, fontSize:'16px', color:'white'}}>Detalhamento por Praça</h3>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse', color:'white', fontSize:'14px'}}>
            <thead>
              <tr style={{background:'#0f172a', color:'#94a3b8', fontSize:'12px', textTransform:'uppercase'}}>
                <th style={{padding:'15px', textAlign:'left'}}>Cidade</th>
                <th style={{padding:'15px', textAlign:'center'}}>Loja</th>
                <th style={{padding:'15px', textAlign:'center'}}>PAP</th>
                <th style={{padding:'15px', textAlign:'center'}}>Central</th>
                <th style={{padding:'15px', textAlign:'center'}}>B2B</th>
                <th style={{padding:'15px', textAlign:'center'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map(c => (
                <tr key={c.id} style={{borderBottom:'1px solid #334155'}}>
                  <td style={{padding:'15px', fontWeight:'bold'}}>{c.city}</td>
                  <td style={{padding:'15px', textAlign:'center', color:'#10b981'}}>{c.channels.loja}</td>
                  <td style={{padding:'15px', textAlign:'center', color:'#f59e0b'}}>{c.channels.pap}</td>
                  <td style={{padding:'15px', textAlign:'center', color:'#2563eb'}}>{c.channels.central}</td>
                  <td style={{padding:'15px', textAlign:'center', color:'#8b5cf6'}}>{c.channels.b2b}</td>
                  <td style={{padding:'15px', textAlign:'center', fontWeight:'bold', background:'rgba(255,255,255,0.02)'}}>{c.totalSales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const RelacionamentoView = () => {
    return (
      <div style={{animation: 'fadeIn 0.3s'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h2 style={{fontSize:'22px', fontWeight:'bold', color:'white', margin:0, display:'flex', alignItems:'center', gap:'10px'}}>
            <AlertTriangle size={24} color="#ef4444"/> Gestão de Cancelamentos (Churn)
          </h2>
          <button onClick={() => openDataEntry('churn')} style={styles.btnDanger}>
            <UploadCloud size={16} /> Alimentar Dados (Massa)
          </button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'30px', alignItems:'start'}}>
          
          {/* PAINEL DE MOTIVOS (RESUMO GERAL) */}
          <div style={{background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '25px'}}>
            <h3 style={{fontSize:'16px', color:'white', marginBottom:'20px', display:'flex', gap:'8px', alignItems:'center'}}>
              <PieChart size={18} color="#94a3b8"/> Catálogo de Motivos (Rede)
            </h3>
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              {CHURN_REASONS.map(reason => {
                const count = globalStats.reasonsTotal[reason.id] || 0;
                const perc = globalStats.tCancels > 0 ? ((count / globalStats.tCancels) * 100).toFixed(1) : 0;
                return (
                  <div key={reason.id}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#cbd5e1', marginBottom:'5px', fontWeight:'bold'}}>
                      <span>{reason.label}</span>
                      <span style={{color: reason.color}}>{count} ({perc + '%'})</span>
                    </div>
                    <div style={{width:'100%', height:'6px', background:'#0f172a', borderRadius:'3px', overflow:'hidden'}}>
                      <div style={{height:'100%', background: reason.color, width: perc + '%'}}></div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{marginTop:'30px', paddingTop:'20px', borderTop:'1px solid #334155', textAlign:'center'}}>
              <div style={{fontSize:'12px', color:'#94a3b8', textTransform:'uppercase'}}>Total de Cancelamentos</div>
              <div style={{fontSize:'36px', fontWeight:'900', color:'#ef4444'}}>{globalStats.tCancels}</div>
            </div>
          </div>

          {/* TABELA POR CIDADE E MOTIVO */}
          <div style={{background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden'}}>
            <div style={{padding: '20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid #334155'}}>
              <h3 style={{margin:0, fontSize:'16px', color:'white'}}>Sangramento por Cidade (Drill-down)</h3>
            </div>
            <div style={{overflowX: 'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', color:'white', fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#0f172a', color:'#94a3b8', fontSize:'11px', textTransform:'uppercase'}}>
                    <th style={{padding:'15px', textAlign:'left'}}>Cidade</th>
                    <th style={{padding:'15px', textAlign:'center'}}>Concorrência</th>
                    <th style={{padding:'15px', textAlign:'center'}}>Técnico</th>
                    <th style={{padding:'15px', textAlign:'center'}}>Financeiro</th>
                    <th style={{padding:'15px', textAlign:'center'}}>Mudança</th>
                    <th style={{padding:'15px', textAlign:'center'}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.map(c => (
                    <tr key={c.id} style={{borderBottom:'1px solid #334155'}}>
                      <td style={{padding:'15px', fontWeight:'bold'}}>{c.city}</td>
                      <td style={{padding:'15px', textAlign:'center', color:'#ef4444', fontWeight: c.cancelReasons.concorrencia > 0 ? 'bold' : 'normal'}}>{c.cancelReasons.concorrencia}</td>
                      <td style={{padding:'15px', textAlign:'center', color:'#f59e0b'}}>{c.cancelReasons.tecnico}</td>
                      <td style={{padding:'15px', textAlign:'center', color:'#3b82f6'}}>{c.cancelReasons.financeiro}</td>
                      <td style={{padding:'15px', textAlign:'center', color:'#64748b'}}>{c.cancelReasons.mudanca}</td>
                      <td style={{padding:'15px', textAlign:'center', fontWeight:'bold', background:'rgba(239,68,68,0.1)', color:'#fca5a5'}}>{c.cancelations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const ProjecoesView = () => (
    <div style={{animation: 'fadeIn 0.3s'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div>
          <h2 style={{fontSize:'22px', fontWeight:'bold', color:'white', margin:0, display:'flex', alignItems:'center', gap:'10px'}}>
            <Zap size={24} color="#f59e0b"/> Simulador de Fechamento do Mês
          </h2>
          <p style={{color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0'}}>
            Projeções baseadas no ritmo (Run Rate) dos {globalCalendar.worked} dias úteis trabalhados até agora. Faltam {globalCalendar.remaining} dias.
          </p>
        </div>
      </div>

      <div style={styles.gridCards}>
         {processedData.map(city => {
           const projHealthColor = city.projHealth === 'green' ? '#10b981' : city.projHealth === 'yellow' ? '#f59e0b' : '#ef4444';
           
           return (
             <div key={city.id} style={{background: '#1e293b', border: '1px solid ' + projHealthColor + '40', borderRadius: '16px', padding: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                   <h3 style={{color: 'white', margin: 0, fontSize: '18px', fontWeight: 'bold'}}>{city.city}</h3>
                   <span style={{background: projHealthColor + '20', color: projHealthColor, padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold'}}>
                      META LÍQUIDA: {city.targetNetAdds}
                   </span>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                   <ProjRow label="Vendas Brutas" current={city.totalSales} proj={city.projSales} color="#3b82f6" />
                   <ProjRow label="Cancelamentos" current={city.cancelations} proj={city.projCancelations} color="#ef4444" />
                   <ProjRow label="Cresc. Líquido (Net)" current={city.netAdds} proj={city.projNetAdds} color={projHealthColor} bold />
                   <ProjRow label="Taxa de Churn" current={city.churnRate + '%'} proj={city.projChurnRate + '%'} color="#f59e0b" />
                   <ProjRow label="Penetração HPs" current={city.penetration + '%'} proj={city.projPenetration + '%'} color="#10b981" />
                </div>
             </div>
           )
         })}
      </div>
    </div>
  );

  const ProjRow = ({ label, current, proj, color, bold }) => (
     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155'}}>
        <span style={{fontSize: '12px', color: '#94a3b8', fontWeight: bold ? 'bold' : 'normal'}}>{label}</span>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
           <span style={{fontSize: '13px', color: '#cbd5e1', width: '40px', textAlign: 'right'}}>{current}</span>
           <ArrowRight size={12} color="#64748b" />
           <span style={{fontSize: '14px', fontWeight: 'bold', color: color, width: '40px', textAlign: 'right'}}>{proj}</span>
        </div>
     </div>
  );

  return (
    <div style={styles.pageContainer}>
      
      {/* HEADER PRINCIPAL COM SAUDAÇÃO DINÂMICA */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBox}><Activity size={32} color="#3b82f6" /></div>
          <div>
            <h1 style={styles.title}>Laboratório Churn</h1>
            <p style={styles.subtitle}>
              Olá, {userData?.name?.split(' ')[0] || 'Gestor'}! Dados processados com base nas informações até hoje, {new Date().toLocaleDateString('pt-BR')}.
            </p>
          </div>
        </div>

        <div style={styles.monthSelector}>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => { setSelectedMonth(e.target.value); setSelectedCity(null); }} 
            style={styles.monthInput} 
          />
        </div>
      </div>

      {/* KPI GLOBAIS COMUNS */}
      {globalStats && (
        <div style={styles.globalGrid}>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Base Atual (Cluster)</span>
            <div style={styles.globalValue}>{globalStats.tBase.toLocaleString('pt-BR')} <Users size={20} color="#64748b"/></div>
          </div>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Net Adds (Cresc. Líquido)</span>
            <div style={{...styles.globalValue, color: globalStats.tNet >= 0 ? '#10b981' : '#ef4444'}}>
              {globalStats.tNet > 0 ? '+' : ''}{globalStats.tNet} <TrendingUp size={20} />
            </div>
          </div>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Gross Adds (Vendas Totais)</span>
            <div style={{...styles.globalValue, color: '#3b82f6'}}>{globalStats.tSales} <Target size={20} /></div>
          </div>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Taxa de Churn Média</span>
            <div style={{...styles.globalValue, color: globalStats.avgChurn > 2 ? '#ef4444' : '#f59e0b'}}>
              {globalStats.avgChurn + '%'} <TrendingDown size={20} />
            </div>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO INTERNA DO LABORATÓRIO COM DRAG AND DROP */}
      <div style={styles.labNav}>
        {tabsOrder.map(tabId => {
          const tabConfig = DEFAULT_TABS.find(t => t.id === tabId);
          if (!tabConfig) return null;
          
          return (
            <button 
              key={tabConfig.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tabConfig.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tabConfig.id)}
              onClick={() => setActiveLabTab(tabConfig.id)} 
              style={{
                ...(activeLabTab === tabConfig.id ? styles.labNavBtnActive : styles.labNavBtn),
                opacity: draggedTab === tabConfig.id ? 0.5 : 1
              }}
            >
              <GripVertical size={14} color="#475569" style={{cursor: 'grab'}} />
              <tabConfig.icon size={18} /> {tabConfig.label}
            </button>
          )
        })}
      </div>

      {/* RENDERIZAÇÃO DA ABA ATIVA */}
      <div style={{marginTop: '30px'}}>
        {activeLabTab === 'radar' && <RadarView />}
        {activeLabTab === 'projecoes' && <ProjecoesView />}
        {activeLabTab === 'omnichannel' && <OmnichannelView />}
        {activeLabTab === 'relacionamento' && <RelacionamentoView />}
        {activeLabTab === 'inteligencia' && <InteligenciaView processedData={processedData} />}
      </div>

      {/* MODAL PLANO DE AÇÃO */}
      {showPlanModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h3 style={{color:'white', margin:0, fontSize:'20px'}}>Prescrever Ação - {selectedCity?.city}</h3>
              <button onClick={() => setShowPlanModal(false)} style={{background:'none', border:'none', color:'#94a3b8', cursor:'pointer'}}><X size={24}/></button>
            </div>
            <form onSubmit={handleSavePlan} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <div>
                <label style={styles.label}>Título da Ação</label>
                <input style={styles.input} placeholder="Ex: Mutirão Vendas Centro" value={planForm.title} onChange={e => setPlanForm({...planForm, title: e.target.value})} required autoFocus/>
              </div>
              <div>
                <label style={styles.label}>Motivo Principal a Combater (Opcional)</label>
                <select style={styles.input} value={planForm.relatedReason} onChange={e => setPlanForm({...planForm, relatedReason: e.target.value})}>
                  <option value="">Ação Geral (Crescimento)</option>
                  {CHURN_REASONS.map(r => <option key={r.id} value={r.id}>Combater: {r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Qual problema estamos atacando?</label>
                <textarea style={{...styles.input, height:'80px', resize:'none'}} placeholder="Ex: Alto cancelamento por mudança de endereço..." value={planForm.problem} onChange={e => setPlanForm({...planForm, problem: e.target.value})} required/>
              </div>
              <div>
                <label style={styles.label}>Resultado Esperado (Meta da Ação)</label>
                <input style={styles.input} placeholder="Ex: Recuperar 15 clientes" value={planForm.expected} onChange={e => setPlanForm({...planForm, expected: e.target.value})} required/>
              </div>
              <button type="submit" style={styles.btnSubmit}>Iniciar Plano</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNIVERSAL PARA ALIMENTAÇÃO DE DADOS EM MASSA (VENDAS OU CHURN) */}
      {showEntryModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalBox, borderTop: entryType === 'sales' ? '4px solid #2563eb' : '4px solid #ef4444'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h3 style={{color:'white', margin:0, fontSize:'20px', display:'flex', alignItems:'center', gap:'10px'}}>
                {entryType === 'sales' ? <UploadCloud size={20} color="#2563eb"/> : <TrendingDown size={20} color="#ef4444"/>}
                {entryType === 'sales' ? 'Lançar Vendas Externas' : 'Lançar Cancelamentos'}
              </h3>
              <button onClick={() => setShowEntryModal(false)} style={{background:'none', border:'none', color:'#94a3b8', cursor:'pointer'}}><X size={24}/></button>
            </div>
            
            <div style={{fontSize:'13px', color:'#94a3b8', marginBottom:'20px', background:'#1e293b', padding:'10px', borderRadius:'10px'}}>
              Importante: Esta ação substitui os valores atuais para o mês selecionado.
            </div>

            <form onSubmit={handleSaveDataEntry} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              
              <div style={{display: 'flex', gap: '15px'}}>
                <div style={{flex: 1}}>
                  <label style={styles.label}>Mês de Referência</label>
                  <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#1e293b', border:'1px solid #334155', borderRadius:'10px', padding:'10px'}}>
                     <CalendarIcon size={18} color="#94a3b8" />
                     <input type="month" style={{...styles.input, padding:0, border:'none', background:'transparent'}} value={entryForm.month} onChange={e => setEntryForm({...entryForm, month: e.target.value})} required/>
                  </div>
                </div>
                <div style={{flex: 2}}>
                  <label style={styles.label}>Cidade / Praça</label>
                  <select style={styles.input} value={entryForm.cityId} onChange={e => {
                    const cId = e.target.value;
                    const cityData = processedData.find(c => c.id === cId);
                    if (cityData) {
                      setEntryForm({
                        ...entryForm,
                        cityId: cId,
                        pap: cityData.channels.pap || 0,
                        central: cityData.channels.central || 0,
                        b2b: cityData.channels.b2b || 0,
                        concorrencia: cityData.cancelReasons.concorrencia || 0,
                        tecnico: cityData.cancelReasons.tecnico || 0,
                        mudanca: cityData.cancelReasons.mudanca || 0,
                        financeiro: cityData.cancelReasons.financeiro || 0,
                        outros: cityData.cancelReasons.outros || 0
                      });
                    } else {
                      setEntryForm({...entryForm, cityId: cId});
                    }
                  }} required>
                    <option value="">Selecione para ver os valores...</option>
                    {processedData.map(c => <option key={c.id} value={c.id}>{c.city}</option>)}
                  </select>
                </div>
              </div>

              {entryType === 'sales' ? (
                <>
                  <div style={{borderTop: '1px solid #334155', margin: '10px 0'}}></div>
                  <h4 style={{color:'white', fontSize:'14px', margin:0}}>Substituir Quantidade de Vendas</h4>
                  
                  <div style={{display:'flex', gap:'15px'}}>
                    <div style={{flex: 1}}>
                      <label style={styles.label}>PAP</label>
                      <input type="number" min="0" style={styles.input} placeholder="0" value={entryForm.pap} onChange={e => setEntryForm({...entryForm, pap: e.target.value})}/>
                    </div>
                    <div style={{flex: 1}}>
                      <label style={styles.label}>Central de Vendas</label>
                      <input type="number" min="0" style={styles.input} placeholder="0" value={entryForm.central} onChange={e => setEntryForm({...entryForm, central: e.target.value})}/>
                    </div>
                    <div style={{flex: 1}}>
                      <label style={styles.label}>Oquei B2B</label>
                      <input type="number" min="0" style={styles.input} placeholder="0" value={entryForm.b2b} onChange={e => setEntryForm({...entryForm, b2b: e.target.value})}/>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{borderTop: '1px solid #334155', margin: '10px 0'}}></div>
                  <h4 style={{color:'white', fontSize:'14px', margin:0}}>Substituir Volume de Evasão</h4>
                  
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    {CHURN_REASONS.map(r => (
                      <div key={r.id}>
                         <label style={styles.label}>{r.label}</label>
                         <input type="number" min="0" style={styles.input} placeholder="0" value={entryForm[r.id]} onChange={e => setEntryForm({...entryForm, [r.id]: e.target.value})}/>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button type="submit" style={{...styles.btnSubmit, background: entryType === 'sales' ? '#2563eb' : '#ef4444', marginTop: '10px'}}>
                <Save size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/> Salvar Lançamentos
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  pageContainer: { 
    background: '#020617', 
    minHeight: '100vh', 
    padding: '30px', 
    color: '#f8fafc', 
    fontFamily: "'Inter', sans-serif"
  },
  loadingContainer: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#020617', color:'white' },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  iconBox: { background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)' },
  title: { fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '0.02em', color: 'white' },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: '5px 0 0 0' },
  
  monthSelector: { backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '12px 20px', borderRadius: '12px' },
  monthInput: { backgroundColor: 'transparent', fontSize: '16px', fontWeight: '900', color: 'white', border: 'none', outline: 'none', cursor: 'pointer', colorScheme: 'dark' },

  globalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  globalCard: { background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  globalLabel: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  globalValue: { fontSize: '32px', fontWeight: '900', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },

  labNav: { display: 'flex', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '10px', overflowX: 'auto' },
  labNavBtn: { background: 'transparent', border: 'none', borderBottom: '3px solid transparent', color: '#64748b', padding: '12px 20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'grab', whiteSpace: 'nowrap', transition: '0.2s', userSelect: 'none' },
  labNavBtnActive: { background: 'transparent', border: 'none', borderBottom: '3px solid #3b82f6', color: '#3b82f6', padding: '12px 20px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'grab', whiteSpace: 'nowrap', transition: '0.2s', userSelect: 'none' },

  mainLayout: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px', alignItems: 'start', animation: 'fadeIn 0.3s' },
  radarColumn: { display: 'flex', flexDirection: 'column', gap: '15px' },
  sectionTitle: { fontSize: '16px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px 0' },
  cityList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px' },
  cityCard: { padding: '20px', borderRadius: '16px', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s' },
  cityCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  cityName: { fontSize: '16px', fontWeight: 'bold', color: 'white', margin: 0 },
  penetrationBadge: { fontSize: '10px', background: '#1e293b', color: '#94a3b8', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' },
  cityCardMetrics: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' },
  metricMicro: { display: 'flex', flexDirection: 'column', fontSize: '11px', color: '#64748b' },

  detailsColumn: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '40px', minHeight: '600px' },
  emptySelect: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', textAlign: 'center' },
  
  funnelContainer: { display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px 1fr', gap: '15px', marginTop: '30px', marginBottom: '40px' },
  funnelBox: { background: '#1e293b', borderTop: '4px solid #3b82f6', borderRadius: '16px', padding: '25px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },

  clinicSection: { borderTop: '1px solid #1e293b', paddingTop: '30px' },
  btnAction: { background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
  btnDanger: { background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(239,68,68,0.2)' },
  planCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' },

  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#0f172a', border: '1px solid #334155', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '550px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: 'white', outline: 'none', fontSize: '14px', boxSizing: 'border-box', colorScheme: 'dark' },
  select: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: 'white', outline: 'none', fontSize: '14px', boxSizing: 'border-box' },
  btnSubmit: { width: '100%', padding: '15px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '10px' }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } 
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  
  input[type=range] {
    -webkit-appearance: none;
    background: #334155;
    height: 6px;
    border-radius: 3px;
    outline: none;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
  }
`;
document.head.appendChild(styleSheet);