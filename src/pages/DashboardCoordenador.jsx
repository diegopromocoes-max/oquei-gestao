import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import {
  Store, UserPlus, TrendingUp, Zap, AlertCircle,
  RefreshCw, Activity, MapPin, Flame, FileCheck,
  Megaphone, Target, ShieldAlert, Calendar,
  CheckCircle2, FileText, UserCheck, ListChecks,
  X, Bell, ArrowRight, CheckCircle
} from 'lucide-react';
import { colors } from '../styles/globalStyles';
import { loadMonthlySalesScope } from '../services/monthlySalesService';

// ── Helpers ──────────────────────────────────────────────────
const getDatesInRange = (start, end) => {
  if (!start || !end) return [];
  const dates = [];
  let cur = new Date(start + 'T12:00:00');
  const stop = new Date(end + 'T12:00:00');
  while (cur <= stop) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

const horasAte = (dateStr) => {
  const alvo = new Date(dateStr + 'T00:00:00');
  return Math.ceil((alvo - new Date()) / (1000 * 60 * 60));
};

// ── Notificação flutuante de urgência ────────────────────────
function AlertaUrgente({ faltas, onClose, onNavigate }) {
  if (!faltas.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      width: '360px', background: 'var(--bg-card)',
      border: `1px solid ${colors.danger}50`,
      borderLeft: `4px solid ${colors.danger}`,
      borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
      animation: 'slideInRight 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${colors.danger}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bell size={16} color={colors.danger} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '900', fontSize: '13px', color: colors.danger }}>
            ⚠️ Falta urgente sem cobertura
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {faltas.length} ocorrência{faltas.length > 1 ? 's' : ''} com início em menos de 48h
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, padding: '2px' }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
        {faltas.map((f) => {
          const horas = horasAte(f.startDate);
          return (
            <div key={f.id} style={{ padding: '10px 12px', borderRadius: '10px', background: `${colors.danger}08`, border: `1px solid ${colors.danger}20` }}>
              <div style={{ fontWeight: '900', fontSize: '13px', color: 'var(--text-main)' }}>{f.storeName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {f.attendantName} · começa em <strong style={{ color: colors.danger }}>{horas <= 24 ? `${horas}h` : 'menos de 48h'}</strong>
              </div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: colors.danger, marginTop: '4px' }}>
                Loja pode ficar fechada sem cobertura!
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '12px 16px 14px' }}>
        <button
          onClick={onNavigate}
          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: colors.danger, color: '#fff', fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          Ir para Gestão de Faltas <ArrowRight size={14} />
        </button>
      </div>
      <style>{`@keyframes slideInRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}

// ── Card de falta — visual GestaoView ───────────────────────
function FaltaCard({ falta, floaters, onNavigate, onCoverageChange }) {
  const dates     = getDatesInRange(falta.startDate, falta.endDate);
  const hasPending = dates.some(d => !falta.coverageMap?.[d]);
  const horas     = horasAte(falta.startDate);
  const urgente   = hasPending && horas > 0 && horas <= 48;

  return (
    <div
      onClick={onNavigate}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${urgente ? `${colors.danger}50` : 'var(--border)'}`,
        borderLeft: `4px solid ${urgente ? colors.danger : hasPending ? colors.warning : colors.success}`,
        borderRadius: '20px', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        boxShadow: urgente ? `0 0 0 2px ${colors.danger}18, var(--shadow-sm)` : 'var(--shadow-sm)',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: '900', color: colors.danger, background: `${colors.danger}15`, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              FALTA
            </span>
            <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '15px' }}>{falta.storeName}</span>
            {urgente && (
              <span style={{ fontSize: '10px', fontWeight: '900', color: '#fff', background: colors.danger, padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Bell size={9} /> URGENTE
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 2px 0' }}>
            <strong style={{ color: 'var(--text-main)' }}>{falta.attendantName}</strong>
            {falta.reason ? ` · ${falta.reason}` : ''}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            {new Date(falta.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
            {falta.startDate !== falta.endDate && ` até ${new Date(falta.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}
          </p>
        </div>
        <div>
          {hasPending
            ? <AlertCircle size={16} color={urgente ? colors.danger : colors.warning} />
            : <CheckCircle size={16} color={colors.success} />}
        </div>
      </div>

      {/* Banner de loja fechada */}
      {urgente && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '10px', background: `${colors.danger}10`, border: `1px solid ${colors.danger}30`, fontSize: '12px', fontWeight: '800', color: colors.danger }}>
          <AlertCircle size={13} />
          A loja <strong style={{ marginLeft: '4px' }}>{falta.storeName}</strong>&nbsp;pode ficar fechada — cobertura não designada!
        </div>
      )}

      {/* Grid de dias com select */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-app)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border)' }}
      >
        {dates.map(date => {
          const assignedId = falta.coverageMap?.[date];
          const isClosed   = assignedId === 'loja_fechada';
          const dateObj    = new Date(date + 'T12:00:00');
          const dayName    = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          return (
            <div key={date} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <div style={{ width: '80px', flexShrink: 0, display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontWeight: '900', color: 'var(--text-main)' }}>
                  {String(dateObj.getDate()).padStart(2, '0')}/{String(dateObj.getMonth() + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>{dayName}</span>
              </div>
              <select
                value={assignedId || ''}
                onChange={e => onCoverageChange(falta.id, date, e.target.value, falta.coverageMap)}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: '9px',
                  border: !assignedId ? `1px solid ${colors.warning}` : isClosed ? `1px solid ${colors.danger}40` : `1px solid ${colors.success}40`,
                  background: !assignedId ? `${colors.warning}15` : isClosed ? `${colors.danger}12` : `${colors.success}12`,
                  color: !assignedId ? '#b45309' : isClosed ? colors.danger : colors.success,
                  fontWeight: '800', fontSize: '12px', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="">⚠️ Pendente — Quem cobre?</option>
                <option value="loja_fechada">🚫 LOJA FECHADA</option>
                {floaters.map(f => (
                  <option key={f.id} value={f.id}>{f.name?.split(' ')[0] || f.name} ({f.cityId || 'Volante'})</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function DashboardCoordenador({ userData, setActiveView }) {
  const [loading, setLoading]           = useState(false);
  const [stats, setStats]               = useState({ cidades: 0, supervisores: 0, vendasMes: 0, metaVendas: 0, alertasRh: 0 });
  const [rhPendentes, setRhPendentes]   = useState([]);
  const [faltas, setFaltas]             = useState([]);
  const [floaters, setFloaters]         = useState([]);
  const [alertaDismissed, setAlertaDismissed] = useState(false);
  const [rotinas, setRotinas]           = useState([
    { id: 1, title: 'Conferência de Vendas', desc: 'Validar contratos lançados ontem',        done: false },
    { id: 2, title: 'Ponto Tangerino',       desc: 'Validar atrasos da equipe',                done: false },
    { id: 3, title: 'Alinhamento Matinal',   desc: 'Check-in rápido com os gerentes de loja', done: false },
  ]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const hoje        = new Date();
      const dataHojeStr = hoje.toISOString().split('T')[0];
      const mesAtual    = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

      const [citySnap, userSnap] = await Promise.all([
        getDocs(collection(db, 'cities')),
        getDocs(collection(db, 'users')),
      ]);

      const cMap = Object.fromEntries(citySnap.docs.map(d => [d.id, d.data()]));
      const uMap = Object.fromEntries(userSnap.docs.map(d => [d.id, d.data()]));

      const supervisores  = userSnap.docs.filter(d => String(d.data().role).toLowerCase().includes('superv'));
      const floatersList  = userSnap.docs.filter(d => d.data().role === 'attendant').map(d => ({ id: d.id, ...d.data() }));
      setFloaters(floatersList);

      // 1. Vendas em Lojas
      let vendas = 0;
      let metaVendas = 0;
      try {
        const salesScope = await loadMonthlySalesScope({ scope: 'global', monthKey: mesAtual });
        vendas = salesScope.salesCount || 0;
        metaVendas = salesScope.totals?.goalSales || 0;
      } catch (e) { console.warn('Aviso Leads:', e); }

      // 2. RH Pendentes
      let rhData = [];
      try {
        const rhSnap = await getDocs(query(collection(db, 'rh_requests'), where('status', '==', 'Pendente')));
        rhData = rhSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn('Aviso RH:', e); }

      // 3. Faltas ativas e futuras
      let faltasData = [];
      try {
        const faltasSnap = await getDocs(query(collection(db, 'absences'), where('endDate', '>=', dataHojeStr)));
        faltasData = faltasSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(f => f.type !== 'ferias')
          .map(f => ({
            ...f,
            attendantName: uMap[f.attendantId]?.name || f.attendantName || 'Colaborador',
            storeName:     cMap[f.storeId]?.name     || f.storeName     || f.storeId || 'Loja',
          }))
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
      } catch (e) { console.warn('Aviso Faltas:', e); }

      setStats({ cidades: citySnap.size, supervisores: supervisores.length, vendasMes: vendas, metaVendas, alertasRh: rhData.length });
      setRhPendentes(rhData);
      setFaltas(faltasData);
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  useEffect(() => { setAlertaDismissed(false); }, [faltas]);

  const handleCoverageChange = async (absenceId, date, floaterId, currentMap) => {
    try {
      const newMap = { ...currentMap, [date]: floaterId };
      await updateDoc(doc(db, 'absences', absenceId), { coverageMap: newMap });
      setFaltas(prev => prev.map(f => f.id === absenceId ? { ...f, coverageMap: newMap } : f));
      window.showToast?.('Cobertura atualizada.', 'success');
    } catch (e) {
      window.showToast?.('Erro ao salvar cobertura: ' + e.message, 'error');
    }
  };

  const dataAtual    = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const metaGlobal   = stats.metaVendas > 0 ? stats.metaVendas : (stats.cidades > 0 ? stats.cidades * 30 : 500);
  const percentualMeta = Math.min(Math.round((stats.vendasMes / metaGlobal) * 100), 100);

  const toggleRotina = id => setRotinas(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r));

  // Faltas urgentes: início em < 48h e sem cobertura em algum dia
  const faltasUrgentes = faltas.filter(f => {
    const h = horasAte(f.startDate);
    if (h <= 0 || h > 48) return false;
    return getDatesInRange(f.startDate, f.endDate).some(d => !f.coverageMap?.[d]);
  });

  return (
    <div className="animated-view" style={{ paddingBottom: '40px', width: '100%' }}>

      {/* Notificação flutuante */}
      {!alertaDismissed && faltasUrgentes.length > 0 && (
        <AlertaUrgente
          faltas={faltasUrgentes}
          onClose={() => setAlertaDismissed(true)}
          onNavigate={() => { setAlertaDismissed(true); setActiveView('faltas'); }}
        />
      )}

      {/* Cabeçalho hero */}
      <div style={styles.heroBanner}>
        <div style={styles.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.9 }}>
            <Calendar size={16} />
            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{dataAtual}</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 5px 0', letterSpacing: '-0.02em' }}>
            Olá, {userData?.name?.split(' ')[0] || 'Gestora'}! 👋
          </h1>
          <p style={{ fontSize: '15px', margin: 0, opacity: 0.9 }}>Visão Master da Operação Oquei Telecom</p>
        </div>
        <button onClick={carregarDados} style={styles.heroRefreshBtn} title="Atualizar Dashboard">
          <RefreshCw size={20} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* KPIs */}
      <div style={styles.kpiGrid}>
        <MetricCard title="Vendas em Lojas" value={stats.vendasMes}    sub="Contratos via atendentes"  color={colors.success} icon={TrendingUp} />
        <MetricCard title="Lojas Ativas"     value={stats.cidades}      sub="Unidades na Rede"           color={colors.primary} icon={Store} />
        <MetricCard title="Gestores"         value={stats.supervisores} sub="Supervisores Ativos"        color={colors.purple}  icon={UserPlus} />
        <MetricCard title="Avisos RH"        value={stats.alertasRh}    sub="Pendentes de Ação"          color={stats.alertasRh > 0 ? colors.danger : colors.warning} icon={ShieldAlert} />
      </div>

      {/* Pacing */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color={colors.primary} /> Pacing de Vendas em Lojas
          </h3>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>
            {stats.vendasMes} / <span style={{ color: 'var(--text-main)' }}>{metaGlobal} Meta</span>
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${percentualMeta}%`, background: percentualMeta >= 100 ? colors.success : colors.primary }} />
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'right' }}>
          {percentualMeta}% do objetivo alcançado
        </p>
      </div>

      {/* Gestão Diária: RH + Rotinas */}
      <div style={styles.dailyManagementGrid}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* RH */}
          <div style={styles.cardPanel}>
            <h3 style={styles.cardHeaderTitle}><FileText size={18} color={colors.primary} /> SOLICITAÇÕES DE RH</h3>
            {rhPendentes.length === 0 ? (
              <div style={styles.emptyStateBox}>
                <FileCheck size={24} color="var(--border)" style={{ marginBottom: '10px' }} />
                <span>A caixa de entrada de RH está vazia. Excelente trabalho!</span>
              </div>
            ) : (
              <div style={styles.listContainer}>
                {rhPendentes.slice(0, 3).map((rh, i) => (
                  <div key={i} style={styles.listItem}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)' }}>{rh.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rh.type} • Aguardando aprovação</span>
                    </div>
                    <button onClick={() => setActiveView('rh_requests')} style={styles.btnAcaoList}>Analisar</button>
                  </div>
                ))}
                {rhPendentes.length > 3 && (
                  <div style={{ fontSize: '11px', textAlign: 'center', color: 'var(--text-brand)', cursor: 'pointer', marginTop: '10px' }} onClick={() => setActiveView('rh_requests')}>
                    Ver mais {rhPendentes.length - 3} pedidos...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rotinas */}
          <div style={styles.cardPanel}>
            <h3 style={{ ...styles.cardHeaderTitle, marginBottom: '20px' }}><ListChecks size={18} color={colors.warning} /> ROTINAS OPERACIONAIS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rotinas.map(rotina => (
                <div key={rotina.id} onClick={() => toggleRotina(rotina.id)}
                  style={{ ...styles.routineCheckItem, background: rotina.done ? 'var(--bg-app)' : 'var(--bg-card)', opacity: rotina.done ? 0.6 : 1 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${rotina.done ? colors.success : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rotina.done ? colors.success : 'transparent' }}>
                    {rotina.done && <CheckCircle2 size={14} color="white" />}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)', textDecoration: rotina.done ? 'line-through' : 'none' }}>{rotina.title}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rotina.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Segunda coluna disponível para expansão futura */}
        <div />
      </div>

      {/* Faltas e Escala — estilo GestaoView */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ ...styles.sectionHeaderShortcut, marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            <UserCheck size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Faltas e Escala
          </h3>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '11px', fontWeight: '800' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.danger }}>
              <AlertCircle size={12} /> Urgente
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.warning }}>
              <AlertCircle size={12} /> Sem cobertura
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.success }}>
              <CheckCircle size={12} /> Coberta
            </span>
            <button onClick={() => setActiveView('faltas')}
              style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${colors.primary}30`, background: `${colors.primary}10`, color: colors.primary, fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>
              Ver todas →
            </button>
          </div>
        </div>
        <div style={{ borderBottom: '2px solid var(--border)', marginBottom: '20px' }} />

        {faltas.length === 0 ? (
          <div style={{ ...styles.emptyStateBox, padding: '40px', background: `${colors.success}08`, border: `1px dashed ${colors.success}40`, color: colors.success }}>
            <CheckCircle2 size={32} style={{ marginBottom: '10px', opacity: 0.6 }} />
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Cobertura Completa</strong>
            <span style={{ fontSize: '12px' }}>Nenhuma falta registrada para os próximos dias.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {faltas.map(f => (
              <FaltaCard
                key={f.id}
                falta={f}
                floaters={floaters}
                onNavigate={() => setActiveView('faltas')}
                onCoverageChange={handleCoverageChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Atalhos — Inteligência */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={styles.sectionHeaderShortcut}>Sistemas de Inteligência</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="HubOquei Radar"    icon={Zap}        color={colors.info}    onClick={() => setActiveView('hub_oquei')} />
          <ShortcutCard title="Laboratório Churn" icon={Activity}   color={colors.purple}  onClick={() => setActiveView('churn')} />
          <ShortcutCard title="Sala de Guerra"    icon={Flame}      color={colors.danger}  onClick={() => setActiveView('war_room')} />
          <ShortcutCard title="Painel de Vendas"  icon={TrendingUp} color={colors.success} onClick={() => setActiveView('vendas')} />
        </div>
      </div>

      {/* Atalhos — Administração */}
      <div>
        <h3 style={styles.sectionHeaderShortcut}>Administração e Estrutura</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="Gestão de Estrutura" icon={MapPin}    color={colors.primary} onClick={() => setActiveView('estrutura')} />
          <ShortcutCard title="Gestão de Equipe"    icon={UserPlus}  color={colors.primary} onClick={() => setActiveView('admin_supervisores')} />
          <ShortcutCard title="Aprovações de RH"    icon={FileCheck} color={colors.warning} onClick={() => setActiveView('rh_requests')} />
          <ShortcutCard title="Comunicados"          icon={Megaphone} color={colors.primary} onClick={() => setActiveView('comunicados')} />
        </div>
      </div>

      <style>{`
        @keyframes fadeInView  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin        { to { transform: rotate(360deg); } }
        .animated-view         { animation: fadeInView 0.4s ease forwards; }
        .shortcut-card:hover   { transform: translateY(-4px); box-shadow: 0 12px 25px rgba(0,0,0,0.06); border-color: var(--text-brand) !important; }
      `}</style>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────
const MetricCard = ({ title, value, sub, color, icon: Icon }) => (
  <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', borderTop: `4px solid ${color}`, boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
      <Icon size={100} color={color} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', position: 'relative', zIndex: 2 }}>
      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <div style={{ background: `${color}15`, padding: '8px', borderRadius: '10px' }}><Icon size={18} color={color} /></div>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1, position: 'relative', zIndex: 2 }}>{value}</div>
    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600', position: 'relative', zIndex: 2 }}>{sub}</div>
  </div>
);

const ShortcutCard = ({ title, icon: Icon, color, onClick }) => (
  <div onClick={onClick} className="shortcut-card" style={styles.shortcutCard}>
    <div style={{ padding: '12px', borderRadius: '12px', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} />
    </div>
    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{title}</h4>
  </div>
);

// ── Estilos ───────────────────────────────────────────────────
const styles = {
  heroBanner:       { background: `linear-gradient(135deg, ${colors.primary} 0%, #1e40af 100%)`, borderRadius: '24px', padding: '35px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: '#ffffff', marginBottom: '30px', boxShadow: '0 10px 30px rgba(37,99,235,0.2)' },
  heroContent:      { flex: 1 },
  heroRefreshBtn:   { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '14px', color: '#ffffff', cursor: 'pointer', backdropFilter: 'blur(10px)' },
  kpiGrid:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
  progressSection:  { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', marginBottom: '30px', boxShadow: 'var(--shadow-sm)' },
  progressHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  progressBarBg:    { height: '12px', background: 'var(--bg-app)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' },
  progressBarFill:  { height: '100%', transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' },
  dailyManagementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '40px' },
  cardPanel:        { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', boxShadow: 'var(--shadow-sm)' },
  cardHeaderTitle:  { margin: '0 0 20px 0', fontSize: '13px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' },
  emptyStateBox:    { padding: '30px 20px', background: 'var(--bg-app)', border: '1px dashed var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' },
  listContainer:    { display: 'flex', flexDirection: 'column', gap: '10px' },
  listItem:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px' },
  btnAcaoList:      { background: 'white', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' },
  routineCheckItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' },
  sectionHeaderShortcut: { fontSize: '14px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' },
  shortcutGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
  shortcutCard:     { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)' },
};
