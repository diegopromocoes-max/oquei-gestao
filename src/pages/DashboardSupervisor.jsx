import React, { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, Bell,
  Calendar, CheckCircle2, Clock, FileCheck, FileText,
  Flame, ListChecks, Megaphone, RefreshCw, ShieldAlert,
  Store, Target, TrendingUp, UserCheck, Users, Wallet,
  X, Zap,
} from 'lucide-react';

import { db, auth } from '../firebase';
import { colors } from '../styles/globalStyles';
import { getDatesInRange } from '../lib/operationsCalendar';
import { listenMonthlySalesScope } from '../services/monthlySalesService';
import { listRhRequestsForScope } from '../services/atendenteRhService';
import { listAbsenceRequestsForScope, listAbsencesForScope } from '../services/absenceRequests';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function horasAte(dateStr) {
  return Math.ceil((new Date(`${dateStr}T00:00:00`) - new Date()) / 3_600_000);
}

function prettifyStoreId(value = '') {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function hasPendingCoverage(absence = {}) {
  if (absence.type === 'ferias') return false;
  const dates = getDatesInRange(absence.startDate, absence.endDate);
  return dates.length > 0 && dates.some((date) => !absence.coverageMap?.[date]);
}

function resolveStoreLabel(item = {}, stores = []) {
  const storeId = item.storeId || item.cityId || '';
  const match = stores.find((s) => s.id === storeId);
  return match?.name || match?.cityName || item.storeName || item.cityName || prettifyStoreId(storeId) || 'Loja';
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, actionLabel, onAction, color = colors.primary }) {
  return (
    <div style={s.sectionHeader}>
      <div>
        <div style={s.sectionTitle}><Icon size={15} color={color} style={{ flexShrink: 0 }} />{title}</div>
        {subtitle ? <p style={s.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {actionLabel ? (
        <button type="button" onClick={onAction} style={s.actionBtn(color)}>
          {actionLabel} <ArrowRight size={13} />
        </button>
      ) : null}
    </div>
  );
}

function GaugeKpi({ title, subtitle, current = 0, target = 0, accent, icon: Icon, helper, badge }) {
  const ratio = target > 0 ? Math.max(0, Math.min(1, current / target)) : 0;
  const circumference = Math.PI * 84;
  return (
    <div style={s.gaugeCard}>
      <div style={s.gaugeGlow(accent)} />
      <div style={s.gaugeHeader}>
        <div>
          <div style={s.gaugeEyebrow}>{title}</div>
          <div style={s.gaugeSubtitle}>{subtitle}</div>
        </div>
        <div style={s.gaugeIcon(accent)}><Icon size={18} color={accent} /></div>
      </div>
      <div style={s.gaugeSvgWrap}>
        <svg viewBox="0 0 240 150" style={{ width: '100%', height: '100%' }}>
          <path d="M 28 124 A 92 92 0 0 1 212 124" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="18" strokeLinecap="round" />
          <path d="M 28 124 A 92 92 0 0 1 212 124" fill="none" stroke={accent} strokeWidth="18" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference - (ratio * circumference)} />
        </svg>
        <div style={s.gaugeCenter}>
          <div style={s.gaugeValue}>{current}</div>
          <div style={s.gaugeStatus}>{target > 0 ? `${Math.round(ratio * 100)}% da meta` : 'sem meta'}</div>
        </div>
      </div>
      <div style={s.metricGrid}>
        <div style={s.metricBox}>
          <div style={s.metricLabel}>Realizado</div>
          <div style={{ ...s.metricValue, color: accent }}>{current}</div>
        </div>
        <div style={s.metricBox}>
          <div style={s.metricLabel}>Meta</div>
          <div style={s.metricValue}>{target || '—'}</div>
        </div>
      </div>
      {badge ? (
        <div style={{ ...s.gaugeBadge, background: badge.bg, color: badge.color }}>
          {badge.icon} {badge.text}
        </div>
      ) : null}
      <div style={s.gaugeHelper}>{helper}</div>
    </div>
  );
}

function SignalCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={s.signalCard}>
      <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={s.signalLabel}>{label}</div>
        <strong style={{ ...s.signalValue, color }}>{value}</strong>
        <span style={s.signalSub}>{sub}</span>
      </div>
    </div>
  );
}

