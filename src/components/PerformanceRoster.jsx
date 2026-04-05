import React, { useMemo, useState } from 'react';
import { Search, Target, UserRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge, Btn, Card, Empty, Input, ProgressBar, Select, colors, numero } from './ui';

function statusBadge(status) {
  if (status === 'green') return <Badge cor="success">Verde</Badge>;
  if (status === 'yellow') return <Badge cor="warning">Atencao</Badge>;
  return <Badge cor="danger">Risco</Badge>;
}

export default function PerformanceRoster({ rows = [], period, onPeriodChange, onSelectEmployee }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [employmentStatus, setEmploymentStatus] = useState('all');

  const teamOptions = useMemo(() => {
    const values = [...new Set(rows.map((row) => row.employee.teamName).filter(Boolean))];
    return [{ value: 'all', label: 'Todas as equipes' }, ...values.map((value) => ({ value, label: value }))];
  }, [rows]);

  const statusOptions = useMemo(() => {
    const values = [...new Set(rows.map((row) => row.employee.employmentStatus).filter(Boolean))];
    return [{ value: 'all', label: 'Todos os status' }, ...values.map((value) => ({ value, label: value }))];
  }, [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !search
      || String(row.employee.name || '').toLowerCase().includes(search)
      || String(row.employee.jobTitle || '').toLowerCase().includes(search)
      || String(row.employee.teamName || '').toLowerCase().includes(search);
    const matchesTeam = teamFilter === 'all' || row.employee.teamName === teamFilter;
    const matchesStatus = employmentStatus === 'all' || row.employee.employmentStatus === employmentStatus;
    return matchesSearch && matchesTeam && matchesStatus;
  }), [rows, searchTerm, teamFilter, employmentStatus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card
        title="Lista de colaboradores"
        subtitle="Use os filtros para navegar pelo desempenho individual do time de vendas."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 180px', gap: '16px' }}>
          <Input
            label="Buscar"
            placeholder="Nome, cargo ou equipe"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select
            label="Equipe"
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            options={teamOptions}
          />
          <Select
            label="Status"
            value={employmentStatus}
            onChange={(event) => setEmploymentStatus(event.target.value)}
            options={statusOptions}
          />
          <Input
            label="Mes"
            type="month"
            value={period}
            onChange={(event) => onPeriodChange(event.target.value)}
          />
        </div>
      </Card>

      {filteredRows.length === 0 ? (
        <Empty
          icon="📉"
          title="Nenhum colaborador encontrado"
          description="Ajuste os filtros ou complete o cadastro funcional dos atendentes."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredRows.map((row) => (
            <Card
              key={row.id}
              accent={row.status === 'green' ? colors.success : row.status === 'yellow' ? colors.warning : colors.danger}
              title={row.employee.name || 'Colaborador'}
              subtitle={`${row.employee.jobTitle || 'Cargo nao informado'} | ${row.employee.teamName || 'Equipe nao informada'}`}
              actions={[<React.Fragment key={`status-${row.id}`}>{statusBadge(row.status)}</React.Fragment>]}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '18px' }}>
                <Metric icon={Target} label="Score geral" value={numero(row.score)} />
                <Metric icon={CheckCircle2} label="Meta do mes" value={`${row.targetPercent?.toFixed?.(1) || row.targetPercent || 0}%`} />
                <Metric icon={UserRound} label="Presenca" value={`${row.presencePercent?.toFixed?.(1) || row.presencePercent || 0}%`} />
                <Metric icon={AlertTriangle} label="Pendencias" value={numero(row.pendingActions)} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
                  <span>Meta x realizado</span>
                  <span>{row.targetPercent?.toFixed?.(1) || row.targetPercent || 0}%</span>
                </div>
                <ProgressBar pct={row.targetPercent || 0} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>
                  <Search size={14} />
                  Ultimo feedback: {row.latestFeedbackLabel}
                </div>
                <Btn onClick={() => onSelectEmployee(row.id)}>Abrir perfil</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div style={{ background: 'var(--bg-app)', borderRadius: '14px', border: '1px solid var(--border)', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
        <Icon size={14} />
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>
        {value}
      </div>
    </div>
  );
}
