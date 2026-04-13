import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Activity, AlertCircle, ArrowRight, Bell, Calendar, CheckCircle, CheckCircle2, FileCheck, FileText, Flame, HeartHandshake, ListChecks, MapPin, Megaphone, RefreshCw, ShieldAlert, Target, TrendingUp, UserCheck, UserPlus, X, Zap } from 'lucide-react';

import { db } from '../firebase';
import { loadCoordinatorDashboardData, createEmptyCoordinatorDashboardPayload } from '../services/coordinatorDashboardService';
import { colors } from '../styles/globalStyles';

const monthKeyNow = () => new Date().toISOString().slice(0, 7);

const getDatesInRange = (start, end) => {
  if (!start || !end) return [];
  const dates = [];
  let current = new Date(`${start}T12:00:00`);
  const stop = new Date(`${end}T12:00:00`);
  while (current <= stop) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const horasAte = (dateStr) => Math.ceil((new Date(`${dateStr}T00:00:00`) - new Date()) / (1000 * 60 * 60));

const formatDate = (value, options = { day: '2-digit', month: 'short' }) => {
  if (!value) return 'Sem data';
  const safeValue = String(value).includes('T') ? value : `${value}T12:00:00`;
  const parsed = new Date(safeValue);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return parsed.toLocaleDateString('pt-BR', options);
};

const formatDateTime = (dateValue, timeValue = '') => (timeValue ? `${formatDate(dateValue)} - ${timeValue}` : formatDate(dateValue));
const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));

const sparkPath = (values = [], width = 280, height = 88) => {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value / max) * height);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

function SectionHeader({ icon: Icon, title, subtitle, actionLabel, onAction, color = colors.primary }) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <div style={styles.sectionTitle}><Icon size={15} color={color} />{title}</div>
        {subtitle ? <p style={styles.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {actionLabel ? <button type="button" onClick={onAction} style={styles.actionBtn(color)}>{actionLabel}</button> : null}
    </div>
  );
}

function GaugeCard({ title, subtitle, current = 0, target = 0, accent, icon: Icon, inverse = false, currentLabel, targetLabel, helper }) {
  const safeCurrent = Number(current || 0);
  const safeTarget = Number(target || 0);
  const ratio = inverse
    ? (safeTarget > 0 ? Math.max(0, Math.min(1, 1 - (safeCurrent / safeTarget))) : (safeCurrent === 0 ? 1 : 0))
    : (safeTarget > 0 ? Math.max(0, Math.min(1, safeCurrent / safeTarget)) : 0);
  const circumference = Math.PI * 84;

  return (
    <div style={styles.gaugeCard}>
      <div style={styles.gaugeGlow(accent)} />
      <div style={styles.gaugeHeader}>
        <div>
          <div style={styles.gaugeEyebrow}>{title}</div>
          <div style={styles.gaugeSubtitle}>{subtitle}</div>
        </div>
        <div style={styles.gaugeIcon(accent)}><Icon size={18} color={accent} /></div>
      </div>
      <div style={styles.gaugeSvgWrap}>
        <svg viewBox="0 0 240 150" style={{ width: '100%', height: '100%' }}>
          <path d="M 28 124 A 92 92 0 0 1 212 124" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="18" strokeLinecap="round" />
          <path d="M 28 124 A 92 92 0 0 1 212 124" fill="none" stroke={accent} strokeWidth="18" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (ratio * circumference)} />
        </svg>
        <div style={styles.gaugeCenter}>
          <div style={styles.gaugeValue}>{safeCurrent}</div>
          <div style={styles.gaugeStatus}>{inverse ? `${safeCurrent} pendentes` : `${Math.round(ratio * 100)}% da meta`}</div>
        </div>
      </div>
      <div style={styles.metricGrid}>
        <div style={styles.metricBox}><div style={styles.metricLabel}>{currentLabel}</div><div style={{ ...styles.metricValue, color: accent }}>{safeCurrent}</div></div>
        <div style={styles.metricBox}><div style={styles.metricLabel}>{targetLabel}</div><div style={styles.metricValue}>{safeTarget}</div></div>
      </div>
      <div style={styles.gaugeHelper}>{helper}</div>
    </div>
  );
}