function AlertCoverage({ count, onDismiss, onNavigate }) {
  if (!count) return null;
  return (
    <div style={s.alertBox}>
      <div style={s.alertHeader}>
        <div style={s.alertIconWrap}><Bell size={16} color={colors.danger} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: colors.danger }}>
            {count} {count === 1 ? 'falta sem cobertura' : 'faltas sem cobertura'} confirmada{count !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Ausencias aprovadas sem substituto definido para as datas
          </div>
        </div>
        <button type="button" onClick={onDismiss} style={s.iconGhost}><X size={15} /></button>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <button type="button" onClick={onNavigate} style={s.alertCta}>
          Ir para Faltas e Escala <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function AlertInstalls({ count, onNavigate }) {
  if (!count) return null;
  return (
    <div style={{ ...s.alertBox, borderLeftColor: colors.warning }}>
      <div style={s.alertHeader}>
        <div style={{ ...s.alertIconWrap, background: `${colors.warning}20` }}>
          <AlertTriangle size={16} color={colors.warning} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: colors.warning }}>
            {count} {count === 1 ? 'venda contratada aguarda' : 'vendas contratadas aguardam'} instalacao
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            So contam para a meta quando a instalacao for registrada
          </div>
        </div>
        <button type="button" onClick={() => onNavigate?.('vendas')} style={s.iconGhost}>
          <ArrowRight size={15} color={colors.warning} />
        </button>
      </div>
    </div>
  );
}

