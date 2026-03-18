// ============================================================
//  VisaoGeralGrowth.jsx — Painel Growth Team
//  Tela inicial com saudação, KPIs rápidos e menu de atalhos
// ============================================================

import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
  Zap, TrendingUp, CheckSquare, Calendar, Megaphone,
  HeartHandshake, Router, Globe, FileSpreadsheet, Users,
  Trophy, ListChecks, Clock, ArrowRight
} from 'lucide-react';
import { Card, Badge, Btn, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

// ── Helpers ──────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const today = () =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ── Cartão de atalho ─────────────────────────────────────────
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
      <div style={{
        width: '46px', height: '46px', borderRadius: '12px',
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
    </button>
  );
}

// ── Cartão de KPI ─────────────────────────────────────────────
function KpiBox({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid var(--border)`,
      borderLeft: `4px solid ${color}`, borderRadius: '14px',
      padding: '20px', display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.1 }}>
          {value ?? '—'}
        </div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Linha de plano ────────────────────────────────────────────
const STATUS_COR = {
  'Backlog': 'neutral', 'Planejamento': 'info',
  'Em Andamento': 'primary', 'Finalizada': 'success', 'Cancelada': 'danger',
};

function PlanRow({ plan }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderRadius: '10px',
      background: 'var(--bg-app)', border: '1px solid var(--border)',
      gap: '12px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {plan.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {plan.cityId || '—'} {plan.category ? `· ${plan.category}` : ''}
        </div>
      </div>
      <Badge cor={STATUS_COR[plan.status] || 'neutral'}>{plan.status}</Badge>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function VisaoGeralGrowth({ userData, onNavigate }) {
  const [kpis, setKpis] = useState({ ativos: 0, emAndamento: 0, minhasTarefas: 0, finalizados: 0 });
  const [recentPlans, setRecentPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const uid = userData?.uid || auth?.currentUser?.uid;
  const nome = userData?.name || userData?.nome || 'Equipe';
  const mesAtual = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Planos do mês atual
        const qPlans = query(
          collection(db, 'action_plans'),
          where('month', '==', mesAtual)
        );
        const snapPlans = await getDocs(qPlans);
        const plans = snapPlans.docs.map(d => ({ id: d.id, ...d.data() }));

        const ativos = plans.filter(p => p.status !== 'Cancelada' && p.status !== 'Finalizada').length;
        const emAndamento = plans.filter(p => p.status === 'Em Andamento').length;
        const finalizados = plans.filter(p => p.status === 'Finalizada').length;

        // Minhas tarefas pendentes
        let minhasTarefas = 0;
        if (uid) {
          const qTasks = query(
            collection(db, 'action_tasks'),
            where('responsibleUid', '==', uid),
            where('status', '==', 'pending')
          );
          const snapTasks = await getDocs(qTasks);
          minhasTarefas = snapTasks.size;
        }

        // Planos recentes (Em Andamento primeiro)
        const sorted = [...plans]
          .sort((a, b) => {
            if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
            if (b.status === 'Em Andamento' && a.status !== 'Em Andamento') return 1;
            return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
          })
          .slice(0, 5);

        setKpis({ ativos, emAndamento, minhasTarefas, finalizados });
        setRecentPlans(sorted);
      } catch (err) {
        console.error('VisaoGeral load error:', err);
      }
      setLoading(false);
    };
    load();
  }, [uid, mesAtual]);

  const SHORTCUTS = [
    { id: 'hub',       label: 'Hub de Crescimento', icon: Zap,             color: colors.primary   },
    { id: 'agenda',    label: 'Minha Agenda',        icon: Calendar,        color: colors.info      },
    { id: 'comunicados',label: 'Comunicados',        icon: Megaphone,       color: colors.warning   },
    { id: 'patrocinio',label: 'Solicitar Patrocínio', icon: HeartHandshake, color: colors.purple    },
    { id: 'eventos',   label: 'Eventos',             icon: Trophy,          color: colors.amber     },
    { id: 'roteadores',label: 'Roteadores',          icon: Router,          color: colors.success   },
    { id: 'links',     label: 'Links Úteis',         icon: Globe,           color: colors.sky       },
    { id: 'planilhas', label: 'Planilhas',           icon: FileSpreadsheet, color: colors.emerald   },
  ];

  return (
    <div style={{ ...global.container }}>

      {/* ── Cabeçalho de saudação ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '28px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px',
        boxShadow: 'var(--shadow-sm)',
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

      {/* ── KPIs rápidos ── */}
      <div style={global.grid4}>
        <KpiBox label="Ações Ativas" value={loading ? '...' : kpis.ativos} icon={ListChecks} color={colors.primary} sub="no mês atual" />
        <KpiBox label="Em Andamento" value={loading ? '...' : kpis.emAndamento} icon={TrendingUp} color={colors.info} sub="em execução" />
        <KpiBox label="Minhas Tarefas" value={loading ? '...' : kpis.minhasTarefas} icon={CheckSquare} color={colors.warning} sub="pendentes" />
        <KpiBox label="Finalizadas" value={loading ? '...' : kpis.finalizados} icon={Trophy} color={colors.success} sub="este mês" />
      </div>

      {/* ── Atalhos rápidos + planos recentes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

        {/* Atalhos */}
        <Card title="Acesso Rápido" subtitle="Navegue diretamente para qualquer módulo">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '12px', marginTop: '4px',
          }}>
            {SHORTCUTS.map(s => (
              <ShortcutCard
                key={s.id}
                icon={s.icon}
                label={s.label}
                color={s.color}
                onClick={() => onNavigate?.(s.id)}
              />
            ))}
          </div>
        </Card>

        {/* Planos recentes */}
        <Card
          title="Planos Recentes"
          subtitle="Ações deste mês"
          actions={
            <Btn size="sm" variant="secondary" onClick={() => onNavigate?.('hub')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Ver todos <ArrowRight size={13} />
            </Btn>
          }
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Carregando...
            </div>
          )}
          {!loading && recentPlans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhum plano criado este mês.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: recentPlans.length ? '4px' : 0 }}>
            {recentPlans.map(p => <PlanRow key={p.id} plan={p} />)}
          </div>

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
              <Btn size="sm" onClick={() => onNavigate?.('hub')} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                Ver
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
