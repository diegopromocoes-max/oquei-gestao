import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, doc, onSnapshot, query, where, setDoc, getDocs } from 'firebase/firestore';
import {
  PieChart, MapPin, Users, TrendingDown,
  Lock, Unlock, ArrowRight, TrendingUp,
  Brain, RefreshCcw, ChevronDown, Sparkles,
  BarChart2, Shield, AlertCircle
} from 'lucide-react';
import { colors } from '../../components/ui';

// ─── Constants ────────────────────────────────────────────────────────────────
const DIST_METHODS = { AUTO: 'auto', DIRETORIA: 'aba2', EQUAL: 'equal' };

const ALERT_STYLES = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  info:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
  success:  { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Sparkline mini chart for historical trend */
function Sparkline({ data, color = '#10b981', width = 80, height = 32 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(Number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

/** Slider with historical marker overlay + client number input mode */
function SmartSlider({ value, onChange, min, max, step, accentColor, historicalValue, disabled, baseClients, inputMode, onToggleMode }) {
  const histPct = historicalValue != null ? Math.min(Math.max(((historicalValue - min) / (max - min)) * 100, 0), 100) : null;
  const clientValue = baseClients ? Math.ceil(baseClients * (value / 100)) : 0;

const handleClientInput = (raw) => {
    if (!baseClients) return;
    
    // 1. Permite que o usuário apague o campo para digitar do zero
    if (raw === '') {
      onChange(min); 
      return;
    }
    
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;

    // 2. Calcula a porcentagem real sem arredondamento forçado
    // Removemos o Math.round(... / 10) para evitar que o número "pule"
    const pct = Math.min(Math.max((n / baseClients) * 100, min), max);
    
    onChange(pct);
  };

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={onToggleMode}
          disabled={disabled}
          style={{ fontSize: '10px', fontWeight: '900', color: accentColor, background: `${accentColor}15`, border: `1px solid ${accentColor}40`, borderRadius: '6px', padding: '3px 10px', cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          {inputMode === 'percent' ? '# clientes' : '% porcento'}
        </button>
      </div>

      {inputMode === 'clients' && baseClients ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <input
            type="number"
            min={0}
            max={baseClients * (max / 100)}
            value={clientValue}
            onChange={e => handleClientInput(e.target.value)}
            disabled={disabled}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `2px solid ${accentColor}`, background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '18px', fontWeight: '900', outline: 'none', textAlign: 'center', fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800' }}>clientes</span>
        </div>
      ) : null}

      <div style={{ position: 'relative', paddingTop: '24px' }}>
        {histPct != null && (
          <div style={{ position: 'absolute', top: 0, left: `${histPct}%`, transform: 'translateX(-50%)', zIndex: 2 }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: '#f59e0b', whiteSpace: 'nowrap', background: 'rgba(245,158,11,0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.3)' }}>
              ↓ hist. {historicalValue?.toFixed(1)}%
            </div>
          </div>
        )}
        {histPct != null && (
          <div style={{ position: 'absolute', top: '26px', left: `${histPct}%`, width: '2px', height: '16px', background: '#f59e0b', opacity: 0.6, transform: 'translateX(-50%)', zIndex: 1, borderRadius: '1px' }} />
        )}
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          disabled={disabled}
          style={{ width: '100%', accentColor, cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', zIndex: 3 }}
        />
      </div>
    </div>
  );
}

/** Streaming AI insight text renderer */
function StreamingText({ text }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 8);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}</span>;
}

/** Confirm modal */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Shield size={24} color={colors.warning} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>Confirmação</h3>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: '1.6' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: colors.success, color: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TabSimuladorSOP({ selectedMonth, userData }) {
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [monthlyGoalsData, setMonthlyGoalsData] = useState({});
  const [monthlyBases, setMonthlyBases] = useState({});
  const [simulations, setSimulations] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedCityId, setSelectedCityId] = useState('');
  const [growthPercent, setGrowthPercent] = useState(0.0);
  const [churnPercent, setChurnPercent] = useState(0.0);
  const [distMethod, setDistMethod] = useState(DIST_METHODS.AUTO);
  const [savingLock, setSavingLock] = useState(false);
  const [historicalMix, setHistoricalMix] = useState(null);

  // AI Insights state
  const [insightState, setInsightState] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'
  const [aiInsights, setAiInsights] = useState(null);
  const [insightError, setInsightError] = useState('');
  const [insightMode, setInsightMode] = useState('local'); // 'local' | 'ai'

  // Slider input modes
  const [growthInputMode, setGrowthInputMode] = useState('percent');
  const [churnInputMode, setChurnInputMode] = useState('percent');

  // Confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Firebase listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const myCluster = String(userData?.clusterId || '').trim();
    const isCoord = userData?.role === 'coordinator' || userData?.role === 'coordenador';

    const cityQuery = isCoord
      ? collection(db, 'cities')
      : query(collection(db, 'cities'), where('clusterId', '==', myCluster));

    const unsubs = [
      onSnapshot(cityQuery, snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCities(list);
        setSelectedCityId(prev => prev || (list[0]?.id ?? ''));
        setLoading(false);
      }),
      onSnapshot(collection(db, 'sales_channels'), snap => {
        setChannels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(collection(db, 'city_results'), snap => {
        setAllResults(snap.docs.map(d => d.data()));
      }),
      onSnapshot(doc(db, 'goals_cities', selectedMonth), snap => {
        setMonthlyGoalsData(snap.exists() ? snap.data()?.data || {} : {});
      }, () => setMonthlyGoalsData({})),
      onSnapshot(query(collection(db, 'monthly_bases'), where('month', '==', selectedMonth)), snap => {
        const m = {}; snap.docs.forEach(d => { m[d.data().cityId] = d.data(); });
        setMonthlyBases(m);
      }),
      onSnapshot(query(collection(db, 'sop_simulations'), where('month', '==', selectedMonth)), snap => {
        const m = {}; snap.docs.forEach(d => { m[d.data().cityId] = d.data(); });
        setSimulations(m);
      }),
    ];

    return () => unsubs.forEach(u => u());
  }, [userData, selectedMonth]);

  // ── Reset simulation when city changes ────────────────────────────────────
  useEffect(() => {
    if (loading || !selectedCityId) return;
    const saved = simulations[selectedCityId];
    setGrowthPercent(saved?.growthPercent ?? 0);
    setChurnPercent(saved?.churnPercent ?? 0);
    setDistMethod(saved?.distMethod ?? DIST_METHODS.AUTO);
    setInsightState('idle');
    setAiInsights(null);
  }, [selectedCityId, loading]); // eslint-disable-line

  // Reset insights when sliders move
  useEffect(() => {
    if (insightState === 'done') {
      setInsightState('idle');
      setAiInsights(null);
    }
  }, [growthPercent, churnPercent]); // eslint-disable-line

  // ── Derived: cityData ──────────────────────────────────────────────────────
  const cityData = useMemo(() => {
    if (!selectedCityId || !cities.length) return null;
    const c = cities.find(city => city.id === selectedCityId) ?? cities[0];
    const monthBaseData = monthlyBases[c.id];
    const baseAtual = parseFloat(monthBaseData?.baseStart ?? c.baseStart ?? 0);
    const potencial = parseFloat(c.potencial ?? 0);
    const history = allResults
      .filter(r => r.cityId === c.id)
      .sort((a, b) => b.month.localeCompare(a.month));
    return { ...c, baseAtual, potencial, history };
  }, [selectedCityId, cities, allResults, monthlyBases]);

// ── Derived: base metrics ──────────────────────────────────────────────────
  const baseMetrics = useMemo(() => {
    if (!cityData) return null;
    const safeDivide = (n, d) => (d && d !== 0 ? n / d : 0);
    const baseInicial = Number(cityData.baseAtual ?? 0);
    
    const metaNet = Math.ceil(baseInicial * (growthPercent / 100));
    const expectedChurn = Math.ceil(baseInicial * (churnPercent / 100));
    const metaBruta = metaNet + expectedChurn;

    const last3 = cityData.history.slice(0, 3);

    // 🚀 PROCESSAMENTO DO HISTÓRICO REAL (Mapeando os campos corretos)
    const processedHistory = last3.map(m => {
      let gross = 0;
      if (m.vendas) {
        // Soma todas as vendas de todos os canais do mês
        Object.values(m.vendas).forEach(canal => {
          Object.values(canal).forEach(val => gross += Number(val || 0));
        });
      }
      const churn = Number(m.cancelamentos || 0); // Campo correto da apuração
      const net = gross - churn;
      const base = Number(m.baseStart || baseInicial || 1);
      return { gross, churn, net, base };
    });

    const avgGross = processedHistory.length 
      ? processedHistory.reduce((a, h) => a + h.gross, 0) / processedHistory.length : 0;
    
    const avgChurnAbs = processedHistory.length 
      ? processedHistory.reduce((a, h) => a + h.churn, 0) / processedHistory.length : 0;

    const avgChurnPct = safeDivide(avgChurnAbs, baseInicial) * 100;

    const avgNetPct = processedHistory.length
      ? processedHistory.reduce((a, h) => a + safeDivide(h.net, h.base) * 100, 0) / processedHistory.length : 0;

    const potReal = cityData.potencial > 0 ? cityData.potencial : baseInicial * 2;
    const penetration = safeDivide(baseInicial, potReal) * 100;

    const trendDirection = processedHistory.length >= 2
      ? (processedHistory[0].net >= processedHistory[1].net ? 'aceleração' : 'desaceleração')
      : 'estável';

    // Sparklines (Mini gráficos)
    const netHistory = processedHistory.map(h => safeDivide(h.net, h.base) * 100).reverse();
    const churnHistory = processedHistory.map(h => safeDivide(h.churn, h.base) * 100).reverse();

    return { 
      baseInicial, metaNet, expectedChurn, metaBruta, 
      avgGross, avgChurnAbs, avgChurnPct, avgNetPct, 
      penetration, trendDirection, netHistory, churnHistory, last3 
    };
  }, [cityData, growthPercent, churnPercent]);

  // ── Derived: strategic matrix ──────────────────────────────────────────────
  const strategicMatrix = useMemo(() => {
    if (!baseMetrics) return null;
    const { penetration, avgNetPct } = baseMetrics;

    let marketProfile = penetration >= 60 ? 'Maduro / Dominado' : penetration >= 30 ? 'Intermediário' : 'Expansão';
    let operationalProfile = avgNetPct >= 2.5 ? 'Alta Tração' : avgNetPct >= 0.5 ? 'Sustentável' : 'Estagnação / Retração';
    let strategicQuadrant, quadrantColor, executivePositioning, strategicGuidance;

    if (marketProfile === 'Maduro / Dominado') {
      if (avgNetPct >= 0) {
        strategicQuadrant = 'DOMÍNIO E RENTABILIZAÇÃO'; quadrantColor = colors.info;
        executivePositioning = 'O objetivo principal não é volume acelerado, mas blindar a base e aumentar margem.';
        strategicGuidance = ['Foco na experiência do cliente (NPS)', 'Campanhas de Upgrade de plano'];
      } else {
        strategicQuadrant = 'ALERTA DE PERDA DE SHARE'; quadrantColor = colors.warning;
        executivePositioning = 'Risco de perda de liderança. Base encolhendo em mercado dominado.';
        strategicGuidance = ['Auditoria de motivos de cancelamento', 'Análise da concorrência local'];
      }
    } else if (marketProfile === 'Expansão' && operationalProfile === 'Alta Tração') {
      strategicQuadrant = 'EXPANSÃO ACELERADA'; quadrantColor = colors.success;
      executivePositioning = 'Ambiente ideal. Mercado aberto e equipe com alta capacidade de fechamento.';
      strategicGuidance = ['Acelerar orçamento em marketing', 'Expandir presença de Lojas/PDV'];
    } else if (marketProfile === 'Expansão') {
      strategicQuadrant = 'ALAVANCAGEM COMERCIAL'; quadrantColor = colors.purple;
      executivePositioning = 'Muito potencial não explorado. A operação precisa ser destravada.';
      strategicGuidance = ['Aumentar volume de Leads', 'Revisar comissionamento comercial'];
    } else {
      strategicQuadrant = 'REESTRUTURAÇÃO TÁTICA'; quadrantColor = colors.danger;
      executivePositioning = 'Sinal Vermelho: Mercado competitivo e crescimento insustentável.';
      strategicGuidance = ['Revisão da estrutura de canais', 'Ajuste de portfólio de ofertas'];
    }

    return { marketProfile, operationalProfile, strategicQuadrant, quadrantColor, executivePositioning, strategicGuidance };
  }, [baseMetrics]);

  // ── Derived: local alerts ──────────────────────────────────────────────────
  const localAlerts = useMemo(() => {
    if (!baseMetrics) return [];
    const { avgNetPct, avgChurnPct, penetration, trendDirection } = baseMetrics;
    const alerts = [];
    const growthDelta = growthPercent - avgNetPct;
    const churnDelta = churnPercent - avgChurnPct;

    if (growthDelta > 2)
      alerts.push({ type: 'warning', title: 'Meta Acima da Capacidade Histórica', text: `Projeção (${growthPercent.toFixed(1)}%) supera média recente (${avgNetPct.toFixed(1)}%). Aprovação da Diretoria recomendada.` });
    if (penetration < 35 && growthPercent < avgNetPct)
      alerts.push({ type: 'info', title: 'Crescimento Conservador', text: `Penetração baixa (${penetration.toFixed(1)}%) — há espaço para acelerar sem risco.` });
    if (Math.abs(churnDelta) > 1.5)
      alerts.push({ type: 'critical', title: 'Churn Fora do Padrão Histórico', text: `Cancelamento projetado (${churnPercent.toFixed(1)}%) vs média (${avgChurnPct.toFixed(1)}%). Força-tarefa de retenção necessária.` });
    if (trendDirection === 'desaceleração')
      alerts.push({ type: 'warning', title: 'Tendência de Desaceleração', text: 'Os últimos meses mostram queda no ritmo de crescimento. Investigar causas antes de confirmar metas.' });
    if (alerts.length === 0 && growthPercent > 0)
      alerts.push({ type: 'success', title: 'Cenário Sustentável', text: 'Os números estão alinhados com o histórico. Cenário validado para publicação.' });

    return alerts;
  }, [baseMetrics, growthPercent, churnPercent]);

  
  
  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedCityId || !channels.length) return;

      // 1. Identifica os 3 meses anteriores ao selecionado
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevMonths = [1, 2, 3].map(offset => {
        const d = new Date(year, month - 1 - offset, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });

      try {
        const resultsSnap = await getDocs(collection(db, 'city_results'));
        const allResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        let totals = {};
        let totalGeral = 0;

        channels.forEach(ch => {
          let somaCanal = 0;
          prevMonths.forEach(mId => {
            const doc = allResults.find(r => r.id === `${mId}_${selectedCityId}`);
            if (doc?.vendas) {
              // Busca no objeto de vendas pelo ID ou Nome do canal (blindagem de erro)
              const key = Object.keys(doc.vendas).find(k => k === ch.id || k.toLowerCase() === ch.name.toLowerCase());
              if (key) {
                Object.values(doc.vendas[key]).forEach(v => somaCanal += Number(v || 0));
              }
            }
          });
          totals[ch.id] = somaCanal;
          totalGeral += somaCanal;
        });

        if (totalGeral > 0) {
          const calculatedMix = Object.fromEntries(Object.entries(totals).map(([id, val]) => [id, val / totalGeral]));
          setHistoricalMix(calculatedMix);
        } else {
          setHistoricalMix(null);
        }
      } catch (err) {
        console.error("Erro ao processar histórico para modo Auto:", err);
      }
    };
    fetchHistory();
  }, [selectedMonth, selectedCityId, channels]);
  
  // ── Derived: channel mix ───────────────────────────────────────────────────
  const channelMix = useMemo(() => {
    // 🛡️ TRAVA DE SEGURANÇA: Se não houver métricas ou canais, para aqui e retorna vazio
    if (!baseMetrics || !channels.length) {
      return { metasPorCanal: {}, mix: {}, originalGoals: {}, dataSource: '' };
    }

    const cityGoals = monthlyGoalsData[selectedCityId] || {};
    let channelTotals = {}; 
    let totalGeral = 0;

    Object.entries(cityGoals).forEach(([channelId, productsObj]) => {
      const sum = Object.values(productsObj).reduce((a, v) => a + Number(v ?? 0), 0);
      if (sum > 0) { 
        channelTotals[channelId] = sum; 
        totalGeral += sum; 
      }
    });

    const dirMix = totalGeral > 0
      ? Object.fromEntries(Object.entries(channelTotals).map(([id, v]) => [id, v / totalGeral]))
      : null;
    
    const equalMix = Object.fromEntries(channels.map(ch => [ch.id, 1 / channels.length]));

    let mix, dataSource;

    if (distMethod === DIST_METHODS.EQUAL) { 
      mix = equalMix; 
      dataSource = 'Distribuição Igualitária'; 
    }
    else if (distMethod === DIST_METHODS.DIRETORIA) { 
      mix = dirMix ?? equalMix; 
      dataSource = dirMix ? 'Metas da Diretoria (Aba 2)' : 'Igualitário (sem metas)'; 
    }
    else if (distMethod === DIST_METHODS.AUTO) { 
      // 🚀 AQUI A MÁGICA ACONTECE:
      // Se tiver histórico de 3 meses, usa ele. Se não tiver, tenta Aba 2. 
      // Se não tiver nada, divide igualitário.
      mix = historicalMix ?? dirMix ?? equalMix; 
      
      if (historicalMix) dataSource = 'Automático (Média Real 3M)';
      else if (dirMix) dataSource = 'Automático (Meta Aba 2)';
      else dataSource = 'Automático (Distribuição Igualitária)';
    }

    // 🚀 LÓGICA DE DISTRIBUIÇÃO DE RESTOS (Para a soma bater sempre o total exato)
    const totalMetaBruta = baseMetrics.metaBruta; // Agora é seguro ler pois passamos pela trava acima
    
    const itensComResto = Object.entries(mix).map(([id, pct]) => {
      const valorBruto = totalMetaBruta * pct;
      return {
        id,
        valorInteiro: Math.floor(valorBruto),
        resto: valorBruto - Math.floor(valorBruto)
      };
    });

    const somaAtual = itensComResto.reduce((acc, item) => acc + item.valorInteiro, 0);
    const diferenca = totalMetaBruta - somaAtual;

    // Ordena pelos maiores restos para distribuir o arredondamento
    itensComResto.sort((a, b) => b.resto - a.resto);

    const metasPorCanal = {};
    itensComResto.forEach((item, index) => {
      metasPorCanal[item.id] = item.valorInteiro + (index < diferenca ? 1 : 0);
    });

    return { metasPorCanal, mix, originalGoals: channelTotals, dataSource };
  }, [baseMetrics, monthlyGoalsData, channels, distMethod, selectedCityId]);

  // ── AI Insights (Gemini) ───────────────────────────────────────────────────
  // 👇 Cole sua chave aqui OU use variável de ambiente VITE_GEMINI_API_KEY
  const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || 'AIzaSyB2_r5Ae4zBeZiyanWGEtR_MkYoBGGAfMU';

  const handleGenerateInsights = useCallback(async () => {
    if (!baseMetrics || !strategicMatrix || !cityData) return;

    if (!GEMINI_API_KEY) {
      setInsightError('Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY no seu .env');
      setInsightState('error');
      return;
    }

    setInsightState('loading');
    setInsightError('');

    const prompt = `Analise os dados S&OP abaixo e retorne SOMENTE um JSON, sem texto extra.

Unidade: ${cityData.name || cityData.city}
Base: ${baseMetrics.baseInicial} clientes
Crescimento projetado: +${growthPercent.toFixed(1)}% (${baseMetrics.metaNet} clientes)
Churn projetado: ${churnPercent.toFixed(1)}% (${baseMetrics.expectedChurn} saídas)
Meta bruta: ${baseMetrics.metaBruta} vendas
Penetração: ${baseMetrics.penetration.toFixed(1)}%
Histórico crescimento: ${baseMetrics.avgNetPct.toFixed(2)}%
Histórico churn: ${baseMetrics.avgChurnPct.toFixed(2)}%
Tendência: ${baseMetrics.trendDirection}
Quadrante: ${strategicMatrix.strategicQuadrant}

Retorne exatamente este JSON com 3 insights curtos e acionáveis:
{"insights":[{"titulo":"string","analise":"string de 1 frase","acao":"string de 1 frase","prioridade":"alta|media|baixa","categoria":"crescimento|churn|mercado|operacional"}]}`;

    try {
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      if (candidate?.finishReason === 'MAX_TOKENS') throw new Error('Resposta cortada pelo limite de tokens. Tente novamente.');
      const text = candidate?.content?.parts?.[0]?.text || '';

      // Normaliza resposta: remove markdown, desescapa se vier como string JSON
      let clean = text.trim();
      // Se vier com aspas escapadas (JSON dentro de string), desescapa primeiro
      if (clean.startsWith('"') || clean.startsWith('\"')) {
        try { clean = JSON.parse(clean); } catch (_) {}
      }
      clean = clean.replace(/```json|```/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta.');
      clean = jsonMatch[0];

      // Fecha estruturas abertas caso o modelo tenha cortado a resposta
      clean += ']'.repeat(Math.max(0, (clean.match(/\[/g)||[]).length - (clean.match(/\]/g)||[]).length));
      clean += '}'.repeat(Math.max(0, (clean.match(/\{/g)||[]).length - (clean.match(/\}/g)||[]).length));

      const parsed = JSON.parse(clean);
      if (!parsed.insights || !Array.isArray(parsed.insights)) throw new Error('Formato inválido na resposta da IA.');
      parsed.insights = parsed.insights.filter(i => i?.titulo && i?.analise);
      if (!parsed.insights.length) throw new Error('Nenhum insight válido retornado.');

      setAiInsights(parsed.insights);
      setInsightState('done');
    } catch (err) {
      console.error('Gemini insights error:', err);
      setInsightError(`Erro ao gerar insights: ${err.message}`);
      setInsightState('error');
    }
  }, [baseMetrics, strategicMatrix, cityData, growthPercent, churnPercent, GEMINI_API_KEY]);

  // ── Lock/Publish ───────────────────────────────────────────────────────────
  const isLocked = simulations[selectedCityId]?.locked ?? false;

  const handleToggleLock = async () => {
    if (!cityData) return;
    setSavingLock(true);
    try {
      await setDoc(
        doc(db, 'sop_simulations', `${selectedMonth}_${cityData.id}`),
        { cityId: cityData.id, month: selectedMonth, growthPercent, churnPercent, distMethod, locked: !isLocked, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      if (window.showToast) window.showToast('Erro ao publicar cenário. Tente novamente.', 'error');
    }
    setSavingLock(false);
    setShowConfirm(false);
  };

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (loading || !cityData || !baseMetrics || !strategicMatrix) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCcw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '14px', fontWeight: '800' }}>Iniciando Inteligência S&OP...</div>
      </div>
    );
  }

  const prioColor = { alta: colors.danger, media: colors.warning, baixa: colors.success };


  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <ConfirmModal
          message={isLocked
            ? `Deseja destravar a edição do cenário de "${cityData.name || cityData.city}"? Isso permitirá alterações nos parâmetros.`
            : `Deseja publicar e travar o cenário S&OP de "${cityData.name || cityData.city}" para ${selectedMonth}? Esta ação comunicará as metas ao time.`
          }
          onConfirm={handleToggleLock}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '22px 28px', borderRadius: '22px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={22} color={colors.primary} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Unidade Operacional</div>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={selectedCityId}
                onChange={e => setSelectedCityId(e.target.value)}
                style={{ appearance: 'none', border: '1px solid var(--border)', background: 'var(--bg-app)', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', padding: '9px 42px 9px 14px', borderRadius: '11px', fontFamily: 'inherit', transition: 'border-color 0.2s', minWidth: '200px' }}
                onFocus={e => e.currentTarget.style.borderColor = colors.primary}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {cities.map(city => <option key={city.id} value={city.id}>{city.name || city.city}</option>)}
              </select>
              <ChevronDown size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '13px', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.06em', marginBottom: '2px' }}>POTENCIAL HP</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)' }}>{cityData.potencial || '—'}</div>
          </div>
          <div style={{ minWidth: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.06em' }}>PENETRAÇÃO</span>
              <span style={{ fontSize: '12px', fontWeight: '900', color: baseMetrics.penetration > 60 ? colors.primary : colors.success }}>{baseMetrics.penetration.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(baseMetrics.penetration, 100)}%`, background: baseMetrics.penetration > 60 ? colors.primary : colors.success, transition: 'width 0.5s ease', borderRadius: '10px' }} />
            </div>
          </div>
          {isLocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '8px 14px' }}>
              <Lock size={14} color={colors.danger} />
              <span style={{ fontSize: '11px', fontWeight: '900', color: colors.danger }}>TRAVADO</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(370px, 1fr))', gap: '22px' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Growth Slider */}
          <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: '22px', border: `1px solid ${isLocked ? 'var(--border)' : 'rgba(16,185,129,0.2)'}`, transition: 'border-color 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '800' }}>
                <TrendingUp size={17} color={colors.success} /> Crescimento Alvo (Net)
              </h3>
              {baseMetrics.netHistory.length > 1 && (
                <Sparkline data={baseMetrics.netHistory} color={colors.success} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '12px 0 4px' }}>
              <div style={{ fontSize: '36px', fontWeight: '900', color: colors.success }}>+{growthPercent.toFixed(1)}%</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{baseMetrics.metaNet}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>novos clientes</div>
              </div>
            </div>
            <SmartSlider
              value={growthPercent} onChange={setGrowthPercent}
              min={0} max={20} step={0.1}
              accentColor={colors.success}
              historicalValue={baseMetrics.avgNetPct}
              disabled={isLocked}
              baseClients={baseMetrics.baseInicial}
              inputMode={growthInputMode}
              onToggleMode={() => setGrowthInputMode(m => m === 'percent' ? 'clients' : 'percent')}
            />
          </div>

          {/* Churn Slider */}
          <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: '22px', border: `1px solid ${isLocked ? 'var(--border)' : 'rgba(239,68,68,0.2)'}`, transition: 'border-color 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '800' }}>
                <TrendingDown size={17} color={colors.danger} /> Projeção de Cancelamentos
              </h3>
              {baseMetrics.churnHistory.length > 1 && (
                <Sparkline data={baseMetrics.churnHistory} color={colors.danger} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '12px 0 4px' }}>
              <div style={{ fontSize: '36px', fontWeight: '900', color: colors.danger }}>-{churnPercent.toFixed(1)}%</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{baseMetrics.expectedChurn}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>saídas previstas</div>
              </div>
            </div>
            <SmartSlider
              value={churnPercent} onChange={setChurnPercent}
              min={0} max={15} step={0.1}
              accentColor={colors.danger}
              historicalValue={baseMetrics.avgChurnPct}
              disabled={isLocked}
              baseClients={baseMetrics.baseInicial}
              inputMode={churnInputMode}
              onToggleMode={() => setChurnInputMode(m => m === 'percent' ? 'clients' : 'percent')}
            />
          </div>

          {/* ── Insights Box ── */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '22px', padding: '28px', border: '1px solid var(--border)' }}>

            {/* Header + tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                <Brain size={22} color={colors.purple} /> Análise de Viabilidade S&OP
              </h3>
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-app)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setInsightMode('local')}
                  style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', background: insightMode === 'local' ? 'var(--bg-card)' : 'transparent', color: insightMode === 'local' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: insightMode === 'local' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
                >
                  📊 Sistema
                </button>
                <button
                  onClick={() => setInsightMode('ai')}
                  style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', background: insightMode === 'ai' ? 'var(--bg-card)' : 'transparent', color: insightMode === 'ai' ? colors.purple : 'var(--text-muted)', boxShadow: insightMode === 'ai' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
                >
                  ✨ IA Gemini
                </button>
              </div>
            </div>

            {/* ── TAB LOCAL ── */}
            {insightMode === 'local' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Quadrant badge */}
                <div style={{ background: strategicMatrix.quadrantColor, color: '#fff', padding: '13px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', textAlign: 'center', letterSpacing: '0.04em' }}>
                  {strategicMatrix.strategicQuadrant}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>PERFIL DE MERCADO</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>{strategicMatrix.marketProfile}</div>
                  </div>
                  <div style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>DESEMPENHO OP.</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>{strategicMatrix.operationalProfile}</div>
                  </div>
                </div>
                {localAlerts.map((a, i) => {
                  const s = ALERT_STYLES[a.type];
                  return (
                    <div key={i} style={{ padding: '16px 18px', borderRadius: '14px', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <AlertCircle size={18} color={s.color} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: s.color, marginBottom: '5px' }}>{a.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.55' }}>{a.text}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding: '14px 18px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: `4px solid ${strategicMatrix.quadrantColor}` }}>
                  <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>POSICIONAMENTO EXECUTIVO</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.6' }}>{strategicMatrix.executivePositioning}</div>
                </div>
              </div>
            )}

            {/* ── TAB AI ── */}
            {insightMode === 'ai' && (
              <div>
                {/* IDLE */}
                {insightState === 'idle' && (
                  <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.65' }}>
                      A IA analisa os parâmetros configurados e gera 3 insights executivos específicos para esta unidade usando o Gemini.
                    </p>
                    <button
                      onClick={handleGenerateInsights}
                      style={{ background: colors.purple, color: '#fff', border: 'none', padding: '15px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: `0 6px 18px ${colors.purple}35`, transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${colors.purple}50`; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 18px ${colors.purple}35`; }}
                    >
                      <Sparkles size={18} /> Gerar Insights com IA
                    </button>
                  </div>
                )}

                {/* LOADING */}
                {insightState === 'loading' && (
                  <div style={{ textAlign: 'center', padding: '36px 0' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${colors.purple}25`, borderTopColor: colors.purple, animation: 'spin 0.8s linear infinite' }} />
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)' }}>Analisando dados da unidade...</div>
                    </div>
                  </div>
                )}

                {/* ERROR */}
                {insightState === 'error' && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '18px', marginBottom: '18px', fontSize: '14px', color: colors.danger, fontWeight: '800', lineHeight: '1.5' }}>
                      {insightError}
                    </div>
                    <button onClick={handleGenerateInsights} style={{ background: 'transparent', border: `1px solid ${colors.purple}`, color: colors.purple, padding: '11px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}>
                      Tentar Novamente
                    </button>
                  </div>
                )}

                {/* DONE */}
                {insightState === 'done' && aiInsights && (
                  <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                    <div style={{ background: strategicMatrix.quadrantColor, color: '#fff', padding: '13px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', textAlign: 'center', marginBottom: '18px', letterSpacing: '0.04em' }}>
                      {strategicMatrix.strategicQuadrant}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                      {aiInsights.map((insight, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-app)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', borderLeft: `5px solid ${prioColor[insight.prioridade] ?? colors.purple}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1.35' }}>
                              <StreamingText text={insight.titulo} />
                            </div>
                            <div style={{ background: `${prioColor[insight.prioridade] ?? colors.purple}18`, borderRadius: '7px', padding: '4px 10px', flexShrink: 0 }}>
                              <span style={{ fontSize: '11px', color: prioColor[insight.prioridade] ?? colors.purple, fontWeight: '900', textTransform: 'uppercase' }}>{insight.categoria}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.65', marginBottom: '12px', opacity: 0.85 }}>{insight.analise}</div>
                          <div style={{ fontSize: '12px', fontWeight: '900', color: prioColor[insight.prioridade] ?? colors.purple, display: 'flex', alignItems: 'center', gap: '7px', background: `${prioColor[insight.prioridade] ?? colors.purple}10`, padding: '10px 14px', borderRadius: '10px' }}>
                            <ArrowRight size={14} /> {insight.acao}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <button onClick={() => { setInsightState('idle'); setAiInsights(null); }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        ↩ Gerar novamente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Operational Flow Summary */}
          <div style={{ background: 'var(--bg-card)', padding: '26px', borderRadius: '22px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontWeight: '900' }}>
              <Users size={19} color={colors.purple} /> Resumo do Fluxo Operacional
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', padding: '22px', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '3px' }}>BASE ATUAL</div>
                <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-main)' }}>{baseMetrics.baseInicial.toLocaleString('pt-BR')}</div>
              </div>
              <ArrowRight size={22} color="var(--text-muted)" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '3px' }}>FECHAMENTO (NET)</div>
                <div style={{ fontSize: '26px', fontWeight: '900', color: colors.purple, transition: 'all 0.3s' }}>{(baseMetrics.baseInicial + baseMetrics.metaNet).toLocaleString('pt-BR')}</div>
              </div>
            </div>
            <div style={{ padding: '18px', background: 'var(--bg-app)', borderRadius: '14px', border: `2px dashed ${colors.success}`, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>NECESSIDADE DE VENDAS BRUTAS (GROSS)</div>
              <div style={{ fontSize: '34px', fontWeight: '900', color: colors.success, transition: 'all 0.3s' }}>
                {baseMetrics.metaBruta.toLocaleString('pt-BR')}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>novas contas</span>
              </div>
            </div>

            {/* Historical context */}
            {baseMetrics.last3.length > 0 && (
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '10px' }}>HISTÓRICO RECENTE</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {baseMetrics.last3.slice(0, 3).map((m, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '3px' }}>{m.month?.slice(0, 7)}</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: Number(m.netAdds) >= 0 ? colors.success : colors.danger }}>
                        {Number(m.netAdds) >= 0 ? '+' : ''}{m.netAdds}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>NET</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Channel Mix */}
          <div style={{ background: 'var(--bg-card)', padding: '26px', borderRadius: '22px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontWeight: '900' }}>
                <PieChart size={19} color={colors.warning} /> Mix de Canais (Vendas)
              </h3>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  value={distMethod}
                  onChange={e => setDistMethod(e.target.value)}
                  disabled={isLocked}
                  style={{ appearance: 'none', padding: '9px 32px 9px 13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '800', outline: 'none', cursor: isLocked ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  <option value={DIST_METHODS.AUTO}>Automático (Smart)</option>
                  <option value={DIST_METHODS.DIRETORIA}>Metas da Diretoria</option>
                  <option value={DIST_METHODS.EQUAL}>Igualitário</option>
                </select>
                <ChevronDown size={13} color="var(--text-muted)" style={{ position: 'absolute', right: '11px', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.keys(channelMix.metasPorCanal).length > 0 ? (
                Object.entries(channelMix.metasPorCanal).map(([canalId, valorSimulado]) => {
                  const ch = channels.find(c => c.id === canalId);
                  const valorOriginal = Number(channelMix.originalGoals[canalId] ?? 0);
                  const mixPct = ((channelMix.mix[canalId] ?? 0) * 100).toFixed(1);
                  const diff = valorSimulado - valorOriginal;
                  const barPct = Math.min((valorSimulado / (baseMetrics.metaBruta || 1)) * 100, 100);

                  return (
                    <div key={canalId} style={{ paddingBottom: '14px', borderBottom: '1px dashed var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-main)' }}>{ch?.name || canalId}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>{mixPct}% do mix</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {distMethod === DIST_METHODS.DIRETORIA && valorOriginal > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>Plano: {valorOriginal}</div>
                          )}
                          <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)' }}>{valorSimulado}</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barPct}%`, background: colors.warning, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                      </div>
                      {distMethod === DIST_METHODS.DIRETORIA && valorOriginal > 0 && (
                        <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: '900', color: diff >= 0 ? colors.success : colors.danger, marginTop: '5px' }}>
                          {diff >= 0 ? `+${diff}` : diff} vs plano
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '800' }}>
                  Nenhum dado disponível para o método selecionado.
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '900', background: 'var(--bg-app)', padding: '10px', borderRadius: '10px' }}>
              FONTE: {channelMix.dataSource.toUpperCase()}
            </div>
          </div>

          {/* Lock/Publish Button */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={savingLock}
            style={{ width: '100%', background: isLocked ? 'var(--bg-app)' : colors.success, color: isLocked ? 'var(--text-main)' : '#fff', border: isLocked ? '1px solid var(--border)' : 'none', padding: '18px', borderRadius: '16px', fontWeight: '900', cursor: savingLock ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', fontSize: '15px', boxShadow: isLocked ? 'none' : `0 8px 24px ${colors.success}38`, transition: 'all 0.2s ease' }}
            onMouseOver={e => { if (!isLocked && !savingLock) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { if (!isLocked && !savingLock) e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {savingLock
              ? <><RefreshCcw size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
              : isLocked
                ? <><Unlock size={18} /> Destravar Edição do Cenário</>
                : <><Lock size={18} /> Salvar e Publicar Cenário S&OP</>
            }
          </button>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}