function AlertaUrgente({ faltas, onClose, onNavigate }) {
  if (!faltas.length) return null;
  return (
    <div style={styles.alertBox}>
      <div style={styles.alertHeader}>
        <div style={styles.alertIcon}><Bell size={16} color={colors.danger} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: colors.danger }}>Falta urgente sem cobertura</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{faltas.length} ocorrencia{faltas.length > 1 ? 's' : ''} com inicio em menos de 48h</div>
        </div>
        <button type="button" onClick={onClose} style={styles.iconGhost}><X size={15} /></button>
      </div>
      <div style={{ padding: '0 16px', display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
        {faltas.map((falta) => (
          <div key={falta.id} style={styles.alertItem}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{falta.storeName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{falta.attendantName} - comeca em <strong style={{ color: colors.danger }}>{horasAte(falta.startDate) <= 24 ? `${horasAte(falta.startDate)}h` : 'menos de 48h'}</strong></div>
          </div>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <button type="button" onClick={onNavigate} style={styles.alertCta}>Ir para Gestao de Faltas <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function FaltaCard({ falta, floaters, onNavigate, onCoverageChange }) {
  const dates = getDatesInRange(falta.startDate, falta.endDate);
  const hasPending = dates.some((date) => !falta.coverageMap?.[date]);
  const urgent = hasPending && horasAte(falta.startDate) > 0 && horasAte(falta.startDate) <= 48;
  return (
    <div onClick={onNavigate} style={styles.faltaCard(urgent, hasPending)}>
      <div style={styles.faltaHeader}>
        <div>
          <div style={styles.faltaTitleRow}>
            <span style={styles.badgeDanger}>Falta</span>
            <strong style={{ fontSize: 15 }}>{falta.storeName}</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{falta.attendantName}{falta.reason ? ` - ${falta.reason}` : ''}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(falta.startDate, { day: '2-digit', month: '2-digit' })}{falta.startDate !== falta.endDate ? ` ate ${formatDate(falta.endDate, { day: '2-digit', month: '2-digit' })}` : ''}</div>
        </div>
        {hasPending ? <AlertCircle size={16} color={urgent ? colors.danger : colors.warning} /> : <CheckCircle size={16} color={colors.success} />}
      </div>
      <div style={styles.coverageBox}>
        {dates.map((date) => (
          <div key={date} style={styles.coverageRow}>
            <div style={{ width: 84, fontWeight: 800 }}>{formatDate(date, { day: '2-digit', month: '2-digit' })}</div>
            <select value={falta.coverageMap?.[date] || ''} onChange={(event) => onCoverageChange(falta.id, date, event.target.value, falta.coverageMap)} style={styles.coverageSelect(falta.coverageMap?.[date])}>
              <option value="">Pendente - Quem cobre?</option>
              <option value="loja_fechada">LOJA FECHADA</option>
              {floaters.map((floater) => <option key={floater.id} value={floater.id}>{floater.name?.split(' ')[0] || floater.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedCard({ title, subtitle, icon: Icon, accent, items, emptyText, onOpen, actionLabel, renderItem }) {
  return (
    <div style={styles.panel}>
      <div style={styles.feedHeader}>
        <div>
          <div style={styles.feedTitle}><Icon size={15} color={accent} />{title}</div>
          <div style={styles.feedSubtitle}>{subtitle}</div>
        </div>
        {actionLabel ? <button type="button" onClick={onOpen} style={styles.actionBtn(accent)}>{actionLabel}</button> : null}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.length ? items.map(renderItem) : <div style={styles.emptyBox}><CheckCircle2 size={20} color={accent} /><span>{emptyText}</span></div>}
      </div>
    </div>
  );
}

function ShortcutCard({ title, icon: Icon, color, onClick }) {
  return <div onClick={onClick} className="shortcut-card" style={styles.shortcutCard}><div style={styles.shortcutIcon(color)}><Icon size={20} /></div><h4 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{title}</h4></div>;
}

export default function DashboardCoordenador({ userData, setActiveView }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(() => createEmptyCoordinatorDashboardPayload(monthKeyNow()));
  const [alertaDismissed, setAlertaDismissed] = useState(false);
  const [rotinas, setRotinas] = useState([
    { id: 1, title: 'Conferencia de vendas', desc: 'Validar contratos lancados ontem', done: false },
    { id: 2, title: 'Ponto Tangerino', desc: 'Validar atrasos da equipe', done: false },
    { id: 3, title: 'Alinhamento matinal', desc: 'Check-in rapido com os gerentes de loja', done: false },
  ]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await loadCoordinatorDashboardData({ userData, monthKey: monthKeyNow() });
      setData(payload);
    } catch (error) {
      console.error('Erro ao carregar dashboard da coordenadora:', error);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  useEffect(() => { setAlertaDismissed(false); }, [data.absences?.faltas]);

  const stats = useMemo(() => ({
    vendasMes: Number(data.sales?.totals?.p || 0),
    metaVendas: Number(data.sales?.totals?.goalP || 0),
    migracoesMes: Number(data.sales?.totals?.m || 0),
    svasMes: Number(data.sales?.totals?.ss || 0),
    metaSva: Number(data.sales?.totals?.goalS || 0),
    alertasRh: (data.peopleOps?.rhPendentes?.length || 0) + (data.peopleOps?.absencePendentes?.length || 0),
  }), [data]);

  const faltas = data.absences?.faltas || [];
  const floaters = data.absences?.floaters || [];
  const coveragePendentes = data.peopleOps?.coveragePendentes || [];
  const bankHours = data.peopleOps?.bankHoursSummary || {};
  const faltasUrgentes = faltas.filter((falta) => horasAte(falta.startDate) > 0 && horasAte(falta.startDate) <= 48 && getDatesInRange(falta.startDate, falta.endDate).some((date) => !falta.coverageMap?.[date]));

  const handleCoverageChange = async (absenceId, date, floaterId, currentMap) => {
    try {
      await updateDoc(doc(db, 'absences', absenceId), { coverageMap: { ...currentMap, [date]: floaterId } });
      window.showToast?.('Cobertura atualizada.', 'success');
      await carregarDados();
    } catch (error) {
      window.showToast?.(`Erro ao salvar cobertura: ${error.message}`, 'error');
    }
  };

  return (
    <div className="animated-view" style={{ paddingBottom: 40, width: '100%' }}>
      {!alertaDismissed && faltasUrgentes.length > 0 ? <AlertaUrgente faltas={faltasUrgentes} onClose={() => setAlertaDismissed(true)} onNavigate={() => setActiveView('faltas')} /> : null}
      <div style={styles.hero}>
        <div>
          <div style={styles.heroDate}><Calendar size={16} />{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 style={styles.heroTitle}>Ola, {userData?.name?.split(' ')[0] || 'Coordenadora'}!</h1>
          <p style={styles.heroText}>Visao executiva da operacao Oquei Telecom com foco em vendas, pessoas, cobertura e agenda critica do grupo.</p>
        </div>
        <button type="button" onClick={carregarDados} style={styles.refreshBtn}><RefreshCw size={20} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /></button>
      </div>
      <div style={styles.grid4}>
        <GaugeCard title="Venda de planos" subtitle="Total das lojas fisicas contra a meta comercial consolidada" current={stats.vendasMes} target={stats.metaVendas} accent={colors.success} icon={TrendingUp} currentLabel="Vendidos" targetLabel="Meta planos" helper="Leitura oficial da performance comercial das lojas fisicas neste mes." />
        <GaugeCard title="Migracoes realizadas" subtitle="Volume mensal de mudancas de plano efetivamente concluido" current={stats.migracoesMes} target={Math.max(stats.migracoesMes, 1)} accent={colors.warning} icon={Activity} currentLabel="Realizadas" targetLabel="Base atual" helper="Painel rapido do fluxo de migracoes ja convertidas no periodo." />
        <GaugeCard title="SVA vendidos" subtitle="Servicos adicionais vendidos frente a meta mensal total" current={stats.svasMes} target={stats.metaSva} accent={colors.purple} icon={Zap} currentLabel="Vendidos" targetLabel="Meta SVA" helper="Acompanhe a aderencia do time ao objetivo de servicos agregados." />
        <GaugeCard title="Avisos RH pendentes" subtitle="Itens que ainda precisam de decisao ou encaminhamento da coordenacao" current={stats.alertasRh} target={Math.max(6, stats.alertasRh || 0)} accent={stats.alertasRh > 0 ? colors.danger : colors.info} icon={ShieldAlert} currentLabel="Pendencias" targetLabel="Faixa critica" inverse helper="Quanto mais proximo de zero, mais limpa esta a operacao de RH." />
      </div>
      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon={UserCheck} title="Faltas e Escala" subtitle="Monitoramento das ausencias em aberto, coberturas e risco operacional por loja." actionLabel="Ver todas" onAction={() => setActiveView('faltas')} color={colors.primary} />
        {faltas.length === 0 ? <div style={styles.goodState}><CheckCircle2 size={30} style={{ opacity: 0.6 }} /><strong>Cobertura completa</strong><span>Nenhuma falta registrada para os proximos dias.</span></div> : <div style={styles.faltasGrid}>{faltas.map((falta) => <FaltaCard key={falta.id} falta={falta} floaters={floaters} onNavigate={() => setActiveView('faltas')} onCoverageChange={handleCoverageChange} />)}</div>}
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon={TrendingUp} title="Inteligencia Comercial" subtitle="Leitura resumida do Painel Vendas global com evolucao, projeção e desempenho das lojas." actionLabel="Abrir Painel Vendas" onAction={() => setActiveView('vendas')} color={colors.success} />
        <div style={styles.grid3}>
          <div style={styles.panel}>
            <div style={styles.feedHeader}><div><div style={styles.feedTitle}><TrendingUp size={15} color={colors.success} />Evolucao mensal</div><div style={styles.feedSubtitle}>Ultimos 6 meses de vendas de planos.</div></div></div>
            <div style={{ padding: '10px 0', height: 110, background: 'linear-gradient(180deg, rgba(16,185,129,0.06), rgba(16,185,129,0.01))', borderRadius: 16, border: '1px solid rgba(16,185,129,0.12)' }}>
              <svg viewBox="0 0 280 88" style={{ width: '100%', height: '100%' }}>
                <path d={sparkPath((data.sales?.evolution || []).map((item) => Number(item.sales || 0)))} fill="none" stroke={colors.success} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={styles.evolutionLabels}>{(data.sales?.evolution || []).map((item) => <div key={item.monthKey}><span>{item.label}</span><strong>{item.sales}</strong></div>)}</div>
            <div style={styles.summaryBox}><div><span style={styles.summaryLabel}>Projecao</span><strong style={styles.summaryValue}>{formatNumber(data.sales?.totals?.projP)}</strong></div><div style={{ textAlign: 'right' }}><span style={styles.summaryLabel}>Meta</span><strong style={styles.summaryValue}>{formatNumber(data.sales?.totals?.goalP)}</strong></div></div>
          </div>
          <div style={styles.panel}>
            <div style={styles.feedHeader}><div><div style={styles.feedTitle}><Target size={15} color={colors.primary} />Projecao e ritmo</div><div style={styles.feedSubtitle}>Comparativo entre fechado, meta e projeção do mês.</div></div></div>
            <div style={styles.kpiRow}><div style={styles.kpiBox}><span style={styles.summaryLabel}>Fechado</span><strong style={styles.summaryBig}>{formatNumber(data.sales?.totals?.p)}</strong></div><div style={styles.kpiBox}><span style={styles.summaryLabel}>Meta</span><strong style={styles.summaryBig}>{formatNumber(data.sales?.totals?.goalP)}</strong></div></div>
            <div style={styles.progressBg}><div style={styles.progressFill(Math.min(100, ((Number(data.sales?.totals?.projP || 0) / Math.max(Number(data.sales?.totals?.goalP || 1), 1)) * 100)), Number(data.sales?.totals?.projP || 0) >= Number(data.sales?.totals?.goalP || 0) ? colors.success : colors.primary)} /></div>
            <div style={styles.progressLegend}><span>Projecao: {formatNumber(data.sales?.totals?.projP)}</span><span style={{ color: Number(data.sales?.totals?.projP || 0) >= Number(data.sales?.totals?.goalP || 0) ? colors.success : colors.danger }}>{Number(data.sales?.totals?.projP || 0) >= Number(data.sales?.totals?.goalP || 0) ? 'Acima do pacing' : 'Pede aceleracao'}</span></div>
            <div style={styles.clusterWrap}>{(data.sales?.clusterSummary || []).slice(0, 3).map((item) => <div key={item.clusterId} style={styles.clusterChip}><span>{item.clusterId}</span><strong>{Math.round((item.score || 0) * 100)}%</strong></div>)}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.feedHeader}><div><div style={styles.feedTitle}><Flame size={15} color={colors.warning} />Melhores e piores lojas</div><div style={styles.feedSubtitle}>Desempenho frente a meta de planos.</div></div><button type="button" onClick={() => setActiveView('vendas')} style={styles.actionBtn(colors.warning)}>Abrir</button></div>
            <div style={styles.rankSection}><div><div style={styles.rankTitle(colors.success)}>Melhores</div>{(data.sales?.topStores || []).slice(0, 3).map((item) => <div key={`top-${item.city}`} style={styles.rankItem}><div><strong>{item.city}</strong><span>Meta {formatNumber(item.metaPlanos)}</span></div><div><strong>{formatNumber(item.salesPlanos)}</strong><span style={{ color: colors.success }}>{Math.round((item.score || 0) * 100)}%</span></div></div>)}</div><div><div style={styles.rankTitle(colors.danger)}>Piores</div>{(data.sales?.bottomStores || []).slice(0, 3).map((item) => <div key={`bottom-${item.city}`} style={styles.rankItem}><div><strong>{item.city}</strong><span>Meta {formatNumber(item.metaPlanos)}</span></div><div><strong>{formatNumber(item.salesPlanos)}</strong><span style={{ color: colors.danger }}>{Math.round((item.score || 0) * 100)}%</span></div></div>)}</div></div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon={ShieldAlert} title="Operacao de Pessoas" subtitle="Resumo das filas operacionais, cobertura em risco e sinais criticos de banco de horas." actionLabel="Abrir RH" onAction={() => setActiveView('rh_requests')} color={colors.warning} />
        <div style={styles.grid4Compact}>
          <div style={styles.signalCard}><FileText size={18} color={colors.primary} /><div><div style={styles.signalTitle}>Solicitacoes RH</div><strong style={styles.signalValue}>{formatNumber(data.peopleOps?.rhPendentes?.length)}</strong><span style={styles.signalSubtitle}>Pedidos aguardando decisao</span></div></div>
          <div style={styles.signalCard}><AlertCircle size={18} color={colors.warning} /><div><div style={styles.signalTitle}>Ausencias pendentes</div><strong style={styles.signalValue}>{formatNumber(data.peopleOps?.absencePendentes?.length)}</strong><span style={styles.signalSubtitle}>Pedidos operacionais em fila</span></div></div>
          <div style={styles.signalCard}><UserCheck size={18} color={colors.danger} /><div><div style={styles.signalTitle}>Cobertura pendente</div><strong style={styles.signalValue}>{formatNumber(coveragePendentes.length)}</strong><span style={styles.signalSubtitle}>Lojas sem substituicao confirmada</span></div></div>
          <div style={styles.signalCard}><ShieldAlert size={18} color={colors.purple} /><div><div style={styles.signalTitle}>Risco POQ</div><strong style={styles.signalValue}>{formatNumber((bankHours.riskPoq || 0) + (bankHours.lostPoq || 0))}</strong><span style={styles.signalSubtitle}>Em alerta ou perda de POQ</span></div></div>
        </div>
        <div style={styles.panel}>
          <div style={styles.feedHeader}><div><div style={styles.feedTitle}><ShieldAlert size={15} color={colors.purple} />Banco de horas e POQ</div><div style={styles.feedSubtitle}>Resumo executivo do risco de saldo critico e bonificacao.</div></div><button type="button" onClick={() => setActiveView('banco_horas')} style={styles.actionBtn(colors.purple)}>Abrir Banco de Horas</button></div>
          <div style={styles.grid4Compact}>
            <div style={styles.kpiBox}><span style={styles.summaryLabel}>Base monitorada</span><strong style={styles.summaryBig}>{formatNumber(bankHours.totalAttendants)}</strong><span style={styles.summaryHint}>Atendentes ativos</span></div>
            <div style={styles.kpiBox}><span style={styles.summaryLabel}>Saldo critico</span><strong style={{ ...styles.summaryBig, color: colors.warning }}>{formatNumber(bankHours.criticalBalance)}</strong><span style={styles.summaryHint}>Abs acima de 20h</span></div>
            <div style={styles.kpiBox}><span style={styles.summaryLabel}>Em risco de POQ</span><strong style={{ ...styles.summaryBig, color: colors.warning }}>{formatNumber(bankHours.riskPoq)}</strong><span style={styles.summaryHint}>Faixa de alerta</span></div>
            <div style={styles.kpiBox}><span style={styles.summaryLabel}>Sem POQ</span><strong style={{ ...styles.summaryBig, color: colors.danger }}>{formatNumber(bankHours.lostPoq)}</strong><span style={styles.summaryHint}>Perda consumada</span></div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon={Calendar} title="Agenda e Eventos" subtitle="Compromissos da coordenacao, pipeline de patrocinios e proximas acoes do Japa." color={colors.info} />
        <div style={styles.grid3}>
          <FeedCard title="Proximos eventos" subtitle="Agenda executiva pessoal da coordenadora" icon={Calendar} accent={colors.primary} items={data.agenda?.upcomingEvents || []} emptyText="Nenhum compromisso futuro cadastrado." onOpen={() => setActiveView('reunioes')} actionLabel="Abrir agenda" renderItem={(item) => <div key={item.id} style={styles.feedItem}><div style={styles.feedItemTop}><strong>{item.title || 'Compromisso'}</strong><span>{formatDateTime(item.date, item.time)}</span></div><div style={styles.feedMeta}><MapPin size={12} />{item.location || (item.type === 'reuniao' ? 'Reuniao' : 'Compromisso')}</div></div>} />
          <FeedCard title="Parcerias e patrocinio" subtitle="Solicitacoes pendentes e eventos aprovados em destaque" icon={HeartHandshake} accent={colors.purple} items={data.partnerships?.highlighted || []} emptyText="Nenhum patrocinio pendente ou aprovado em destaque." onOpen={() => setActiveView('patrocinio')} actionLabel="Abrir patrocinio" renderItem={(item) => <div key={item.id} style={styles.feedItem}><div style={styles.feedItemTop}><strong>{item.eventName || item.title || 'Solicitacao'}</strong><span style={styles.statusBadge(item.displayStatus === 'Aprovado' ? colors.success : colors.warning)}>{item.displayStatus}</span></div><div style={styles.feedMeta}><Calendar size={12} />{item.dateTime ? formatDate(item.dateTime) : 'Sem data'} • {item.city || item.location || 'Sem cidade'}</div></div>} />
          <FeedCard title="Agenda do Japa" subtitle="Cronograma das proximas acoes de marketing em campo" icon={Megaphone} accent={colors.warning} items={data.japa?.upcomingActions || []} emptyText="Nenhuma acao futura cadastrada para o Japa." onOpen={() => setActiveView('japa')} actionLabel="Abrir agenda Japa" renderItem={(item) => <div key={item.id} style={styles.feedItem}><div style={styles.feedItemTop}><strong>{item.activity || item.title || 'Acao comercial'}</strong><span>{formatDateTime(item.date, item.time)}</span></div><div style={styles.feedMeta}><MapPin size={12} />{item.city || 'Sem cidade'} {item.location ? `- ${item.location}` : ''}</div></div>} />
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon={ListChecks} title="Fila Imediata" subtitle="Itens prontos para triagem rapida da coordenacao no inicio do dia." color={colors.primary} />
        <div style={styles.grid3}>
          <div style={styles.panel}>{(data.peopleOps?.rhPendentes || []).length === 0 ? <div style={styles.emptyBox}><FileCheck size={20} color={colors.primary} /><span>A caixa de entrada de RH esta vazia.</span></div> : <div style={{ display: 'grid', gap: 10 }}><div style={styles.feedTitle}><FileText size={15} color={colors.primary} />Solicitacoes de RH</div>{(data.peopleOps?.rhPendentes || []).slice(0, 3).map((rh) => <div key={rh.id} style={styles.listItem}><div><strong>{rh.attendantName || 'Colaborador'}</strong><span>{rh.type} - aguardando aprovacao</span></div><button type="button" onClick={() => setActiveView('rh_requests')} style={styles.smallBtn}>Analisar</button></div>)}</div>}</div>
          <div style={styles.panel}>{coveragePendentes.length === 0 ? <div style={styles.emptyBox}><CheckCircle2 size={20} color={colors.success} /><span>Nenhuma cobertura pendente em aberto.</span></div> : <div style={{ display: 'grid', gap: 10 }}><div style={styles.feedTitle}><AlertCircle size={15} color={colors.warning} />Coberturas criticas</div>{coveragePendentes.slice(0, 3).map((item) => <div key={item.id} style={styles.listItem}><div><strong>{item.storeName || item.cityName || 'Loja'}</strong><span>{item.attendantName || 'Colaborador'} - {formatDate(item.startDate)}</span></div><button type="button" onClick={() => setActiveView('faltas')} style={styles.smallBtn}>Cobrir</button></div>)}</div>}</div>
          <div style={styles.panel}><div style={styles.feedTitle}><ListChecks size={15} color={colors.warning} />Rotinas operacionais</div><div style={{ display: 'grid', gap: 12, marginTop: 14 }}>{rotinas.map((rotina) => <div key={rotina.id} onClick={() => setRotinas((current) => current.map((item) => item.id === rotina.id ? { ...item, done: !item.done } : item))} style={styles.routineItem(rotina.done)}><div style={styles.routineCheck(rotina.done)}>{rotina.done ? <CheckCircle2 size={14} color="#fff" /> : null}</div><div><strong style={{ textDecoration: rotina.done ? 'line-through' : 'none' }}>{rotina.title}</strong><span>{rotina.desc}</span></div></div>)}</div></div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}><h3 style={styles.blockLabel}>Sistemas de Inteligencia</h3><div style={styles.shortcutGrid}><ShortcutCard title="HubOquei Radar" icon={Zap} color={colors.info} onClick={() => setActiveView('hub_oquei')} /><ShortcutCard title="Laboratorio Churn" icon={Activity} color={colors.purple} onClick={() => setActiveView('churn')} /><ShortcutCard title="Sala de Guerra" icon={Flame} color={colors.danger} onClick={() => setActiveView('war_room')} /><ShortcutCard title="Painel de Vendas" icon={TrendingUp} color={colors.success} onClick={() => setActiveView('vendas')} /></div></div>
      <div><h3 style={styles.blockLabel}>Administracao e Estrutura</h3><div style={styles.shortcutGrid}><ShortcutCard title="Gestao de Estrutura" icon={MapPin} color={colors.primary} onClick={() => setActiveView('estrutura')} /><ShortcutCard title="Gestao de Equipe" icon={UserPlus} color={colors.primary} onClick={() => setActiveView('admin_supervisores')} /><ShortcutCard title="Aprovacoes de RH" icon={FileCheck} color={colors.warning} onClick={() => setActiveView('rh_requests')} /><ShortcutCard title="Comunicados" icon={Megaphone} color={colors.primary} onClick={() => setActiveView('comunicados')} /></div></div>
      <style>{`@keyframes fadeInView{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}.animated-view{animation:fadeInView .4s ease forwards}.shortcut-card:hover{transform:translateY(-4px);box-shadow:0 12px 25px rgba(0,0,0,.06);border-color:var(--text-brand)!important}`}</style>
    </div>
  );
}

const styles = {
  hero: { background: `linear-gradient(135deg, ${colors.primary} 0%, #1e3a8a 50%, #0f172a 100%)`, borderRadius: 28, padding: '36px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: '#fff', marginBottom: 30, boxShadow: '0 18px 38px rgba(15,23,42,.22)' },
  heroDate: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 13, fontWeight: 700, textTransform: 'capitalize', opacity: .9 },
  heroTitle: { fontSize: 34, fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-.03em' },
  heroText: { fontSize: 15, margin: 0, opacity: .88, maxWidth: 760, lineHeight: 1.7 },
  refreshBtn: { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', padding: 12, borderRadius: 14, color: '#fff', cursor: 'pointer' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 30 },
  grid4Compact: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 },
  gaugeCard: { position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, rgba(15,23,42,.98), rgba(30,41,59,.95))', border: '1px solid rgba(148,163,184,.18)', borderRadius: 24, padding: 22, boxShadow: '0 24px 48px rgba(15,23,42,.18)', minHeight: 340, display: 'grid', gap: 18 },
  gaugeGlow: (accent) => ({ position: 'absolute', inset: 'auto -20% -28% auto', width: 180, height: 180, borderRadius: 999, background: `${accent}20`, filter: 'blur(40px)' }),
  gaugeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  gaugeEyebrow: { fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.64)' },
  gaugeSubtitle: { marginTop: 8, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.78)', maxWidth: 240 },
  gaugeIcon: (accent) => ({ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: `${accent}16`, border: `1px solid ${accent}35` }),
  gaugeSvgWrap: { position: 'relative', width: '100%', height: 160 },
  gaugeCenter: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingTop: 28, textAlign: 'center' },
  gaugeValue: { fontSize: 38, lineHeight: 1, fontWeight: 900, color: '#fff', letterSpacing: '-.05em' },
  gaugeStatus: { marginTop: 8, fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.68)', textTransform: 'uppercase', letterSpacing: '.08em' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 },
  metricBox: { padding: 14, borderRadius: 16, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' },
  metricLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 900, color: 'rgba(255,255,255,.56)' },
  metricValue: { marginTop: 8, fontSize: 24, lineHeight: 1, fontWeight: 900, color: '#fff' },
  gaugeHelper: { fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,.7)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  sectionTitle: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '.06em', textTransform: 'uppercase' },
  sectionSubtitle: { margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: 760 },
  actionBtn: (color) => ({ padding: '10px 14px', borderRadius: 12, border: `1px solid ${color}26`, background: `${color}10`, color, fontWeight: 900, fontSize: 12, cursor: 'pointer' }),
  panel: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: 22, boxShadow: 'var(--shadow-sm)' },
  goodState: { padding: 40, background: `${colors.success}08`, border: `1px dashed ${colors.success}40`, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', color: colors.success },
  faltasGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  faltaCard: (urgent, pending) => ({ background: 'var(--bg-card)', border: `1px solid ${urgent ? `${colors.danger}50` : 'var(--border)'}`, borderLeft: `4px solid ${urgent ? colors.danger : pending ? colors.warning : colors.success}`, borderRadius: 20, padding: 20, display: 'grid', gap: 14, boxShadow: urgent ? `0 0 0 2px ${colors.danger}18, var(--shadow-sm)` : 'var(--shadow-sm)', cursor: 'pointer' }),
  faltaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  faltaTitleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badgeDanger: { fontSize: 10, fontWeight: 900, color: colors.danger, background: `${colors.danger}15`, padding: '4px 10px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '.05em' },
  coverageBox: { background: 'var(--bg-app)', borderRadius: 12, padding: 12, display: 'grid', gap: 8, border: '1px solid var(--border)' },
  coverageRow: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 },
  coverageSelect: (assigned) => ({ flex: 1, padding: '7px 10px', borderRadius: 9, border: !assigned ? `1px solid ${colors.warning}` : `1px solid ${colors.success}40`, background: !assigned ? `${colors.warning}15` : `${colors.success}12`, color: !assigned ? '#b45309' : colors.success, fontWeight: 800, fontSize: 12, outline: 'none' }),
  feedHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  feedTitle: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '.06em' },
  feedSubtitle: { marginTop: 8, fontSize: 12, lineHeight: 1.7, color: 'var(--text-muted)' },
  evolutionLabels: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 8, fontSize: 11, color: 'var(--text-muted)' },
  summaryBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 18, background: 'var(--bg-app)', border: '1px solid var(--border)' },
  summaryLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 900, color: 'var(--text-muted)' },
  summaryValue: { display: 'block', marginTop: 8, fontSize: 28, lineHeight: 1, fontWeight: 900, color: 'var(--text-main)' },
  summaryBig: { display: 'block', marginTop: 8, fontSize: 30, lineHeight: 1, fontWeight: 900, color: 'var(--text-main)' },
  summaryHint: { display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 },
  kpiBox: { padding: 16, borderRadius: 18, background: 'var(--bg-app)', border: '1px solid var(--border)' },
  progressBg: { height: 12, width: '100%', background: 'rgba(148,163,184,.16)', borderRadius: 999, overflow: 'hidden' },
  progressFill: (width, color) => ({ height: '100%', width: `${width}%`, background: color, borderRadius: 999 }),
  progressLegend: { display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, fontSize: 12, fontWeight: 800, color: 'var(--text-muted)' },
  clusterWrap: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  clusterChip: { padding: '10px 12px', borderRadius: 14, background: 'rgba(15,23,42,.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 },
  rankSection: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 },
  rankTitle: (color) => ({ fontSize: 12, fontWeight: 900, color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }),
  rankItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: 'var(--bg-app)', border: '1px solid var(--border)', marginBottom: 10 },
  signalCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'flex-start', gap: 14 },
  signalTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 900, color: 'var(--text-muted)' },
  signalValue: { display: 'block', marginTop: 6, fontSize: 28, lineHeight: 1, fontWeight: 900 },
  signalSubtitle: { display: 'block', marginTop: 8, fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' },
  feedItem: { padding: '14px 16px', borderRadius: 16, background: 'var(--bg-app)', border: '1px solid var(--border)', display: 'grid', gap: 8 },
  feedItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' },
  feedMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' },
  statusBadge: (color) => ({ padding: '6px 8px', borderRadius: 999, fontSize: 10, fontWeight: 900, color, background: `${color}12`, border: `1px solid ${color}24` }),
  emptyBox: { minHeight: 150, borderRadius: 18, border: '1px dashed var(--border)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 15px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 12 },
  smallBtn: { background: '#fff', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },
  routineItem: (done) => ({ display: 'flex', alignItems: 'center', gap: 15, padding: 15, border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', background: done ? 'var(--bg-app)' : 'var(--bg-card)', opacity: done ? .6 : 1 }),
  routineCheck: (done) => ({ width: 20, height: 20, borderRadius: 6, border: `2px solid ${done ? colors.success : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? colors.success : 'transparent', flexShrink: 0 }),
  blockLabel: { fontSize: 14, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 10 },
  shortcutGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 },
  shortcutCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 15, display: 'flex', alignItems: 'center', gap: 15, cursor: 'pointer', transition: 'all .2s ease', boxShadow: 'var(--shadow-sm)' },
  shortcutIcon: (color) => ({ padding: 12, borderRadius: 12, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  alertBox: { position: 'fixed', bottom: 24, right: 24, zIndex: 9999, width: 360, background: 'var(--bg-card)', border: `1px solid ${colors.danger}50`, borderLeft: `4px solid ${colors.danger}`, borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,.35)', animation: 'slideInRight .35s cubic-bezier(.22,1,.36,1)' },
  alertHeader: { padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 },
  alertIcon: { width: 34, height: 34, borderRadius: 10, background: `${colors.danger}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconGhost: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 },
  alertItem: { padding: '10px 12px', borderRadius: 10, background: `${colors.danger}08`, border: `1px solid ${colors.danger}20` },
  alertCta: { width: '100%', padding: 10, borderRadius: 10, border: 'none', background: colors.danger, color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
};
