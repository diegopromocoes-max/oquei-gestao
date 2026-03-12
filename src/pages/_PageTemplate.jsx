// ============================================================
//  _PageTemplate.jsx — Oquei Gestão
//
//  ESTE ARQUIVO É O MODELO OFICIAL DE PÁGINA.
//  Copie, renomeie e adapte para criar novas páginas.
//
//  REGRAS OBRIGATÓRIAS:
//  ✅ Importe componentes de '../components/ui'
//  ✅ Importe estilos de '../styles/globalStyles'
//  ✅ NUNCA defina `const styles = {}` dentro de uma página
//  ✅ NUNCA use cores hardcoded (#fff, #2563eb) — use colors.*
//  ✅ NUNCA copie styles de outra página — extraia para ui.jsx
// ============================================================

import { useState, useEffect } from 'react';

// ── 1. COMPONENTES VISUAIS — sempre daqui ──────────────────
import {
  Page, Card, KpiCard, DataTable, Badge, Btn,
  Modal, Empty, Spinner, InfoBox, Tabs, SectionHeader,
  StatRow, ProgressBar, Divider, Input, Select, Field,
} from '../components/ui';

// ── 2. ESTILOS ESTRUTURAIS — apenas para layouts específicos
import { styles, colors, moeda, numero, data } from '../styles/globalStyles';

// ── 3. SERVIÇOS — nunca chame Firebase diretamente na página
// import { useVendasDoMes } from '../services/vendas';
// import { useMetasDoMes  } from '../services/metas';

// ─────────────────────────────────────────────────────────────
export default function NomeDaPagina() {

  // ── Estado ─────────────────────────────────────────────────
  const [tabAtiva,   setTabAtiva]   = useState('Resumo');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [dados,      setDados]      = useState([]);

  // ── Dados (exemplo com hook de serviço) ────────────────────
  // const { vendas, loading, erro } = useVendasDoMes(mes, ano);

  // ── Colunas da tabela ──────────────────────────────────────
  const colunas = [
    { key: 'nome',    label: 'Nome' },
    { key: 'canal',   label: 'Canal' },
    { key: 'valor',   label: 'Valor',  render: (v) => moeda(v) },
    { key: 'data',    label: 'Data',   render: (v) => data(v) },
    { key: 'status',  label: 'Status', render: (v) => <Badge status={v} /> },
    {
      key: 'acoes', label: '', width: '80px',
      render: (_, row) => (
        <Btn variant="secondary" size="sm" onClick={() => console.log(row)}>
          Ver
        </Btn>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────
  return (
    <Page
      title="Título da Página"
      subtitle="Descrição curta do que esta página faz"
      actions={
        <>
          <Btn variant="secondary" size="sm">Exportar</Btn>
          <Btn onClick={() => setModalOpen(true)}>+ Novo Item</Btn>
        </>
      }
    >

      {/* ── Alerta / aviso (se necessário) ─────────────────── */}
      <InfoBox type="info">
        Período de apuração ativo: <strong>Março / 2026</strong>. Todos os dados refletem este período.
      </InfoBox>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div style={styles.grid4}>
        <KpiCard
          label="Vendas do mês"
          valor={moeda(128450)}
          delta="+12%"
          accent={colors.primary}
        />
        <KpiCard
          label="Meta atingida"
          valor="84%"
          delta="+5%"
          accent={colors.success}
        />
        <KpiCard
          label="Cancelamentos"
          valor={numero(23)}
          delta="-8%"
          accent={colors.warning}
        />
        <KpiCard
          label="Atendentes ativos"
          valor={numero(14)}
          accent={colors.purple}
        />
      </div>

      {/* ── Conteúdo principal com abas ────────────────────── */}
      <Card title="Detalhes" subtitle="Visão completa dos registros">

        <Tabs
          tabs={['Resumo', 'Por Canal', 'Por Atendente']}
          active={tabAtiva}
          onChange={setTabAtiva}
        />

        <div style={{ marginTop: '20px' }}>
          {tabAtiva === 'Resumo' && (
            <DataTable
              columns={colunas}
              data={dados}
              loading={loading}
              emptyMsg="Nenhum registro neste período"
              onRowClick={(row) => console.log('clicou', row)}
            />
          )}

          {tabAtiva === 'Por Canal' && (
            <Empty
              icon="📡"
              title="Sem dados por canal"
              description="Registros serão exibidos aqui quando disponíveis."
            />
          )}

          {tabAtiva === 'Por Atendente' && (
            <Spinner centered />
          )}
        </div>
      </Card>

      {/* ── Dois cards lado a lado ─────────────────────────── */}
      <div style={styles.grid2}>

        <Card title="Progresso das Metas" accent={colors.primary}>
          {[
            { label: 'Vendas Totais',    pct: 84 },
            { label: 'Retenção (Churn)', pct: 72 },
            { label: 'NPS',              pct: 91 },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: '16px' }}>
              <div style={{ ...styles.rowBetween, marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>
                  {item.pct}%
                </span>
              </div>
              <ProgressBar pct={item.pct} showLabel={false} />
            </div>
          ))}
        </Card>

        <Card title="Resumo do Período" accent={colors.success}>
          <StatRow label="Total de vendas"       value={moeda(128450)} />
          <StatRow label="Ticket médio"           value={moeda(342)}    />
          <StatRow label="Cancelamentos"          value={numero(23)}    accent={colors.danger} />
          <StatRow label="Taxa de conversão"      value="38%"           />
          <StatRow label="Leads gerados"          value={numero(847)}   />
        </Card>

      </div>

      {/* ── Modal ──────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Item"
        footer={
          <>
            <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn loading={loading} onClick={() => console.log('salvar')}>Salvar</Btn>
          </>
        }
      >
        <div style={styles.form}>
          <div style={styles.formRow}>
            <Input  label="Nome"   placeholder="Digite o nome"   required />
            <Select label="Canal"  placeholder="Selecione"       required
              options={['Televendas', 'Loja Física', 'WhatsApp', 'Portal Web']} />
          </div>
          <Input label="Observação" placeholder="Opcional" />
        </div>
      </Modal>

    </Page>
  );
}