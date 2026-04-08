import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  Layers,
  RefreshCw,
  Save,
  Store,
  Target,
  UserRound,
} from 'lucide-react';

import { Badge, Btn, Card, colors } from '../../components/ui';
import {
  canEditIndividualGoals,
  loadMetasIndividuais,
  recalcularDistribuicaoCidade,
  salvarMetaIndividualAtendente,
} from '../../services/metas';

function statusColor(status) {
  return status === 'stale' ? 'warning' : 'success';
}

function statusLabel(status) {
  return status === 'stale' ? 'Pendente de redistribuicao' : 'Atualizada';
}

function sourceLabel(sourceType) {
  return sourceType === 'manual' ? 'Manual' : 'Automatica';
}

export default function TabMetasIndividuais({ selectedMonth, userData }) {
  const [payload, setPayload] = useState({ clusters: [], staleCities: 0, totalAttendants: 0 });
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState({});
  const [recalculatingCity, setRecalculatingCity] = useState({});
  const [draftValues, setDraftValues] = useState({});

  const canEdit = useMemo(() => canEditIndividualGoals(userData), [userData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await loadMetasIndividuais(selectedMonth, userData);
      setPayload(response);
    } catch (error) {
      console.error('Erro ao carregar metas individuais:', error);
      if (window.showToast) window.showToast('Nao foi possivel carregar as metas individuais.', 'error');
      setPayload({ clusters: [], staleCities: 0, totalAttendants: 0 });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, userData?.clusterId, userData?.cluster, userData?.role]);

  const handleDraftChange = (row, value) => {
    setDraftValues((current) => ({
      ...current,
      [row.id]: value,
    }));
  };

  const getDraftValue = (row) => {
    if (draftValues[row.id] !== undefined) return draftValues[row.id];
    return row.plansTarget ? String(row.plansTarget) : '';
  };

  const handleSaveRow = async (row) => {
    const nextPlansTarget = Number(getDraftValue(row));
    setSavingRow((current) => ({ ...current, [row.id]: true }));

    try {
      await salvarMetaIndividualAtendente(selectedMonth, {
        ...row,
        plansTarget: Number.isFinite(nextPlansTarget) ? nextPlansTarget : 0,
      }, userData);
      if (window.showToast) window.showToast(`Meta individual de ${row.attendantName} atualizada.`, 'success');
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar meta individual:', error);
      if (window.showToast) window.showToast('Nao foi possivel salvar a meta individual.', 'error');
    }

    setSavingRow((current) => ({ ...current, [row.id]: false }));
  };

  const handleRecalculateCity = async (city) => {
    if (!city.attendants.length) {
      if (window.showToast) window.showToast('Esta loja ainda nao possui atendentes ativos para redistribuir a meta.', 'warning');
      return;
    }

    const confirmed = window.confirm(`Recalcular a distribuicao da meta para ${city.cityName}? Isso vai sobrescrever os ajustes individuais atuais desta loja.`);
    if (!confirmed) return;

    setRecalculatingCity((current) => ({ ...current, [city.cityId]: true }));
    try {
      await recalcularDistribuicaoCidade(selectedMonth, city.cityId, userData);
      if (window.showToast) window.showToast(`Distribuicao da loja ${city.cityName} recalculada com sucesso.`, 'success');
      await loadData();
    } catch (error) {
      console.error('Erro ao recalcular distribuicao:', error);
      if (window.showToast) window.showToast(error?.message || 'Nao foi possivel recalcular a distribuicao.', 'error');
    }
    setRecalculatingCity((current) => ({ ...current, [city.cityId]: false }));
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Calculando metas individuais...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Card style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(15,23,42,0.02))' }}>
          <div style={local.kpiLabel}>Atendentes com meta</div>
          <div style={local.kpiValue}>{payload.totalAttendants}</div>
          <div style={local.kpiHelper}>Base individual carregada para {selectedMonth}</div>
        </Card>
        <Card style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(15,23,42,0.02))' }}>
          <div style={local.kpiLabel}>Lojas pendentes</div>
          <div style={local.kpiValue}>{payload.staleCities}</div>
          <div style={local.kpiHelper}>Aguardando redistribuicao apos mudanca de meta ou equipe</div>
        </Card>
        <Card style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(15,23,42,0.02))' }}>
          <div style={local.kpiLabel}>Regra automatica</div>
          <div style={local.kpiValue}>40%</div>
          <div style={local.kpiHelper}>SVA individual sempre acompanha 40% da meta de planos</div>
        </Card>
      </div>

      <Card
        title="Metas individuais por loja"
        subtitle="A meta individual nasce apenas do canal Lojas Fisicas e pode ser ajustada por atendente quando a operacao exigir."
        actions={(
          <Btn variant="secondary" onClick={loadData}>
            <RefreshCw size={16} /> Atualizar
          </Btn>
        )}
      >
        <div style={local.infoStrip}>
          <div style={local.infoItem}>
            <Target size={16} color={colors.primary} />
            <span>A distribuicao individual considera somente a meta do canal Lojas Fisicas.</span>
          </div>
          <div style={local.infoItem}>
            <Calculator size={16} color={colors.warning} />
            <span>Use “Recalcular distribuicao” para aplicar a nova divisao da loja de forma confirmada.</span>
          </div>
        </div>

        {payload.clusters.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma meta individual encontrada para este mes.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '18px' }}>
            {payload.clusters.map((cluster) => (
              <Card key={cluster.id} style={{ padding: '18px', background: 'var(--bg-app)' }}>
                <div style={local.clusterHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={local.clusterIcon}>
                      <Layers size={18} color={colors.primary} />
                    </div>
                    <div>
                      <div style={local.clusterTitle}>{cluster.name}</div>
                      <div style={local.clusterSubtitle}>{cluster.cities.length} loja(s) com meta no periodo</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '14px', marginTop: '14px' }}>
                  {cluster.cities.map((city) => (
                    <div key={city.cityId} style={local.cityCard}>
                      <div style={local.cityHeader}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={local.cityTitle}><Store size={15} /> {city.cityName}</span>
                            <Badge cor={statusColor(city.distributionStatus)}>{statusLabel(city.distributionStatus)}</Badge>
                          </div>
                          <div style={local.cityMeta}>
                            Base Lojas Fisicas: <strong>{city.plansTarget}</strong> planos · <strong>{city.svaTarget}</strong> SVA
                          </div>
                          {city.distributionReason && (
                            <div style={local.cityReason}>
                              <AlertTriangle size={13} />
                              {city.distributionReason}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={local.cityCounter}>
                            <UserRound size={14} />
                            {city.attendants.length} atendente(s)
                          </div>
                          {canEdit && (
                            <Btn
                              variant={city.distributionStatus === 'stale' ? 'primary' : 'secondary'}
                              onClick={() => handleRecalculateCity(city)}
                              loading={Boolean(recalculatingCity[city.cityId])}
                              disabled={!city.attendants.length}
                            >
                              <Calculator size={16} /> Recalcular distribuicao
                            </Btn>
                          )}
                        </div>
                      </div>

                      {city.rows.length === 0 ? (
                        <div style={local.emptyCity}>
                          Esta loja ainda nao possui atendentes ativos vinculados.
                        </div>
                      ) : (
                        <div style={local.tableWrapper}>
                          <table style={local.table}>
                            <thead>
                              <tr>
                                <th style={local.th}>Atendente</th>
                                <th style={local.thCenter}>Meta planos</th>
                                <th style={local.thCenter}>Meta SVA</th>
                                <th style={local.thCenter}>Origem</th>
                                <th style={local.thCenter}>Status</th>
                                {canEdit && <th style={local.thCenter}>Acoes</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {city.rows.map((row) => (
                                <tr key={row.id}>
                                  <td style={local.tdMain}>
                                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{row.attendantName}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.exists ? 'Meta registrada' : 'Sem meta registrada ainda'}</div>
                                  </td>
                                  <td style={local.tdCenter}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={getDraftValue(row)}
                                      disabled={!canEdit}
                                      onChange={(event) => handleDraftChange(row, event.target.value)}
                                      style={local.numberInput}
                                    />
                                  </td>
                                  <td style={local.tdCenter}>
                                    <span style={local.svaPill}>
                                      {ceilNumber(Number(getDraftValue(row)) * 0.4)}
                                    </span>
                                  </td>
                                  <td style={local.tdCenter}>
                                    <Badge cor={row.sourceType === 'manual' ? 'purple' : 'neutral'}>
                                      {sourceLabel(row.sourceType)}
                                    </Badge>
                                  </td>
                                  <td style={local.tdCenter}>
                                    <Badge cor={statusColor(row.distributionStatus)}>
                                      {statusLabel(row.distributionStatus)}
                                    </Badge>
                                  </td>
                                  {canEdit && (
                                    <td style={local.tdCenter}>
                                      <Btn
                                        size="sm"
                                        onClick={() => handleSaveRow(row)}
                                        loading={Boolean(savingRow[row.id])}
                                      >
                                        <Save size={14} /> Salvar
                                      </Btn>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ceilNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.ceil(parsed) : 0;
}

const local = {
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 900,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  kpiValue: {
    marginTop: '8px',
    fontSize: '32px',
    fontWeight: 900,
    color: 'var(--text-main)',
    letterSpacing: '-0.04em',
  },
  kpiHelper: {
    marginTop: '8px',
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  infoStrip: {
    display: 'grid',
    gap: '10px',
    marginBottom: '18px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  clusterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },
  clusterIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'rgba(37,99,235,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterTitle: {
    fontSize: '16px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  clusterSubtitle: {
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  cityCard: {
    borderRadius: '18px',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    padding: '16px',
    display: 'grid',
    gap: '14px',
  },
  cityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    flexWrap: 'wrap',
  },
  cityTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  cityMeta: {
    marginTop: '8px',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  cityReason: {
    marginTop: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: colors.warning,
    fontWeight: 700,
  },
  cityCounter: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '12px',
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    fontSize: '12px',
    fontWeight: 800,
    color: 'var(--text-muted)',
  },
  emptyCity: {
    padding: '20px',
    borderRadius: '14px',
    border: '1px dashed var(--border)',
    textAlign: 'center',
    color: 'var(--text-muted)',
    background: 'var(--bg-app)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 10px',
    borderBottom: '1px solid var(--border)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  thCenter: {
    textAlign: 'center',
    padding: '12px 10px',
    borderBottom: '1px solid var(--border)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  tdMain: {
    padding: '14px 10px',
    borderBottom: '1px solid var(--border)',
  },
  tdCenter: {
    padding: '14px 10px',
    borderBottom: '1px solid var(--border)',
    textAlign: 'center',
  },
  numberInput: {
    width: '88px',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--bg-app)',
    color: 'var(--text-main)',
    textAlign: 'center',
    fontWeight: 800,
    outline: 'none',
  },
  svaPill: {
    display: 'inline-flex',
    minWidth: '44px',
    justifyContent: 'center',
    padding: '8px 10px',
    borderRadius: '999px',
    background: 'rgba(124,58,237,0.10)',
    color: colors.purple,
    fontWeight: 900,
  },
};
