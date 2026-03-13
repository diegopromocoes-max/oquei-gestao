// ============================================================
//  TabSimuladorSOP.jsx — Oquei Gestão  (Sprint 2 — refatorado)
//  Orquestrador do Simulador S&OP.
//  Responsabilidades: estado, Firebase listeners, memos, layout.
//  UI delegada para: sop/SopComponents, SopInsightsBox, SopChannelMix.
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, doc, onSnapshot, query, where, setDoc, getDocs } from 'firebase/firestore';
import {
  MapPin, Users, TrendingDown, Lock, Unlock,
  ArrowRight, TrendingUp, RefreshCcw, ChevronDown,
} from 'lucide-react';
import { colors } from '../../components/ui';

import { Sparkline, SmartSlider, ConfirmModal } from './sop/SopComponents';
import { SopInsightsBox }                        from './sop/SopInsightsBox';
import { SopChannelMix }                         from './sop/SopChannelMix';

// ─── Constantes ───────────────────────────────────────────────────────────────
const DIST_METHODS = { AUTO: 'auto', DIRETORIA: 'aba2', EQUAL: 'equal' };

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TabSimuladorSOP({ selectedMonth, userData }) {

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [cities,           setCities]           = useState([]);
  const [channels,         setChannels]         = useState([]);
  const [allResults,       setAllResults]       = useState([]);
  const [monthlyGoalsData, setMonthlyGoalsData] = useState({});
  const [monthlyBases,     setMonthlyBases]     = useState({});
  const [simulations,      setSimulations]      = useState({});
  const [loading,          setLoading]          = useState(true);

  const [selectedCityId,  setSelectedCityId]  = useState('');
  const [growthPercent,   setGrowthPercent]   = useState(0.0);
  const [churnPercent,    setChurnPercent]    = useState(0.0);
  const [distMethod,      setDistMethod]      = useState(DIST_METHODS.AUTO);
  const [savingLock,      setSavingLock]      = useState(false);
  const [historicalMix,   setHistoricalMix]   = useState(null);
  const [growthInputMode, setGrowthInputMode] = useState('percent');
  const [churnInputMode,  setChurnInputMode]  = useState('percent');
  const [showConfirm,     setShowConfirm]     = useState(false);

  // ── Firebase listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const myCluster = String(userData?.clusterId || '').trim();
    const isCoord   = userData?.role === 'coordinator' || userData?.role === 'coordenador';

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
      onSnapshot(
        query(collection(db, 'monthly_bases'), where('month', '==', selectedMonth)),
        snap => {
          const m = {};
          snap.docs.forEach(d => { m[d.data().cityId] = d.data(); });
          setMonthlyBases(m);
        }
      ),
      onSnapshot(
        query(collection(db, 'sop_simulations'), where('month', '==', selectedMonth)),
        snap => {
          const m = {};
          snap.docs.forEach(d => { m[d.data().cityId] = d.data(); });
          setSimulations(m);
        }
      ),
    ];

    return () => unsubs.forEach(u => u());
  }, [userData, selectedMonth]);

  // ── Reset ao trocar cidade ──────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !selectedCityId) return;
    const saved = simulations[selectedCityId];
    setGrowthPercent(saved?.growthPercent ?? 0);
    setChurnPercent(saved?.churnPercent  ?? 0);
    setDistMethod(saved?.distMethod      ?? DIST_METHODS.AUTO);
  }, [selectedCityId, loading]); // eslint-disable-line

  // ── Mix histórico de canais (últimos 3 meses) ───────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedCityId || !channels.length) return;
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevMonths = [1, 2, 3].map(offset => {
        const d = new Date(year, month - 1 - offset, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });
      try {
        const snap = await getDocs(collection(db, 'city_results'));
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        let totals = {}, totalGeral = 0;
        channels.forEach(ch => {
          let soma = 0;
          prevMonths.forEach(mId => {
            const r = results.find(r => r.id === `${mId}_${selectedCityId}`);
            if (r?.vendas) {
              const key = Object.keys(r.vendas).find(k => k === ch.id || k.toLowerCase() === ch.name.toLowerCase());
              if (key) Object.values(r.vendas[key]).forEach(v => soma += Number(v || 0));
            }
          });
          totals[ch.id] = soma;
          totalGeral += soma;
        });
        setHistoricalMix(totalGeral > 0
          ? Object.fromEntries(Object.entries(totals).map(([id, v]) => [id, v / totalGeral]))
          : null
        );
      } catch (err) {
        console.error('Erro ao processar histórico para modo Auto:', err);
      }
    };
    fetchHistory();
  }, [selectedMonth, selectedCityId, channels]);

  // ── Memos: cityData ─────────────────────────────────────────────────────────
  const cityData = useMemo(() => {
    if (!selectedCityId || !cities.length) return null;
    const c           = cities.find(city => city.id === selectedCityId) ?? cities[0];
    const monthBase   = monthlyBases[c.id];
    const baseAtual   = parseFloat(monthBase?.baseStart ?? c.baseStart ?? 0);
    const potencial   = parseFloat(c.potencial ?? 0);
    const history     = allResults
      .filter(r => r.cityId === c.id)
      .sort((a, b) => b.month.localeCompare(a.month));
    return { ...c, baseAtual, potencial, history };
  }, [selectedCityId, cities, allResults, monthlyBases]);

  // ── Memos: baseMetrics ──────────────────────────────────────────────────────
  const baseMetrics = useMemo(() => {
    if (!cityData) return null;
    const safe = (n, d) => (d && d !== 0 ? n / d : 0);
    const baseInicial    = Number(cityData.baseAtual ?? 0);
    const metaNet        = Math.ceil(baseInicial * (growthPercent / 100));
    const expectedChurn  = Math.ceil(baseInicial * (churnPercent  / 100));
    const metaBruta      = metaNet + expectedChurn;
    const last3          = cityData.history.slice(0, 3);

    const processedHistory = last3.map(m => {
      let gross = 0;
      if (m.vendas) Object.values(m.vendas).forEach(canal => Object.values(canal).forEach(v => gross += Number(v || 0)));
      const churn = Number(m.cancelamentos || 0);
      const net   = gross - churn;
      const base  = Number(m.baseStart || baseInicial || 1);
      return { gross, churn, net, base };
    });

    const avgGross    = processedHistory.length ? processedHistory.reduce((a, h) => a + h.gross, 0) / processedHistory.length : 0;
    const avgChurnAbs = processedHistory.length ? processedHistory.reduce((a, h) => a + h.churn, 0) / processedHistory.length : 0;
    const avgChurnPct = safe(avgChurnAbs, baseInicial) * 100;
    const avgNetPct   = processedHistory.length ? processedHistory.reduce((a, h) => a + safe(h.net, h.base) * 100, 0) / processedHistory.length : 0;
    const potReal     = cityData.potencial > 0 ? cityData.potencial : baseInicial * 2;
    const penetration = safe(baseInicial, potReal) * 100;
    const trendDirection = processedHistory.length >= 2
      ? (processedHistory[0].net >= processedHistory[1].net ? 'aceleração' : 'desaceleração')
      : 'estável';

    return {
      baseInicial, metaNet, expectedChurn, metaBruta,
      avgGross, avgChurnAbs, avgChurnPct, avgNetPct,
      penetration, trendDirection, last3,
      netHistory:   processedHistory.map(h => safe(h.net,   h.base) * 100).reverse(),
      churnHistory: processedHistory.map(h => safe(h.churn, h.base) * 100).reverse(),
    };
  }, [cityData, growthPercent, churnPercent]);

  // ── Memos: strategicMatrix ──────────────────────────────────────────────────
  const strategicMatrix = useMemo(() => {
    if (!baseMetrics) return null;
    const { penetration, avgNetPct } = baseMetrics;
    const marketProfile      = penetration >= 60 ? 'Maduro / Dominado' : penetration >= 30 ? 'Intermediário' : 'Expansão';
    const operationalProfile = avgNetPct >= 2.5 ? 'Alta Tração' : avgNetPct >= 0.5 ? 'Sustentável' : 'Estagnação / Retração';

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

  // ── Memos: localAlerts ──────────────────────────────────────────────────────
  const localAlerts = useMemo(() => {
    if (!baseMetrics) return [];
    const { avgNetPct, avgChurnPct, penetration, trendDirection } = baseMetrics;
    const alerts = [];
    if (growthPercent - avgNetPct > 2)
      alerts.push({ type: 'warning', title: 'Meta Acima da Capacidade Histórica', text: `Projeção (${growthPercent.toFixed(1)}%) supera média recente (${avgNetPct.toFixed(1)}%). Aprovação da Diretoria recomendada.` });
    if (penetration < 35 && growthPercent < avgNetPct)
      alerts.push({ type: 'info', title: 'Crescimento Conservador', text: `Penetração baixa (${penetration.toFixed(1)}%) — há espaço para acelerar sem risco.` });
    if (Math.abs(churnPercent - avgChurnPct) > 1.5)
      alerts.push({ type: 'critical', title: 'Churn Fora do Padrão Histórico', text: `Cancelamento projetado (${churnPercent.toFixed(1)}%) vs média (${avgChurnPct.toFixed(1)}%). Força-tarefa de retenção necessária.` });
    if (trendDirection === 'desaceleração')
      alerts.push({ type: 'warning', title: 'Tendência de Desaceleração', text: 'Os últimos meses mostram queda no ritmo de crescimento. Investigar causas antes de confirmar metas.' });
    if (alerts.length === 0 && growthPercent > 0)
      alerts.push({ type: 'success', title: 'Cenário Sustentável', text: 'Os números estão alinhados com o histórico. Cenário validado para publicação.' });
    return alerts;
  }, [baseMetrics, growthPercent, churnPercent]);

  // ── Memos: channelMix ───────────────────────────────────────────────────────
  const channelMix = useMemo(() => {
    if (!baseMetrics || !channels.length)
      return { metasPorCanal: {}, mix: {}, originalGoals: {}, dataSource: '' };

    const cityGoals = monthlyGoalsData[selectedCityId] || {};
    let channelTotals = {}, totalGeral = 0;
    Object.entries(cityGoals).forEach(([chId, prods]) => {
      const sum = Object.values(prods).reduce((a, v) => a + Number(v ?? 0), 0);
      if (sum > 0) { channelTotals[chId] = sum; totalGeral += sum; }
    });

    const dirMix   = totalGeral > 0
      ? Object.fromEntries(Object.entries(channelTotals).map(([id, v]) => [id, v / totalGeral]))
      : null;
    const equalMix = Object.fromEntries(channels.map(ch => [ch.id, 1 / channels.length]));

    let mix, dataSource;
    if (distMethod === DIST_METHODS.EQUAL) {
      mix = equalMix; dataSource = 'Distribuição Igualitária';
    } else if (distMethod === DIST_METHODS.DIRETORIA) {
      mix = dirMix ?? equalMix; dataSource = dirMix ? 'Metas da Diretoria (Aba 2)' : 'Igualitário (sem metas)';
    } else {
      mix = historicalMix ?? dirMix ?? equalMix;
      dataSource = historicalMix ? 'Automático (Média Real 3M)' : dirMix ? 'Automático (Meta Aba 2)' : 'Automático (Distribuição Igualitária)';
    }

    // Distribuição de restos (garante soma exata)
    const itens = Object.entries(mix).map(([id, pct]) => {
      const bruto = baseMetrics.metaBruta * pct;
      return { id, valorInteiro: Math.floor(bruto), resto: bruto - Math.floor(bruto) };
    });
    const somaAtual  = itens.reduce((a, i) => a + i.valorInteiro, 0);
    const diferenca  = baseMetrics.metaBruta - somaAtual;
    itens.sort((a, b) => b.resto - a.resto);
    const metasPorCanal = {};
    itens.forEach((item, idx) => { metasPorCanal[item.id] = item.valorInteiro + (idx < diferenca ? 1 : 0); });

    return { metasPorCanal, mix, originalGoals: channelTotals, dataSource };
  }, [baseMetrics, monthlyGoalsData, channels, distMethod, selectedCityId, historicalMix]);

  // ── Lock / Publish ──────────────────────────────────────────────────────────
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
      window.showToast?.('Erro ao publicar cenário. Tente novamente.', 'error');
    }
    setSavingLock(false);
    setShowConfirm(false);
  };

  // ── Loading guard ───────────────────────────────────────────────────────────
  if (loading || !cityData || !baseMetrics || !strategicMatrix) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCcw size={28} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '14px', fontWeight: '800' }}>Iniciando Inteligência S&OP...</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Confirm Modal */}
      {showConfirm && (
        <ConfirmModal
          message={isLocked
            ? `Deseja destravar a edição do cenário de "${cityData.name || cityData.city}"?`
            : `Deseja publicar e travar o cenário S&OP de "${cityData.name || cityData.city}" para ${selectedMonth}?`
          }
          onConfirm={handleToggleLock}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── Header: seletor de cidade + indicadores ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '22px 28px', borderRadius: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap', gap: '20px' }}>
        {/* Seletor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={22} color={colors.primary} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
              Unidade Operacional
            </div>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={selectedCityId}
                onChange={e => setSelectedCityId(e.target.value)}
                style={{ appearance: 'none', border: '1px solid var(--border)', background: 'var(--bg-app)', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', padding: '9px 42px 9px 14px', borderRadius: '11px', fontFamily: 'inherit', transition: 'border-color 0.2s', minWidth: '200px' }}
                onFocus={e => e.currentTarget.style.borderColor = colors.primary}
                onBlur={e =>  e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {cities.map(city => <option key={city.id} value={city.id}>{city.name || city.city}</option>)}
              </select>
              <ChevronDown size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '13px', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* KPIs do header */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.06em', marginBottom: '2px' }}>POTENCIAL HP</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)' }}>{cityData.potencial || '—'}</div>
          </div>
          <div style={{ minWidth: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.06em' }}>PENETRAÇÃO</span>
              <span style={{ fontSize: '12px', fontWeight: '900', color: baseMetrics.penetration > 60 ? colors.primary : colors.success }}>
                {baseMetrics.penetration.toFixed(1)}%
              </span>
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

      {/* ── Grid principal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(370px, 1fr))', gap: '22px' }}>

        {/* COLUNA ESQUERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Slider de Crescimento */}
          <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: '22px', border: `1px solid ${isLocked ? 'var(--border)' : 'rgba(16,185,129,0.2)'}`, transition: 'border-color 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '800' }}>
                <TrendingUp size={17} color={colors.success} /> Crescimento Alvo (Net)
              </h3>
              {baseMetrics.netHistory.length > 1 && <Sparkline data={baseMetrics.netHistory} color={colors.success} />}
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

          {/* Slider de Churn */}
          <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: '22px', border: `1px solid ${isLocked ? 'var(--border)' : 'rgba(239,68,68,0.2)'}`, transition: 'border-color 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '800' }}>
                <TrendingDown size={17} color={colors.danger} /> Projeção de Cancelamentos
              </h3>
              {baseMetrics.churnHistory.length > 1 && <Sparkline data={baseMetrics.churnHistory} color={colors.danger} />}
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

          {/* Bloco de Insights */}
          <SopInsightsBox
            baseMetrics={baseMetrics}
            strategicMatrix={strategicMatrix}
            localAlerts={localAlerts}
            cityData={cityData}
            growthPercent={growthPercent}
            churnPercent={churnPercent}
          />
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Resumo do Fluxo Operacional */}
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
                <div style={{ fontSize: '26px', fontWeight: '900', color: colors.purple, transition: 'all 0.3s' }}>
                  {(baseMetrics.baseInicial + baseMetrics.metaNet).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
            <div style={{ padding: '18px', background: 'var(--bg-app)', borderRadius: '14px', border: `2px dashed ${colors.success}`, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>NECESSIDADE DE VENDAS BRUTAS (GROSS)</div>
              <div style={{ fontSize: '34px', fontWeight: '900', color: colors.success, transition: 'all 0.3s' }}>
                {baseMetrics.metaBruta.toLocaleString('pt-BR')}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>novas contas</span>
              </div>
            </div>
            {/* Histórico recente */}
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

          {/* Mix de Canais + Botão Publicar */}
          <SopChannelMix
            channels={channels}
            channelMix={channelMix}
            baseMetrics={baseMetrics}
            distMethod={distMethod}
            onDistChange={setDistMethod}
            isLocked={isLocked}
            savingLock={savingLock}
            onPublish={() => setShowConfirm(true)}
            DIST_METHODS={DIST_METHODS}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}