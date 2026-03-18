// ============================================================
//  VisaoGeralGrowth.jsx — Painel Growth Team
//  Tela inicial com saudação, KPIs, agenda e minhas tarefas.
// ============================================================

import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  Zap, TrendingUp, CheckSquare, Calendar, Megaphone,
  HeartHandshake, Router, Globe, FileSpreadsheet, Users,
  Trophy, ListChecks, Clock, ArrowRight, MapPin, Video,
  Briefcase, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Card, Badge, Btn, Empty, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

// ── Helpers ───────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const today = () =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const toDateStr = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD

// ── ShortcutCard ─────────────────────────────────────────────────────────────
function ShortcutCard({ icon: Icon, label, color, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '10px', padding: '24px 16px',
        background: hover ? `${color}14` : 'var(--bg-card)',
        border: `1px solid ${hover ? color : 'var(--border)'}`,
        borderRadius: '16px', cursor: 'pointer',
        transition: 'all 0.18s ease',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? `0 6px 20px ${color}22` : 'var(--shadow-sm)',
      }}
    >
      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
    </button>
  );
}

// ── KpiBox ────────────────────────────────────────────────────────────────────
function KpiBox({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid var(--border)`,
      borderLeft: `4px solid ${color}`, borderRadius: '14px',
      padding: '20px', display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.1 }}>{value ?? '—'}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── PlanRow ───────────────────────────────────────────────────────────────────
const STATUS_COR = {
  'Backlog': 'neutral', 'Planejamento': 'info',
  'Em Andamento': 'primary', 'Finalizada': 'success', 'Cancelada': 'danger',
};

function PlanRow({ plan }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderRadius: '10px',
      background: 'var(--bg-app)', border: '1px solid var(--border)', gap: '12px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {plan.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {plan.cityId || '—'}{plan.category ? ` · ${plan.category}` : ''}
        </div>
      </div>
      <Badge cor={STATUS_COR[plan.status] || 'neutral'}>{plan.status}</Badge>
    </div>
  );
}

// ── AgendaPanel ───────────────────────────────────────────────────────────────
function AgendaPanel({ events, loading, onNavigate }) {
  if (loading) return <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>Carregando...</div>;
  if (events.length === 0) return (
    <Empty icon="📅" title="Nenhum evento próximo" description="Sua agenda está livre nos próximos dias." />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {events.map(evt => {
        const color = evt.type === 'reuniao' ? colors.purple : colors.success;
        const [y, m, d] = (evt.date || '').split('-').map(Number);
        const dateLabel = evt.date
          ? new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
          : '—';
        return (
          <div key={evt.id} style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            padding: '10px 12px', borderRadius: '10px',
            background: 'var(--bg-app)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '42px' }}>
              <div style={{ fontSize: '10px', fontWeight: '900', color, textTransform: 'uppercase' }}>
                {dateLabel.split(',')[0]}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>
                {d}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {evt.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Clock size={10} /> {evt.time}
                {evt.location && (
                  <>{' · '}{evt.location.includes('http') ? <Video size={10} /> : <MapPin size={10} />}</>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <Btn variant="secondary" size="sm" onClick={() => onNavigate?.('agenda')} style={{ marginTop: '4px' }}>
        Ver agenda completa <ArrowRight size={12} />
      </Btn>
    </div>
  );
}

// ── TaskPanel ─────────────────────────────────────────────────────────────────
function TaskPanel({ tasks, loading, onNavigate }) {
  if (loading) return <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>Carregando...</div>;
  if (tasks.length === 0) return (
    <Empty icon="✅" title="Nenhuma tarefa pendente" description="Você está em dia com todas as suas tarefas." />
  );

  const today = toDateStr(new Date());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {tasks.map(t => {
        const isOverdue = t.deadline && t.deadline < today;
        const isToday   = t.deadline === today;
        const accentColor = isOverdue ? colors.danger : isToday ? colors.warning : colors.primary;
        return (
          <div key={t.id} style={{
            padding: '10px 12px', borderRadius: '10px',
            background: 'var(--bg-app)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${accentColor}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {isOverdue
                ? <AlertCircle size={14} color={colors.danger} style={{ flexShrink: 0, marginTop: '1px' }} />
                : <CheckCircle2 size={14} color={accentColor} style={{ flexShrink: 0, marginTop: '1px' }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {t.actionName && <span>{t.actionName}</span>}
                  {t.deadline && (
                    <span style={{ color: accentColor, fontWeight: '700' }}>
                      {isOverdue ? '⚠ Atrasada · ' : isToday ? '🔔 Hoje · ' : ''}{t.deadline}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <Btn variant="secondary" size="sm" onClick={() => onNavigate?.('hub')} style={{ marginTop: '4px' }}>
        Ver todas no Hub <ArrowRight size={12} />
      </Btn>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function VisaoGeralGrowth({ userData, onNavigate }) {
  const [kpis,        setKpis]        = useState({ ativos: 0, emAndamento: 0, minhasTarefas: 0, finalizados: 0 });
  const [recentPlans, setRecentPlans] = useState([]);
  const [agenda,      setAgenda]      = useState([]);
  const [myTasks,     setMyTasks]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingExtra,setLoadingExtra]= useState(true);

  const uid      = userData?.uid || auth?.currentUser?.uid;
  const nome     = userData?.name || userData?.nome || 'Equipe';
  const mesAtual = new Date().toISOString().slice(0, 7);

  // ── Planos e KPIs ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Filtra deleted tanto na query quanto no cliente (dupla garantia)
        const snap  = await getDocs(query(
          collection(db, 'action_plans'),
          where('month', '==', mesAtual),
          where('deleted', '!=', true)
        ));
        const plans = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted);

        const ativos      = plans.filter(p => p.status !== 'Cancelada' && p.status !== 'Finalizada').length;
        const emAndamento = plans.filter(p => p.status === 'Em Andamento').length;
        const finalizados = plans.filter(p => p.status === 'Finalizada').length;

        let minhasTarefas = 0;
        if (uid) {
          const snapT = await getDocs(query(
            collection(db, 'action_tasks'),
            where('responsibleUid', '==', uid),
            where('status', '==', 'pending')
          ));
          minhasTarefas = snapT.size;
        }

        const sorted = [...plans]
          .sort((a, b) => {
            if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
            if (b.status === 'Em Andamento' && a.status !== 'Em Andamento') return 1;
            return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
          })
          .slice(0, 5);

        setKpis({ ativos, emAndamento, minhasTarefas, finalizados });
        setRecentPlans(sorted);
      } catch (err) { console.error('VisaoGeral load error:', err); }
      setLoading(false);
    };
    load();
  }, [uid, mesAtual]);

  // ── Agenda + Minhas Tarefas ─────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const loadExtra = async () => {
      setLoadingExtra(true);
      try {
        const todayStr    = toDateStr(new Date());
        const in14days    = toDateStr(new Date(Date.now() + 14 * 86400000));

        // Próximos eventos (próximos 14 dias)
        const snapEvt = await getDocs(query(
          collection(db, 'events'),
          where('userId', '==', uid),
        ));
        const evts = snapEvt.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(e => e.date >= todayStr && e.date <= in14days)
          .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.time || '').localeCompare(b.time || '');
          })
          .slice(0, 5);
        setAgenda(evts);

        // Minhas tarefas pendentes com detalhes
        const snapTasks = await getDocs(query(
          collection(db, 'action_tasks'),
          where('responsibleUid', '==', uid),
          where('status', '==', 'pending'),
        ));
        const tasks = snapTasks.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            // Atrasadas primeiro, depois por prazo
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
          })
          .slice(0, 6);
        setMyTasks(tasks);
      } catch (err) { console.error('VisaoGeral extra load error:', err); }
      setLoadingExtra(false);
    };
    loadExtra();
  }, [uid]);

  const SHORTCUTS = [
    { id: 'hub',        label: 'Hub de Crescimento',  icon: Zap,             color: colors.primary  },
    { id: 'agenda',     label: 'Minha Agenda',         icon: Calendar,        color: colors.info     },
    { id: 'comunicados',label: 'Comunicados',          icon: Megaphone,       color: colors.warning  },
    { id: 'patrocinio', label: 'Solicitar Patrocínio', icon: HeartHandshake,  color: colors.purple   },
    { id: 'eventos',    label: 'Eventos',              icon: Trophy,          color: colors.amber    },
    { id: 'roteadores', label: 'Roteadores',           icon: Router,          color: colors.success  },
    { id: 'links',      label: 'Links Úteis',          icon: Globe,           color: colors.sky      },
    { id: 'planilhas',  label: 'Planilhas',            icon: FileSpreadsheet, color: colors.emerald  },
  ];

  return (
    <div style={{ ...global.container }}>

      {/* ── Cabeçalho de saudação ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '28px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 18px ${colors.primary}44`,
          }}>
            <Zap size={26} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {greeting()}, {nome.split(' ')[0]}! 👋
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              {today()}
            </div>
          </div>
        </div>
        <div style={{
          background: 'var(--bg-app)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '10px 18px',
          fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <Users size={14} color={colors.primary} />
          Growth Team · {mesAtual}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={global.grid4}>
        <KpiBox label="Ações Ativas"   value={loading ? '...' : kpis.ativos}        icon={ListChecks}  color={colors.primary} sub="no mês atual" />
        <KpiBox label="Em Andamento"   value={loading ? '...' : kpis.emAndamento}   icon={TrendingUp}  color={colors.info}    sub="em execução" />
        <KpiBox label="Minhas Tarefas" value={loading ? '...' : kpis.minhasTarefas} icon={CheckSquare} color={colors.warning} sub="pendentes" />
        <KpiBox label="Finalizadas"    value={loading ? '...' : kpis.finalizados}   icon={Trophy}      color={colors.success} sub="este mês" />
      </div>

      {/* ── Acesso Rápido — largura total ── */}
      <Card title="Acesso Rápido" subtitle="Navegue diretamente para qualquer módulo">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginTop: '4px' }}>
          {SHORTCUTS.map(s => (
            <ShortcutCard key={s.id} icon={s.icon} label={s.label} color={s.color} onClick={() => onNavigate?.(s.id)} />
          ))}
        </div>
      </Card>

      {/* ── Agenda + Tarefas + Planos Recentes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>

        <Card
          title="Próximos Eventos"
          subtitle="Sua agenda dos próximos 14 dias"
          actions={
            <Btn size="sm" variant="secondary" onClick={() => onNavigate?.('agenda')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Agenda <ArrowRight size={13} />
            </Btn>
          }
        >
          <AgendaPanel events={agenda} loading={loadingExtra} onNavigate={onNavigate} />
        </Card>

        {/* Planos Recentes — agora na linha de baixo, 3ª coluna */}
        <Card
          title="Planos Recentes"
          subtitle="Ações deste mês"
          actions={
            <Btn size="sm" variant="secondary" onClick={() => onNavigate?.('hub')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Ver todos <ArrowRight size={13} />
            </Btn>
          }
        >
          {loading
            ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>Carregando...</div>
            : recentPlans.length === 0
              ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum plano criado este mês.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {recentPlans.map(p => <PlanRow key={p.id} plan={p} />)}
                </div>
          }
          {kpis.minhasTarefas > 0 && (
            <div style={{
              marginTop: '16px', padding: '12px 14px', borderRadius: '12px',
              background: `${colors.warning}12`, border: `1px solid ${colors.warning}30`,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <Clock size={15} color={colors.warning} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '700' }}>
                Você tem <strong style={{ color: colors.warning }}>{kpis.minhasTarefas}</strong> tarefa{kpis.minhasTarefas > 1 ? 's' : ''} pendente{kpis.minhasTarefas > 1 ? 's' : ''}.
              </div>
              <Btn size="sm" onClick={() => onNavigate?.('hub')} style={{ marginLeft: 'auto', flexShrink: 0 }}>Ver</Btn>
            </div>
          )}
        </Card>

        <Card
          title="Minhas Tarefas"
          subtitle="Tarefas pendentes atribuídas a você"
          actions={
            <Btn size="sm" variant="secondary" onClick={() => onNavigate?.('hub')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Hub <ArrowRight size={13} />
            </Btn>
          }
        >
          <TaskPanel tasks={myTasks} loading={loadingExtra} onNavigate={onNavigate} />
        </Card>

      </div>
    </div>
  );
}