function RankingRow({ atendente, index, totalVendas, goal }) {
  const pct = totalVendas > 0 ? Math.round((atendente.vendas / totalVendas) * 100) : 0;
  const goalPct = goal > 0 ? Math.min(Math.round((atendente.vendas / goal) * 100), 100) : 0;
  const isTop = index === 0;
  return (
    <div style={s.rankRow(isTop)}>
      <div style={s.rankBadge(isTop, index)}>{index + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {atendente.attendantName}
        </strong>
        <div style={{ marginTop: 6, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${goalPct || pct}%`, background: isTop ? colors.success : colors.primary, transition: 'width .6s ease' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-main)' }}>{atendente.vendas}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>vendas</span>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{atendente.leads} leads</div>
      </div>
    </div>
  );
}

function ShortcutCard({ title, icon: Icon, color, onClick }) {
  return (
    <div onClick={onClick} className="shortcut-card" style={s.shortcutCard}>
      <div style={s.shortcutIcon(color)}><Icon size={20} /></div>
      <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{title}</h4>
    </div>
  );
}

// ── Dashboard Principal ───────────────────────────────────────────────────────

export default function DashboardSupervisor({ userData, setActiveView }) {
  const [loading, setLoading] = useState(false);
  const [alertaDismissed, setAlertaDismissed] = useState(false);

  const [sales, setSales] = useState({
    prospeccoesMes: 0, metaVendas: 0,
    vendasFechadas: 0, instalacoesDoMes: 0,
    pendingInstallations: 0,
  });
  const [team, setTeam] = useState({ lojas: 0, consultores: 0 });
  const [stores, setStores] = useState([]);

  const [rhPendentes, setRhPendentes]         = useState([]);
  const [absencePendentes, setAbsencePendentes] = useState([]);
  const [coveragePendentes, setCoveragePendentes] = useState([]);
  const [faltasHoje, setFaltasHoje]           = useState([]);
  const [rankingAtendentes, setRankingAtendentes] = useState([]);

  const [rotinas, setRotinas] = useState([
    { id: 1, title: 'Conferencia de Vendas',  desc: 'Validar contratos lancados ontem no sistema', done: false },
    { id: 2, title: 'Ponto Tangerino',        desc: 'Validar atrasos e justificar faltas da equipa', done: false },
    { id: 3, title: 'Alinhamento Matinal',    desc: 'Check-in de alinhamento e metas com os gerentes', done: false },
  ]);

  const myCluster = String(userData?.clusterId || userData?.cluster || '').trim();
  const mesAtual = new Date().toISOString().slice(0, 7);
  const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── KPIs de vendas em tempo real ────────────────────────────────────────
  useEffect(() => {
    if (!myCluster) return undefined;
    return listenMonthlySalesScope({
      scope: 'cluster', clusterId: myCluster, monthKey: mesAtual,
      callback: (scope) => {
        setSales({
          prospeccoesMes:       scope?.openedLeadsCount || scope?.leads?.length || 0,
          metaVendas:           scope?.totals?.goalP || 0,
          vendasFechadas:       scope?.totals?.contractedP || 0,
          instalacoesDoMes:     scope?.totals?.installedP  || 0,
          pendingInstallations: scope?.totals?.pendingInstallations || 0,
        });
        setRankingAtendentes((scope?.topAttendants || []).map((item) => ({
          attendantId: item.attendantId,
          attendantName: item.attendantName,
          vendas: item.installs,
          leads: item.sales,
        })));
      },
      onError: (err) => console.warn('Aviso vendas RT:', err),
    });
  }, [myCluster]);

  // ── Ranking da equipa em tempo real ─────────────────────────────────────
  // ── Dados de people ops (carga pontual) ─────────────────────────────────
  const carregarDados = useCallback(async () => {
    if (!auth.currentUser || !myCluster) return;
    setLoading(true);
    try {
      const [citySnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'cities'), where('clusterId', '==', myCluster))),
        getDocs(collection(db, 'users')),
      ]);
      const cityItems   = citySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const consultores = userSnap.docs.filter((d) => {
        const u = d.data();
        return String(u.role).toLowerCase().includes('atend') && String(u.clusterId || u.cluster || '').trim() === myCluster;
      });
      setTeam({ lojas: citySnap.size, consultores: consultores.length });
      setStores(cityItems);

      const today = new Date().toISOString().split('T')[0];

      const [rhData, absData] = await Promise.all([
        listRhRequestsForScope(userData, { includeHistory: false }).catch(() => []),
        listAbsenceRequestsForScope(userData, { includeHistory: false }).catch(() => []),
      ]);

      const scopedAbs = await listAbsencesForScope(userData, { includePast: false }).catch(() => []);
      const coverage  = scopedAbs.filter(hasPendingCoverage);

      const faltasSnap = await getDocs(
        query(collection(db, 'absences'), where('clusterId', '==', myCluster))
      ).catch(() => ({ docs: [] }));
      const faltasHojeData = faltasSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((f) => f.startDate <= today && f.endDate >= today);

      setRhPendentes(rhData);
      setAbsencePendentes(absData);
      setCoveragePendentes(coverage);
      setFaltasHoje(faltasHojeData);
    } catch (err) {
      console.error('Erro ao carregar dados do Supervisor:', err);
    } finally {
      setLoading(false);
    }
  }, [userData, myCluster]);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  useEffect(() => { setAlertaDismissed(false); }, [coveragePendentes.length]);

  const metaRegional  = sales.metaVendas > 0 ? sales.metaVendas : (team.lojas > 0 ? team.lojas * 30 : 100);
  const pacingPct     = metaRegional > 0 ? Math.min(Math.round((sales.instalacoesDoMes / metaRegional) * 100), 100) : 0;
  const alertasRh     = rhPendentes.length + absencePendentes.length + coveragePendentes.length;
  const totalVendas   = rankingAtendentes.reduce((sum, a) => sum + a.vendas, 0);

  return (
    <div className="animated-view" style={{ paddingBottom: 48, width: '100%' }}>

      {/* ── Alerta de cobertura urgente ────────────────────────────────── */}
      {!alertaDismissed && coveragePendentes.length > 0 && (
        <AlertCoverage
          count={coveragePendentes.length}
          onDismiss={() => setAlertaDismissed(true)}
          onNavigate={() => setActiveView('faltas')}
        />
      )}

      {/* ── Alerta de instalações pendentes ───────────────────────────── */}
      <AlertInstalls count={sales.pendingInstallations} onNavigate={setActiveView} />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{ ...s.hero, background: `linear-gradient(135deg, ${colors.purple || '#7c3aed'} 0%, #4c1d95 100%)` }}>
        <div>
          <div style={s.heroDate}><Calendar size={14} />{dataAtual}</div>
          <h1 style={s.heroTitle}>Ola, {userData?.name?.split(' ')[0] || 'Supervisor'}!</h1>
          <p style={s.heroText}>Visao estrategica da regional <strong>{myCluster || '—'}</strong> — vendas, equipa e operacao em um lugar so.</p>
        </div>
        <button type="button" onClick={carregarDados} style={s.refreshBtn}>
          <RefreshCw size={20} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── KPIs principais — Gauges ──────────────────────────────────── */}
      <div style={s.grid4}>
        <GaugeKpi
          title="Vendas Fechadas"
          subtitle="Contratos assinados este mes"
          current={sales.vendasFechadas}
          target={sales.metaVendas}
          accent={colors.primary}
          icon={FileCheck}
          helper="Leads que chegaram ao status Contratado este mes."
        />
        <GaugeKpi
          title="Instalacoes Executadas"
          subtitle="Ativacoes feitas este mes — vale para a meta"
          current={sales.instalacoesDoMes}
          target={sales.metaVendas}
          accent={colors.success}
          icon={Zap}
          badge={sales.pendingInstallations > 0
            ? { text: `${sales.pendingInstallations} pendentes`, bg: `${colors.warning}20`, color: colors.warning }
            : sales.vendasFechadas > 0
              ? { text: 'Em dia', bg: `${colors.success}20`, color: colors.success }
              : null
          }
          helper="Esta data define o mes da meta. Instalacao no mes seguinte = conta no mes seguinte."
        />
        <GaugeKpi
          title="Prospecções do Mes"
          subtitle="Leads abertos pela equipa este mes"
          current={sales.prospeccoesMes}
          target={Math.max(metaRegional, sales.prospeccoesMes, 1)}
          accent={colors.warning}
          icon={Activity}
          helper="Volume de captacao do mes. Serve como leitura de funil, nao como numero oficial de meta."
        />
        <GaugeKpi
          title="Avisos RH"
          subtitle="Pendencias operacionais aguardando acao"
          current={alertasRh}
          target={Math.max(6, alertasRh)}
          accent={alertasRh > 0 ? colors.danger : colors.info || '#06b6d4'}
          icon={ShieldAlert}
          helper={`${rhPendentes.length} RH · ${absencePendentes.length} ausencias · ${coveragePendentes.length} coberturas.`}
        />
      </div>

      {/* ── Sinais de equipa ──────────────────────────────────────────── */}
      <div style={s.signalsRow}>
        <SignalCard icon={Store}    label="Lojas Ativas"   value={team.lojas}       sub="Na sua regional"   color={colors.info || '#06b6d4'} />
        <SignalCard icon={Users}    label="Consultores"    value={team.consultores} sub="Equipa de vendas"  color={colors.purple || '#7c3aed'} />
        <SignalCard icon={FileText} label="Pedidos RH"     value={rhPendentes.length}    sub="Aguardando decisao"  color={rhPendentes.length > 0 ? colors.danger : colors.success} />
        <SignalCard icon={AlertCircle} label="Ausencias"  value={absencePendentes.length} sub="Pendentes de aprovacao" color={absencePendentes.length > 0 ? colors.warning : colors.success} />
        <SignalCard icon={UserCheck} label="Sem cobertura" value={coveragePendentes.length} sub="Lojas expostas"  color={coveragePendentes.length > 0 ? colors.danger : colors.success} />
        <SignalCard icon={Clock}    label="Faltas hoje"    value={faltasHoje.length} sub="Em tempo real"     color={faltasHoje.length > 0 ? colors.danger : colors.success} />
      </div>

      {/* ── Pacing bar ───────────────────────────────────────────────── */}
      <div style={s.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={s.sectionTitle}><Target size={16} color={colors.primary} />Pacing de Vendas — {myCluster || 'Regional'}</div>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>
            {sales.instalacoesDoMes} / <span style={{ color: 'var(--text-main)' }}>{metaRegional}</span>
            {sales.metaVendas === 0 && <span style={{ fontSize: 11, color: colors.warning, marginLeft: 8 }}>⚠ meta estimada</span>}
          </span>
        </div>
        <div style={s.progressBg}>
          <div style={s.progressFill(pacingPct, pacingPct >= 100 ? colors.success : colors.primary)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {pacingPct >= 100 ? '🎯 Meta atingida!' : pacingPct >= 70 ? '📈 No pacing' : '⚡ Precisa acelerar'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 900, color: pacingPct >= 100 ? colors.success : 'var(--text-main)' }}>
            {pacingPct}%
          </span>
        </div>
      </div>

      {/* ── Ranking da Equipa ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader
          icon={UserCheck}
          title="Minha Equipa — Instalacoes de Planos"
          subtitle="Ranking em tempo real priorizando plano instalado como resultado oficial do mes."
          actionLabel="Painel Vendas"
          onAction={() => setActiveView('vendas')}
          color={colors.purple || '#7c3aed'}
        />
        <div style={s.panel}>
          {rankingAtendentes.length === 0 ? (
            <div style={s.emptyState}>
              <Users size={28} color="var(--border)" />
              <span>Nenhum lead registrado pela equipa neste mes ainda.</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Os leads novos aparecem aqui em tempo real assim que forem cadastrados.
              </span>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {rankingAtendentes.map((atendente, idx) => (
                <RankingRow
                  key={atendente.attendantId}
                  atendente={atendente}
                  index={idx}
                  totalVendas={totalVendas}
                  goal={Math.round(sales.metaVendas / Math.max(rankingAtendentes.length, 1))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Operação de Pessoas ───────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader
          icon={ShieldAlert}
          title="Operacao de Pessoas"
          subtitle="Filas operacionais, cobertura de lojas e faltas ativas hoje."
          actionLabel="Abrir RH"
          onAction={() => setActiveView('rh_requests')}
          color={colors.warning}
        />
        <div style={s.grid3}>

          {/* Solicitações de RH */}
          <div style={s.panel}>
            <div style={s.feedTitle}><FileText size={14} color={colors.primary} />Solicitacoes de RH</div>
            {rhPendentes.length === 0 ? (
              <div style={s.emptyState}><CheckCircle2 size={20} color={colors.success} /><span>Caixa vazia. Tudo em dia.</span></div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {rhPendentes.slice(0, 4).map((rh, i) => (
                  <div key={i} style={s.listItem}>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13 }}>{rh.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rh.type} · aguardando</span>
                    </div>
                    <button type="button" onClick={() => setActiveView('rh_requests')} style={s.smallBtn}>Ver</button>
                  </div>
                ))}
                {rhPendentes.length > 4 && (
                  <button type="button" onClick={() => setActiveView('rh_requests')} style={s.moreBtn}>
                    +{rhPendentes.length - 4} mais pendencias
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ausências e Cobertura */}
          <div style={s.panel}>
            <div style={s.feedTitle}><AlertCircle size={14} color={colors.warning} />Ausencias e Cobertura</div>
            {absencePendentes.length === 0 && coveragePendentes.length === 0 ? (
              <div style={s.emptyState}><CheckCircle2 size={20} color={colors.success} /><span>Nenhuma pendencia operacional.</span></div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {absencePendentes.slice(0, 3).map((item, i) => (
                  <div key={i} style={s.listItem}>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13 }}>{item.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.type} · {resolveStoreLabel(item, stores)}</span>
                    </div>
                    <button type="button" onClick={() => setActiveView('faltas')} style={s.smallBtn}>Ver</button>
                  </div>
                ))}
                {coveragePendentes.slice(0, 2).map((falta, i) => (
                  <div key={`cov-${i}`} style={{ ...s.listItem, borderLeft: `3px solid ${colors.warning}` }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13 }}>{resolveStoreLabel(falta, stores)}</strong>
                      <span style={{ fontSize: 11, color: colors.warning, fontWeight: 700 }}>Sem cobertura · {formatDate(falta.startDate)}</span>
                    </div>
                    <button type="button" onClick={() => setActiveView('faltas')} style={{ ...s.smallBtn, color: colors.warning, borderColor: colors.warning }}>Cobrir</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Faltas hoje + Rotinas */}
          <div style={s.panel}>
            <div style={s.feedTitle}><ListChecks size={14} color={colors.success} />Rotinas Operacionais</div>
            {faltasHoje.length > 0 && (
              <div style={{ marginBottom: 12, padding: '10px 12px', background: `${colors.danger}10`, border: `1px solid ${colors.danger}30`, borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: colors.danger, marginBottom: 6 }}>
                  {faltasHoje.length} falta{faltasHoje.length > 1 ? 's' : ''} hoje
                </div>
                {faltasHoje.slice(0, 3).map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {f.attendantName || 'Colaborador'} · {resolveStoreLabel(f, stores)}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {rotinas.map((rotina) => (
                <div
                  key={rotina.id}
                  onClick={() => setRotinas((curr) => curr.map((r) => r.id === rotina.id ? { ...r, done: !r.done } : r))}
                  style={s.routineItem(rotina.done)}
                >
                  <div style={s.routineCheck(rotina.done)}>
                    {rotina.done ? <CheckCircle2 size={14} color="#fff" /> : null}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, textDecoration: rotina.done ? 'line-through' : 'none' }}>{rotina.title}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rotina.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Sistemas ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={s.blockLabel}>Sistemas Oquei</h3>
        <div style={s.shortcutGrid}>
          <ShortcutCard title="Painel de Vendas"   icon={TrendingUp} color={colors.success}                 onClick={() => setActiveView('vendas')} />
          <ShortcutCard title="HubOquei Radar"     icon={Zap}        color={colors.info || '#06b6d4'}       onClick={() => setActiveView('hub_oquei')} />
          <ShortcutCard title="Sala de Guerra"      icon={Flame}      color={colors.danger}                  onClick={() => setActiveView('war_room')} />
          <ShortcutCard title="Caixa Local"         icon={Wallet}     color={colors.success}                 onClick={() => setActiveView('desencaixe')} />
        </div>
      </div>

      <div>
        <h3 style={s.blockLabel}>Gestao de Equipa</h3>
        <div style={s.shortcutGrid}>
          <ShortcutCard title="Faltas e Escala"     icon={AlertCircle} color={colors.danger}                onClick={() => setActiveView('faltas')} />
          <ShortcutCard title="Aprovacoes de RH"    icon={FileCheck}   color={colors.warning}               onClick={() => setActiveView('rh_requests')} />
          <ShortcutCard title="Banco de Horas"      icon={Clock}       color={colors.warning}               onClick={() => setActiveView('banco_horas')} />
          <ShortcutCard title="Comunicados"         icon={Megaphone}   color={colors.primary}               onClick={() => setActiveView('comunicados')} />
        </div>
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animated-view { animation: fadeInView 0.4s ease forwards; }
        .shortcut-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,.07); border-color: var(--text-brand) !important; }
      `}</style>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = {
  hero: {
    borderRadius: 24, padding: '36px 40px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', color: '#fff', marginBottom: 28, boxShadow: '0 10px 30px rgba(0,0,0,.15)',
  },
  heroDate: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, opacity: .88, marginBottom: 10, textTransform: 'capitalize' },
  heroTitle: { fontSize: 32, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-.02em' },
  heroText: { fontSize: 14, margin: 0, opacity: .85 },
  refreshBtn: { background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', padding: 12, borderRadius: 14, color: '#fff', cursor: 'pointer' },

  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },

  signalsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
  signalCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' },
  signalLabel: { fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 },
  signalValue: { display: 'block', fontSize: 24, fontWeight: 900, lineHeight: 1 },
  signalSub: { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 },

  panel: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20 },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '.04em' },
  sectionSubtitle: { margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 },
  actionBtn: (color) => ({ background: `${color}15`, border: `1px solid ${color}40`, color, padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }),

  feedTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 900, color: 'var(--text-main)', marginBottom: 16 },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 12, gap: 10 },
  smallBtn: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0 },
  moreBtn: { width: '100%', padding: '8px', borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' },

  emptyState: { padding: '28px 20px', background: 'var(--bg-app)', borderRadius: 16, border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 },

  progressBg: { height: 12, background: 'var(--bg-app)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' },
  progressFill: (pct, color) => ({ height: '100%', width: `${pct}%`, background: color, transition: 'width 1s cubic-bezier(.22,1,.36,1)', borderRadius: 6 }),

  routineItem: (done) => ({ display: 'flex', alignItems: 'center', gap: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', background: done ? 'var(--bg-app)' : 'var(--bg-card)', opacity: done ? .6 : 1, transition: 'all .2s' }),
  routineCheck: (done) => ({ width: 20, height: 20, borderRadius: 6, border: `2px solid ${done ? colors.success : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? colors.success : 'transparent', flexShrink: 0, transition: '.2s' }),

  rankRow: (isTop) => ({ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: isTop ? `${colors.success}0a` : 'var(--bg-app)', border: `1px solid ${isTop ? colors.success + '30' : 'var(--border)'}`, borderRadius: 14 }),
  rankBadge: (isTop, idx) => ({ width: 28, height: 28, borderRadius: 9, background: isTop ? `${colors.success}20` : 'var(--bg-card)', border: `1px solid ${isTop ? colors.success : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: isTop ? colors.success : 'var(--text-muted)', flexShrink: 0 }),

  shortcutGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 16 },
  shortcutCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all .2s ease', boxShadow: 'var(--shadow-sm)' },
  shortcutIcon: (color) => ({ padding: 10, borderRadius: 12, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  blockLabel: { fontSize: 12, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14, borderBottom: '2px solid var(--border)', paddingBottom: 10 },

  // Gauge
  gaugeCard: { background: 'linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.94))', border: '1px solid rgba(148,163,184,.14)', borderRadius: 20, padding: 24, color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.12)' },
  gaugeGlow: (accent) => ({ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: accent, opacity: .08, filter: 'blur(40px)', pointerEvents: 'none' }),
  gaugeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  gaugeEyebrow: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', opacity: .8 },
  gaugeSubtitle: { fontSize: 11, opacity: .6, marginTop: 4, lineHeight: 1.4 },
  gaugeIcon: (accent) => ({ background: `${accent}25`, padding: 8, borderRadius: 10, flexShrink: 0 }),
  gaugeSvgWrap: { position: 'relative', width: '100%', maxWidth: 240, height: 150, margin: '0 auto' },
  gaugeCenter: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingTop: 32 },
  gaugeValue: { fontSize: 36, fontWeight: 900, letterSpacing: '-.04em', textAlign: 'center' },
  gaugeStatus: { fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', marginTop: 4 },
  metricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 },
  metricBox: { background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '8px 12px' },
  metricLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', opacity: .6, marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: 900 },
  gaugeBadge: { marginTop: 10, padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 800, textAlign: 'center' },
  gaugeHelper: { marginTop: 10, fontSize: 11, opacity: .55, lineHeight: 1.5 },

  // Alert boxes
  alertBox: { background: `${colors.danger}08`, border: `1px solid ${colors.danger}30`, borderLeft: `4px solid ${colors.danger}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  alertHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: 16 },
  alertIconWrap: { background: `${colors.danger}15`, padding: 8, borderRadius: 10, flexShrink: 0 },
  alertCta: { background: colors.danger, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  iconGhost: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 },
};
