import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  Store, Users, TrendingUp, Zap, AlertCircle,
  RefreshCw, Flame, FileCheck,
  Megaphone, Target, ShieldAlert, Calendar, Clock,
  CheckCircle2, FileText, UserCheck, ListChecks, Wallet
} from 'lucide-react';
import { colors } from '../styles/globalStyles';
import { getDatesInRange } from '../lib/operationsCalendar';
import { loadMonthlySalesScope } from '../services/monthlySalesService';
import { listRhRequestsForScope } from '../services/atendenteRhService';
import { listAbsenceRequestsForScope, listAbsencesForScope } from '../services/absenceRequests';

function prettifyStoreId(value = '') {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasPendingCoverage(absence = {}) {
  if (absence.type === 'ferias') return false;
  const dates = getDatesInRange(absence.startDate, absence.endDate);
  if (!dates.length) return false;
  return dates.some((date) => !absence.coverageMap?.[date]);
}

function getFirstPendingCoverageDate(absence = {}) {
  const dates = getDatesInRange(absence.startDate, absence.endDate);
  return dates.find((date) => !absence.coverageMap?.[date]) || absence.startDate || '';
}

function formatDateLabel(value) {
  if (!value) return 'Data nao informada';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });
}

export default function DashboardSupervisor({ userData, setActiveView }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ lojas: 0, consultores: 0, vendasMes: 0, metaVendas: 0, alertasRh: 0 });
  const [stores, setStores] = useState([]);

  const [rhPendentes, setRhPendentes] = useState([]);
  const [absencePendentes, setAbsencePendentes] = useState([]);
  const [coveragePendentes, setCoveragePendentes] = useState([]);
  const [faltasHoje, setFaltasHoje] = useState([]);
  const [rotinas, setRotinas] = useState([
    { id: 1, title: 'Conferencia de Vendas', desc: 'Validar contratos lancados ontem no sistema', done: false },
    { id: 2, title: 'Ponto Tangerino', desc: 'Validar atrasos e justificar faltas da equipa', done: false },
    { id: 3, title: 'Alinhamento Matinal', desc: 'Check-in de alinhamento e metas com os gerentes', done: false }
  ]);

  const myCluster = String(userData?.clusterId || userData?.cluster || '').trim();

  const resolveStoreLabel = (item = {}) => {
    const storeId = item.storeId || item.cityId || '';
    const matchedStore = stores.find((store) => store.id === storeId);
    return (
      matchedStore?.name
      || matchedStore?.cityName
      || matchedStore?.city
      || item.storeName
      || item.cityName
      || prettifyStoreId(storeId)
      || 'Loja'
    );
  };

  const carregarDados = async () => {
    if (!auth.currentUser || !myCluster) return;
    setLoading(true);

    try {
      let qCities = collection(db, 'cities');
      if (myCluster) qCities = query(qCities, where('clusterId', '==', myCluster));
      const citySnap = await getDocs(qCities);
      const cityItems = citySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const userSnap = await getDocs(collection(db, 'users'));
      const consultores = userSnap.docs.filter((d) => {
        const data = d.data();
        return String(data.role).toLowerCase().includes('atend')
          && String(data.clusterId || data.cluster || '').trim() === myCluster;
      });

      const hoje = new Date();
      const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      const dataHojeStr = hoje.toISOString().split('T')[0];

      let vendas = 0;
      let metaVendas = 0;
      try {
        const salesScope = await loadMonthlySalesScope({ scope: 'cluster', clusterId: myCluster, monthKey: mesAtual });
        vendas = salesScope.totals?.p || 0;
        metaVendas = salesScope.totals?.goalP || 0;
      } catch (e) { console.warn('Aviso Leads:', e); }

      let rhData = [];
      let absenceData = [];
      let coverageData = [];
      try {
        rhData = await listRhRequestsForScope(userData, { includeHistory: false });
      } catch (e) { console.warn('Aviso RH:', e); }

      try {
        absenceData = await listAbsenceRequestsForScope(userData, { includeHistory: false });
      } catch (e) { console.warn('Aviso Ausencias:', e); }

      try {
        const scopedAbsences = await listAbsencesForScope(userData, { includePast: false });
        coverageData = scopedAbsences.filter((item) => hasPendingCoverage(item));
      } catch (e) { console.warn('Aviso Cobertura:', e); }

      let faltasData = [];
      try {
        let qFaltas = collection(db, 'absences');
        if (myCluster) qFaltas = query(qFaltas, where('clusterId', '==', myCluster));
        const faltasSnap = await getDocs(qFaltas);
        faltasData = faltasSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((f) => f.startDate <= dataHojeStr && f.endDate >= dataHojeStr);
      } catch (e) { console.warn('Aviso Faltas:', e); }

      setStats({
        lojas: citySnap.size,
        consultores: consultores.length,
        vendasMes: vendas,
        metaVendas,
        alertasRh: rhData.length + absenceData.length + coverageData.length,
      });
      setStores(cityItems);
      setRhPendentes(rhData);
      setAbsencePendentes(absenceData);
      setCoveragePendentes(coverageData);
      setFaltasHoje(faltasData);
    } catch (err) {
      console.error('Erro ao carregar KPIs do Supervisor:', err);
    }

    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [userData]);

  const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const metaRegional = stats.metaVendas > 0 ? stats.metaVendas : (stats.lojas > 0 ? stats.lojas * 30 : 100);
  const percentualMeta = metaRegional > 0 ? Math.min(Math.round((stats.vendasMes / metaRegional) * 100), 100) : 0;

  const toggleRotina = (id) => {
    setRotinas(rotinas.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  const primaryColor = colors?.primary || '#3b82f6';
  const successColor = colors?.success || '#10b981';
  const warningColor = colors?.warning || '#f59e0b';
  const dangerColor = colors?.danger || '#ef4444';
  const purpleColor = colors?.purple || '#8b5cf6';
  const infoColor = colors?.cyan || '#06b6d4';

  return (
    <div className="animated-view" style={{ paddingBottom: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <div style={{ ...styles.heroBanner, background: `linear-gradient(135deg, ${purpleColor} 0%, #4c1d95 100%)` }}>
        <div style={styles.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.9 }}>
            <Calendar size={16} />
            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{dataAtual}</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 5px 0', letterSpacing: '-0.02em' }}>
            Ola, {userData?.name?.split(' ')[0] || 'Supervisor'}!
          </h1>
          <p style={{ fontSize: '15px', margin: 0, opacity: 0.9 }}>Visao Estrategica da {myCluster || 'Sua Regional'}</p>
        </div>
        <button onClick={carregarDados} style={styles.heroRefreshBtn} title="Atualizar Dashboard">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={styles.kpiGrid}>
        <MetricCard title="Vendas da Regional" value={stats.vendasMes} sub="Fechadas este mes" color={successColor} icon={TrendingUp} />
        <MetricCard title="Lojas Ativas" value={stats.lojas} sub="Na sua area de gestao" color={primaryColor} icon={Store} />
        <MetricCard title="Consultores" value={stats.consultores} sub="Equipa de Vendas" color={purpleColor} icon={Users} />
        <MetricCard title="Avisos RH" value={stats.alertasRh} sub="Pendentes de acao" color={stats.alertasRh > 0 ? dangerColor : warningColor} icon={ShieldAlert} />
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color={primaryColor} /> Pacing de Vendas ({myCluster || 'Sua Regional'})
          </h3>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>
            {stats.vendasMes} / <span style={{ color: 'var(--text-main)' }}>{metaRegional} Meta</span>
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${percentualMeta}%`, background: percentualMeta >= 100 ? successColor : primaryColor }} />
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'right' }}>
          {percentualMeta}% do objetivo alcancado
        </p>
      </div>

      <div style={styles.dailyManagementGrid}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={styles.cardPanel}>
            <h3 style={styles.cardHeaderTitle}><FileText size={18} color={primaryColor} /> SOLICITACOES DE RH</h3>
            {rhPendentes.length === 0 ? (
              <div style={styles.emptyStateBox}>
                <FileCheck size={24} color="var(--border)" style={{ marginBottom: '10px' }} />
                <span>A sua caixa de entrada de RH esta vazia. Excelente trabalho!</span>
              </div>
            ) : (
              <div style={styles.listContainer}>
                {rhPendentes.slice(0, 3).map((rh, i) => (
                  <div key={i} style={styles.listItem}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)' }}>{rh.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rh.type} • Aguardando aprovacao</span>
                    </div>
                    <button onClick={() => setActiveView('rh_requests')} style={styles.btnAcaoList}>Analisar</button>
                  </div>
                ))}
                {rhPendentes.length > 3 && <div style={{ fontSize: '11px', textAlign: 'center', color: primaryColor, cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }} onClick={() => setActiveView('rh_requests')}>Ver mais {rhPendentes.length - 3} pedidos...</div>}
              </div>
            )}
          </div>

          <div style={styles.cardPanel}>
            <h3 style={styles.cardHeaderTitle}><AlertCircle size={18} color={warningColor} /> AUSENCIAS PENDENTES</h3>
            {absencePendentes.length === 0 ? (
              <div style={styles.emptyStateBox}>
                <CheckCircle2 size={24} color="var(--border)" style={{ marginBottom: '10px' }} />
                <span>Nenhuma solicitacao operacional aguardando aprovacao.</span>
              </div>
            ) : (
              <div style={styles.listContainer}>
                {absencePendentes.slice(0, 3).map((item, i) => (
                  <div key={i} style={styles.listItem}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)' }}>{item.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.type} • {resolveStoreLabel(item)}</span>
                    </div>
                    <button onClick={() => setActiveView('faltas')} style={styles.btnAcaoList}>Analisar</button>
                  </div>
                ))}
                {absencePendentes.length > 3 && <div style={{ fontSize: '11px', textAlign: 'center', color: primaryColor, cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }} onClick={() => setActiveView('faltas')}>Ver mais {absencePendentes.length - 3} pedidos...</div>}
              </div>
            )}
          </div>

          <div style={styles.cardPanel}>
            <h3 style={styles.cardHeaderTitle}><UserCheck size={18} color={successColor} /> FALTAS E ESCALA</h3>
            {coveragePendentes.length > 0 ? (
              <div style={styles.listContainer}>
                {coveragePendentes.slice(0, 3).map((falta, i) => (
                  <div key={i} style={styles.coverageAlertCard}>
                    <div style={styles.coverageAlertHeader}>
                      <div>
                        <div style={styles.coverageAlertEyebrow}>Cobertura pendente</div>
                        <strong style={styles.coverageAlertStore}>{resolveStoreLabel(falta)}</strong>
                      </div>
                      <div style={styles.coverageAlertDate}>{formatDateLabel(getFirstPendingCoverageDate(falta))}</div>
                    </div>
                    <div style={styles.coverageAlertBody}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-main)' }}>{falta.attendantName || falta.employeeName || 'Colaborador'}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ausencia aprovada aguardando definicao de cobertura da loja.</span>
                      </div>
                      <button onClick={() => setActiveView('faltas')} style={styles.coverageAlertBtn}>Cobrir agora</button>
                    </div>
                  </div>
                ))}
                {coveragePendentes.length > 3 && <div style={{ fontSize: '11px', textAlign: 'center', color: warningColor, cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }} onClick={() => setActiveView('faltas')}>Ver mais {coveragePendentes.length - 3} coberturas...</div>}
              </div>
            ) : faltasHoje.length === 0 ? (
              <div style={{ ...styles.emptyStateBox, background: `${successColor}15`, color: successColor, border: `1px solid ${successColor}40` }}>
                <CheckCircle2 size={24} color={successColor} style={{ marginBottom: '10px' }} />
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Cobertura Completa</strong>
                <span style={{ fontSize: '12px' }}>A sua equipa iniciou a operacao sem baixas reportadas hoje.</span>
              </div>
            ) : (
              <div style={styles.listContainer}>
                {faltasHoje.map((falta, i) => (
                  <div key={i} style={{ ...styles.listItem, borderLeft: `3px solid ${dangerColor}` }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)' }}>{falta.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ausente hoje ({resolveStoreLabel(falta)})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.cardPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ ...styles.cardHeaderTitle, marginBottom: 0 }}><ListChecks size={18} color={warningColor} /> ROTINAS OPERACIONAIS</h3>
            <span style={{ fontSize: '11px', color: primaryColor, fontWeight: 'bold', cursor: 'pointer' }}>Minha Rotina</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rotinas.map((rotina) => (
              <div
                key={rotina.id}
                onClick={() => toggleRotina(rotina.id)}
                style={{ ...styles.routineCheckItem, background: rotina.done ? 'var(--bg-app)' : 'var(--bg-card)', opacity: rotina.done ? 0.6 : 1 }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${rotina.done ? successColor : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rotina.done ? successColor : 'transparent', transition: '0.2s' }}>
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

      <div style={{ marginBottom: '40px' }}>
        <h3 style={styles.sectionHeaderShortcut}>Sistemas Oquei</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="HubOquei Radar" icon={Zap} color={infoColor} onClick={() => setActiveView('hub_oquei')} />
          <ShortcutCard title="Painel de Vendas" icon={TrendingUp} color={successColor} onClick={() => setActiveView('vendas')} />
          <ShortcutCard title="Sala de Guerra" icon={Flame} color={dangerColor} onClick={() => setActiveView('war_room')} />
          <ShortcutCard title="Caixa Local" icon={Wallet} color={successColor} onClick={() => setActiveView('desencaixe')} />
        </div>
      </div>

      <div>
        <h3 style={styles.sectionHeaderShortcut}>Gestao de Equipa</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="Faltas e Escala" icon={AlertCircle} color={dangerColor} onClick={() => setActiveView('faltas')} />
          <ShortcutCard title="Aprovacoes de RH" icon={FileCheck} color={warningColor} onClick={() => setActiveView('rh_requests')} />
          <ShortcutCard title="Banco de Horas" icon={Clock} color={warningColor} onClick={() => setActiveView('banco_horas')} />
          <ShortcutCard title="Comunicados" icon={Megaphone} color={primaryColor} onClick={() => setActiveView('comunicados')} />
        </div>
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.4s ease forwards; }
        .shortcut-card:hover { transform: translateY(-4px); border-color: ${primaryColor} !important; }
      `}</style>
    </div>
  );
}

const MetricCard = ({ title, value, sub, color, icon: Icon }) => (
  <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', borderTop: `4px solid ${color}`, boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
      <Icon size={100} color={color} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', position: 'relative', zIndex: 2 }}>
      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <div style={{ background: `${color}15`, padding: '8px', borderRadius: '10px' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1, position: 'relative', zIndex: 2 }}>{value}</div>
    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600', position: 'relative', zIndex: 2 }}>{sub}</div>
  </div>
);

const ShortcutCard = ({ title, icon: Icon, color, onClick }) => (
  <div onClick={onClick} className="shortcut-card" style={styles.shortcutCard}>
    <div style={{ ...styles.shortcutIconWrapper, background: `${color}15`, color }}>
      <Icon size={20} />
    </div>
    <h4 style={styles.shortcutTitle}>{title}</h4>
  </div>
);

const styles = {
  heroBanner: {
    borderRadius: '24px', padding: '35px 40px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', color: '#ffffff', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
  },
  heroContent: { flex: 1 },
  heroRefreshBtn: { background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '12px', borderRadius: '14px', color: '#ffffff', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'background 0.2s' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },

  progressSection: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', marginBottom: '30px', boxShadow: 'var(--shadow-sm)' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  progressBarBg: { height: '12px', background: 'var(--bg-app)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' },
  progressBarFill: { height: '100%', transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)' },

  dailyManagementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '40px' },
  cardPanel: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', boxShadow: 'var(--shadow-sm)' },
  cardHeaderTitle: { margin: '0 0 20px 0', fontSize: '13px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' },

  emptyStateBox: { padding: '30px 20px', background: 'var(--bg-app)', border: '1px dashed var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px' },
  btnAcaoList: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' },
  coverageAlertCard: {
    borderRadius: '20px',
    padding: '18px',
    background: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(251,191,36,0.10) 100%)',
    border: '1px solid rgba(245,158,11,0.35)',
    boxShadow: '0 14px 30px rgba(245,158,11,0.12)',
    display: 'grid',
    gap: '16px',
  },
  coverageAlertHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  coverageAlertEyebrow: {
    fontSize: '11px',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#b45309',
    marginBottom: '6px',
  },
  coverageAlertStore: {
    display: 'block',
    fontSize: '22px',
    lineHeight: 1.1,
    fontWeight: '900',
    color: 'var(--text-main)',
  },
  coverageAlertDate: {
    padding: '8px 12px',
    borderRadius: '999px',
    background: '#fff7ed',
    border: '1px solid rgba(245,158,11,0.25)',
    fontSize: '12px',
    fontWeight: '900',
    color: '#b45309',
    whiteSpace: 'nowrap',
  },
  coverageAlertBody: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  coverageAlertBtn: {
    background: '#f59e0b',
    border: 'none',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow: '0 10px 18px rgba(245,158,11,0.25)',
  },

  routineCheckItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' },

  sectionHeaderShortcut: { fontSize: '14px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' },
  shortcutGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
  shortcutCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)' },
  shortcutIconWrapper: { padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  shortcutTitle: { fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }
};
