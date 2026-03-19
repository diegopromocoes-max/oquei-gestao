// ============================================================
//  BancoHorasSupervisor.jsx — Oquei Gestão
//
//  Lógica:
//  · hourBalance        → valor ABSOLUTO extraído do relatório.
//                         Cada atualização SUBSTITUI (não soma).
//  · manualAdjustments  → contador de ajustes manuais de ponto
//                         no mês. Ao atingir 4, perde bonificação POQ.
//  · adjustmentHistory  → array de log: { date, balance, reason,
//                         supervisor, manualCount }
//
//  Firestore (users/{uid}):
//    hourBalance:       number   (saldo atual — substituição)
//    manualAdjustments: number   (qtd ajustes manuais no mês)
//    adjustmentHistory: array[]  (histórico de lançamentos)
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, getDocs,
  doc, updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import {
  Clock, Search, User, AlertTriangle, AlertOctagon,
  LayoutGrid, List, TrendingUp, TrendingDown,
  History, Plus, Minus, X, Info, ShieldAlert,
  CheckCircle2, Trophy,
} from 'lucide-react';
import { Page, Card, KpiCard, DataTable, Btn, Modal, Badge } from '../components/ui';
import { colors } from '../globalStyles';

// ── Constantes POQ ────────────────────────────────────────────
const POQ_LIMIT       = 4;   // ajustes manuais que causam perda da bonificação
const POQ_ALERT_FROM  = 3;   // a partir de quantos ajustes exibe alerta amarelo

const ROLES_ATENDENTE = ['attendant', 'atendente'];

// ── Helpers de status POQ ────────────────────────────────────
const poqStatus = (count = 0) => {
  if (count >= POQ_LIMIT)   return { cor: 'danger',  label: '❌ Perdeu POQ',  icon: 'block'   };
  if (count >= POQ_ALERT_FROM) return { cor: 'warning', label: '⚠ Risco POQ', icon: 'warning' };
  return                           { cor: 'success', label: '✅ OK',           icon: 'ok'      };
};

const balanceColor = (b) => b > 0 ? colors.success : b < 0 ? colors.danger : colors.neutral;

// ── Banner de alerta POQ ──────────────────────────────────────
function PoqBanner({ count }) {
  if (count < POQ_ALERT_FROM) return null;
  const lost = count >= POQ_LIMIT;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      background: lost ? `${colors.danger}12` : `${colors.warning}12`,
      border: `1px solid ${lost ? colors.danger : colors.warning}40`,
      borderLeft: `4px solid ${lost ? colors.danger : colors.warning}`,
      borderRadius: '10px', padding: '12px 14px',
      fontSize: '13px', color: 'var(--text-main)', fontWeight: '600',
    }}>
      {lost
        ? <AlertOctagon size={16} color={colors.danger} style={{ flexShrink: 0, marginTop: '1px' }} />
        : <AlertTriangle size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: '1px' }} />
      }
      <span>
        {lost
          ? <><strong style={{ color: colors.danger }}>Bonificação POQ perdida.</strong> {count} ajustes manuais de ponto registrados no mês (limite: {POQ_LIMIT}).</>
          : <><strong style={{ color: colors.warning }}>Atenção:</strong> {count} de {POQ_LIMIT} ajustes manuais usados. Mais {POQ_LIMIT - count} ajuste{POQ_LIMIT - count > 1 ? 's' : ''} e a bonificação POQ será perdida.</>
        }
      </span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function BancoHorasSupervisor({ userData }) {

  const [loading,    setLoading]    = useState(true);
  const [attendants, setAttendants] = useState([]);
  const [cities,     setCities]     = useState([]);
  const [viewMode,   setViewMode]   = useState('list');

  // Filtros
  const [search,     setSearch]     = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [balFilter,  setBalFilter]  = useState('all');
  const [poqFilter,  setPoqFilter]  = useState('all'); // all | risk | lost

  // Modal
  const [modalEmp,  setModalEmp]  = useState(null);
  const [modalTab,  setModalTab]  = useState('balance'); // balance | manual | history
  const [saving,    setSaving]    = useState(false);

  // Formulário — banco de horas (substituição)
  const [newBalance, setNewBalance] = useState('');
  const [balReason,  setBalReason]  = useState('');

  // Formulário — ajuste manual de ponto
  const [manualDelta,  setManualDelta]  = useState('1'); // quantos ajustes manuais registrar
  const [manualReason, setManualReason] = useState('');

  const roleNorm = String(userData?.role || '').toLowerCase().replace(/[\s_-]/g, '');
  const isMaster = ['coordinator', 'coordenador', 'master', 'diretor'].includes(roleNorm);

  // ── Carregamento ──────────────────────────────────────────
  useEffect(() => {
    if (!userData) return;
    const load = async () => {
      setLoading(true);
      try {
        const citiesSnap = await getDocs(collection(db, 'cities'));
        const citiesList = citiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCities(citiesList);

        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('role', 'in', ROLES_ATENDENTE))
        );
        const all = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (isMaster) {
          setAttendants(all);
        } else {
          const myCluster = String(userData.clusterId || '').trim();
          setAttendants(all.filter(att => {
            const cidade  = citiesList.find(c => c.id === att.cityId);
            return String(cidade?.clusterId || '').trim() === myCluster;
          }));
        }
      } catch (err) {
        console.error('[BancoHoras]', err);
      }
      setLoading(false);
    };
    load();
  }, [userData, isMaster]);

  // ── Filtragem ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return attendants.filter(emp => {
      const matchSearch = (emp.name || '').toLowerCase().includes(search.toLowerCase());
      const matchCity   = !cityFilter || emp.cityId === cityFilter;
      const bal         = emp.hourBalance || 0;
      const matchBal    =
        balFilter === 'positive' ? bal > 0  :
        balFilter === 'negative' ? bal < 0  :
        balFilter === 'critical' ? Math.abs(bal) > 20 : true;
      const adj         = emp.manualAdjustments || 0;
      const matchPoq    =
        poqFilter === 'risk' ? adj >= POQ_ALERT_FROM :
        poqFilter === 'lost' ? adj >= POQ_LIMIT       : true;
      return matchSearch && matchCity && matchBal && matchPoq;
    });
  }, [attendants, search, cityFilter, balFilter, poqFilter]);

  // ── KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    saldo:   filtered.reduce((s, e) => s + (e.hourBalance || 0), 0),
    critico: filtered.filter(e => Math.abs(e.hourBalance || 0) > 20).length,
    poqRisk: attendants.filter(e => (e.manualAdjustments || 0) >= POQ_ALERT_FROM && (e.manualAdjustments || 0) < POQ_LIMIT).length,
    poqLost: attendants.filter(e => (e.manualAdjustments || 0) >= POQ_LIMIT).length,
    total:   attendants.length,
  }), [filtered, attendants]);

  // ── Helpers ───────────────────────────────────────────────
  const cityName = (cityId) =>
    cities.find(c => c.id === cityId)?.name || cityId || '—';

  const openModal = (emp) => {
    setModalEmp(emp);
    setModalTab('balance');
    setNewBalance(emp.hourBalance != null ? String(emp.hourBalance) : '');
    setBalReason('');
    setManualDelta('1');
    setManualReason('');
  };
  const closeModal = () => setModalEmp(null);

  // ── Salvar banco de horas (substituição) ──────────────────
  const saveBalance = async () => {
    const val = parseFloat(newBalance);
    if (isNaN(val))          return window.showToast?.('Informe um saldo válido.', 'error');
    if (!balReason.trim())   return window.showToast?.('Informe o motivo do lançamento.', 'error');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', modalEmp.id), {
        hourBalance: val,
        adjustmentHistory: arrayUnion({
          date:       new Date().toISOString(),
          balance:    val,
          reason:     balReason,
          supervisor: userData?.name || 'Supervisor',
          type:       'balance_update',
        }),
      });
      setAttendants(prev =>
        prev.map(u => u.id === modalEmp.id
          ? { ...u, hourBalance: val,
              adjustmentHistory: [...(u.adjustmentHistory || []), { date: new Date().toISOString(), balance: val, reason: balReason, type: 'balance_update' }] }
          : u
        )
      );
      // Atualiza o modal com o novo estado
      setModalEmp(prev => ({ ...prev, hourBalance: val }));
      window.showToast?.('Banco de horas atualizado!', 'success');
      setBalReason('');
    } catch (err) {
      window.showToast?.('Erro ao salvar: ' + err.message, 'error');
    }
    setSaving(false);
  };

  // ── Registrar ajuste manual de ponto ─────────────────────
  const saveManual = async () => {
    const qty = parseInt(manualDelta);
    if (!qty || qty < 1)       return window.showToast?.('Informe a quantidade de ajustes.', 'error');
    if (!manualReason.trim())  return window.showToast?.('Informe o motivo.', 'error');
    setSaving(true);
    try {
      const current     = modalEmp.manualAdjustments || 0;
      const newCount    = current + qty;
      await updateDoc(doc(db, 'users', modalEmp.id), {
        manualAdjustments: newCount,
        adjustmentHistory: arrayUnion({
          date:        new Date().toISOString(),
          type:        'manual_adjustment',
          qty,
          totalAfter:  newCount,
          reason:      manualReason,
          supervisor:  userData?.name || 'Supervisor',
        }),
      });
      setAttendants(prev =>
        prev.map(u => u.id === modalEmp.id
          ? { ...u, manualAdjustments: newCount }
          : u
        )
      );
      setModalEmp(prev => ({ ...prev, manualAdjustments: newCount }));
      window.showToast?.(
        newCount >= POQ_LIMIT
          ? `⚠ ${modalEmp.name?.split(' ')[0]} atingiu ${newCount} ajustes — POQ perdido!`
          : `Registrado. Total: ${newCount}/${POQ_LIMIT} ajustes.`,
        newCount >= POQ_LIMIT ? 'error' : 'success'
      );
      setManualDelta('1');
      setManualReason('');
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    }
    setSaving(false);
  };

  // ── Zerar ajustes manuais (início de novo mês) ────────────
  const resetManual = async (emp) => {
    if (!window.confirm(`Zerar ajustes manuais de ${emp.name}? Use no início de cada mês.`)) return;
    try {
      await updateDoc(doc(db, 'users', emp.id), {
        manualAdjustments: 0,
        adjustmentHistory: arrayUnion({
          date:       new Date().toISOString(),
          type:       'manual_reset',
          reason:     'Reset mensal',
          supervisor: userData?.name || 'Supervisor',
        }),
      });
      setAttendants(prev => prev.map(u => u.id === emp.id ? { ...u, manualAdjustments: 0 } : u));
      if (modalEmp?.id === emp.id) setModalEmp(prev => ({ ...prev, manualAdjustments: 0 }));
      window.showToast?.('Ajustes manuais zerados.', 'success');
    } catch { window.showToast?.('Erro ao zerar.', 'error'); }
  };

  // ── Colunas da tabela ─────────────────────────────────────
  const columns = [
    {
      key: 'nome', label: 'Colaborador',
      render: (_v, row) => {
        if (!row) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: `${colors.primary}20`, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '15px' }}>
              {(row.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{row.name || '(sem nome)'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cityName(row.cityId)}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'saldo', label: 'Saldo de Horas',
      render: (_v, row) => {
        if (!row) return null;
        const b = row.hourBalance || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {b > 0 ? <TrendingUp size={14} color={colors.success} /> : b < 0 ? <TrendingDown size={14} color={colors.danger} /> : null}
            <span style={{ fontWeight: '900', fontSize: '16px', color: balanceColor(b) }}>
              {b > 0 ? '+' : ''}{b.toFixed(1)}h
            </span>
          </div>
        );
      },
    },
    {
      key: 'poq', label: 'POQ / Ajustes Manuais',
      render: (_v, row) => {
        if (!row) return null;
        const adj = row.manualAdjustments || 0;
        const st  = poqStatus(adj);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge cor={st.cor}>{st.label}</Badge>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
              {adj}/{POQ_LIMIT}
            </span>
            {/* Barrinhas de progresso */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {Array.from({ length: POQ_LIMIT }).map((_, i) => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '3px', background: i < adj ? (adj >= POQ_LIMIT ? colors.danger : adj >= POQ_ALERT_FROM ? colors.warning : colors.success) : 'var(--border)' }} />
              ))}
            </div>
          </div>
        );
      },
    },
    {
      key: 'acoes', label: '', align: 'right',
      render: (_v, row) => {
        if (!row) return null;
        return (
          <Btn size="sm" variant="secondary" onClick={() => openModal(row)}>
            Gerenciar
          </Btn>
        );
      },
    },
  ];

  // ── Estilos ───────────────────────────────────────────────
  const inp = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-app)', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl = { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' };

  // ── Render ────────────────────────────────────────────────
  return (
    <Page title="Banco de Horas" subtitle="Controle de saldos e ajustes manuais de ponto (POQ).">

      {/* Alerta global POQ */}
      {(kpis.poqLost > 0 || kpis.poqRisk > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {kpis.poqLost > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: `${colors.danger}10`, border: `1px solid ${colors.danger}30`, borderLeft: `4px solid ${colors.danger}`, borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              <AlertOctagon size={18} color={colors.danger} style={{ flexShrink: 0 }} />
              <span><strong style={{ color: colors.danger }}>{kpis.poqLost} colaborador{kpis.poqLost > 1 ? 'es' : ''}</strong> atingiu o limite de {POQ_LIMIT} ajustes manuais e <strong style={{ color: colors.danger }}>perdeu a bonificação POQ</strong> neste mês.</span>
            </div>
          )}
          {kpis.poqRisk > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: `${colors.warning}10`, border: `1px solid ${colors.warning}30`, borderLeft: `4px solid ${colors.warning}`, borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              <AlertTriangle size={18} color={colors.warning} style={{ flexShrink: 0 }} />
              <span><strong style={{ color: colors.warning }}>{kpis.poqRisk} colaborador{kpis.poqRisk > 1 ? 'es' : ''}</strong> está em risco de perder a bonificação POQ ({POQ_ALERT_FROM}+ ajustes).</span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Saldo Total" valor={`${kpis.saldo >= 0 ? '+' : ''}${kpis.saldo.toFixed(1)}h`} icon={<Clock size={22} />} accent={kpis.saldo >= 0 ? colors.success : colors.danger} />
        <KpiCard label="Saldo Crítico (>20h)" valor={kpis.critico} icon={<AlertTriangle size={22} />} accent={colors.danger} />
        <KpiCard label="Em Risco POQ" valor={kpis.poqRisk} icon={<AlertTriangle size={22} />} accent={colors.warning} />
        <KpiCard label="Perderam POQ" valor={kpis.poqLost} icon={<AlertOctagon size={22} />} accent={colors.danger} />
        <KpiCard label="Atendentes" valor={kpis.total} icon={<User size={22} />} accent={colors.primary} />
      </div>

      {/* Filtros */}
      <Card>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Busca */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={lbl}>Buscar</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 12px' }}>
              <Search size={14} color="var(--text-muted)" />
              <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '11px 0', fontSize: '14px', color: 'var(--text-main)', fontFamily: 'inherit' }} placeholder="Nome..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={13} /></button>}
            </div>
          </div>
          {/* Cidade */}
          <div style={{ minWidth: '160px' }}>
            <label style={lbl}>Cidade</label>
            <select style={inp} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="">Todas</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
            </select>
          </div>
          {/* Saldo */}
          <div style={{ minWidth: '150px' }}>
            <label style={lbl}>Saldo</label>
            <select style={inp} value={balFilter} onChange={e => setBalFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="positive">Com crédito (+)</option>
              <option value="negative">Com débito (-)</option>
              <option value="critical">Críticos (&gt;20h)</option>
            </select>
          </div>
          {/* POQ */}
          <div style={{ minWidth: '150px' }}>
            <label style={lbl}>POQ</label>
            <select style={inp} value={poqFilter} onChange={e => setPoqFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="risk">Em risco (3+ aj.)</option>
              <option value="lost">Perderam POQ (4+)</option>
            </select>
          </div>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '7px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: viewMode === 'list' ? colors.primary : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', display: 'flex' }}><List size={16} /></button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '7px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? colors.primary : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', display: 'flex' }}><LayoutGrid size={16} /></button>
          </div>
        </div>
        {!loading && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{filtered.length} de {attendants.length} colaboradores</div>}
      </Card>

      {/* Lista / Grid */}
      {viewMode === 'list' ? (
        <DataTable columns={columns} data={filtered} loading={loading} emptyMsg="Nenhum colaborador encontrado." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {loading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Nenhum colaborador encontrado.</div>
          ) : filtered.map(emp => {
            const bal = emp.hourBalance || 0;
            const adj = emp.manualAdjustments || 0;
            const st  = poqStatus(adj);
            return (
              <div key={emp.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${adj >= POQ_LIMIT ? colors.danger : Math.abs(bal) > 20 ? colors.danger : bal >= 0 ? colors.success : colors.warning}`, borderRadius: '16px', padding: '18px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Avatar + nome */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0, background: `${colors.primary}20`, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '17px' }}>
                    {(emp.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cityName(emp.cityId)}</div>
                  </div>
                  {adj >= POQ_ALERT_FROM && <AlertTriangle size={16} color={adj >= POQ_LIMIT ? colors.danger : colors.warning} />}
                </div>
                {/* Saldo */}
                <div style={{ background: 'var(--bg-app)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo</span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: balanceColor(bal) }}>{bal > 0 ? '+' : ''}{bal.toFixed(1)}h</span>
                </div>
                {/* POQ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge cor={st.cor}>{st.label}</Badge>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {Array.from({ length: POQ_LIMIT }).map((_, i) => (
                      <div key={i} style={{ width: '12px', height: '12px', borderRadius: '3px', background: i < adj ? (adj >= POQ_LIMIT ? colors.danger : adj >= POQ_ALERT_FROM ? colors.warning : colors.success) : 'var(--border)' }} />
                    ))}
                  </div>
                </div>
                <Btn variant="secondary" size="sm" onClick={() => openModal(emp)} style={{ width: '100%', justifyContent: 'center' }}>Gerenciar</Btn>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de gerenciamento ── */}
      <Modal open={!!modalEmp} onClose={closeModal} size="lg"
        title={modalEmp ? `${modalEmp.name || 'Colaborador'} · ${cityName(modalEmp?.cityId)}` : ''}
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={closeModal}>Fechar</Btn>
          </div>
        }
      >
        {modalEmp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Alerta POQ individual */}
            <PoqBanner count={modalEmp.manualAdjustments || 0} />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px' }}>
              {[
                { id: 'balance', label: '⏱ Banco de Horas' },
                { id: 'manual',  label: '📋 Ajustes Manuais' },
                { id: 'history', label: '🕘 Histórico' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setModalTab(tab.id)}
                  style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px', background: modalTab === tab.id ? colors.primary : 'transparent', color: modalTab === tab.id ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: Banco de Horas */}
            {modalTab === 'balance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Saldo atual */}
                <div style={{ background: 'var(--bg-app)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo Atual</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: balanceColor(modalEmp.hourBalance || 0), marginTop: '2px' }}>
                      {(modalEmp.hourBalance || 0) > 0 ? '+' : ''}{(modalEmp.hourBalance || 0).toFixed(1)}h
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <Info size={13} style={{ marginBottom: '4px' }} /><br />
                    O valor inserido<br /><strong>substitui</strong> o saldo atual
                  </div>
                </div>

                <div>
                  <label style={lbl}>Novo Saldo (extraído do relatório) *</label>
                  <input style={inp} type="number" step="0.5" placeholder="Ex: -3.5 ou +8" value={newBalance} onChange={e => setNewBalance(e.target.value)} />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    Use valores negativos para débito (ex: -4.5) e positivos para crédito (ex: 8).
                  </div>
                </div>
                <div>
                  <label style={lbl}>Motivo / Referência *</label>
                  <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} placeholder="Ex: Fechamento semana 12 — relatório Tangerino 18/03/2026" value={balReason} onChange={e => setBalReason(e.target.value)} />
                </div>

                {/* Preview */}
                {newBalance !== '' && !isNaN(parseFloat(newBalance)) && (
                  <div style={{ background: `${colors.primary}10`, border: `1px solid ${colors.primary}30`, borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Novo saldo após atualização</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: balanceColor(parseFloat(newBalance)) }}>
                      {parseFloat(newBalance) > 0 ? '+' : ''}{parseFloat(newBalance).toFixed(1)}h
                    </span>
                  </div>
                )}

                <Btn onClick={saveBalance} loading={saving} style={{ width: '100%', justifyContent: 'center' }}>
                  Atualizar Banco de Horas
                </Btn>
              </div>
            )}

            {/* TAB: Ajustes Manuais de Ponto */}
            {modalTab === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Status POQ visual */}
                <div style={{ background: 'var(--bg-app)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ajustes Manuais no Mês</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: (modalEmp.manualAdjustments || 0) >= POQ_LIMIT ? colors.danger : (modalEmp.manualAdjustments || 0) >= POQ_ALERT_FROM ? colors.warning : colors.success, marginTop: '2px' }}>
                        {modalEmp.manualAdjustments || 0}
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}> / {POQ_LIMIT}</span>
                      </div>
                    </div>
                    <Btn size="sm" variant="danger" onClick={() => resetManual(modalEmp)}>
                      Zerar (reset mensal)
                    </Btn>
                  </div>
                  {/* Progresso visual */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Array.from({ length: POQ_LIMIT }).map((_, i) => {
                      const adj = modalEmp.manualAdjustments || 0;
                      const filled = i < adj;
                      const col = adj >= POQ_LIMIT ? colors.danger : adj >= POQ_ALERT_FROM ? colors.warning : colors.success;
                      return (
                        <div key={i} style={{ flex: 1, height: '20px', borderRadius: '6px', background: filled ? col : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: filled ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {(modalEmp.manualAdjustments || 0) >= POQ_LIMIT
                      ? `❌ Limite atingido — bonificação POQ perdida neste mês.`
                      : `Restam ${POQ_LIMIT - (modalEmp.manualAdjustments || 0)} ajuste(s) antes de perder o POQ.`
                    }
                  </div>
                </div>

                {/* Formulário de registro */}
                {(modalEmp.manualAdjustments || 0) < POQ_LIMIT ? (
                  <>
                    <div>
                      <label style={lbl}>Quantidade de ajustes a registrar</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3].map(n => (
                          <button key={n} onClick={() => setManualDelta(String(n))}
                            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '16px', background: manualDelta === String(n) ? colors.primary : 'var(--bg-app)', color: manualDelta === String(n) ? '#fff' : 'var(--text-muted)', outline: `1px solid ${manualDelta === String(n) ? colors.primary : 'var(--border)'}`, transition: 'all 0.12s' }}>
                            +{n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Motivo *</label>
                      <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} placeholder="Ex: Esqueceu bater ponto na entrada — 17/03/2026" value={manualReason} onChange={e => setManualReason(e.target.value)} />
                    </div>
                    {/* Alerta do que vai acontecer */}
                    {(() => {
                      const after = (modalEmp.manualAdjustments || 0) + parseInt(manualDelta || 1);
                      if (after >= POQ_LIMIT) return (
                        <div style={{ background: `${colors.danger}10`, border: `1px solid ${colors.danger}30`, borderRadius: '10px', padding: '10px 13px', fontSize: '12px', fontWeight: '700', color: colors.danger, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertOctagon size={14} /> Após registrar, o colaborador terá {after} ajustes e <strong>perderá a bonificação POQ</strong>.
                        </div>
                      );
                      if (after >= POQ_ALERT_FROM) return (
                        <div style={{ background: `${colors.warning}10`, border: `1px solid ${colors.warning}30`, borderRadius: '10px', padding: '10px 13px', fontSize: '12px', fontWeight: '700', color: colors.warning, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={14} /> Após registrar, o colaborador terá {after}/{POQ_LIMIT} ajustes. <strong>Próximo do limite POQ.</strong>
                        </div>
                      );
                      return null;
                    })()}
                    <Btn onClick={saveManual} loading={saving} style={{ width: '100%', justifyContent: 'center' }}>
                      Registrar Ajuste Manual
                    </Btn>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.danger, fontWeight: '700', fontSize: '14px' }}>
                    Limite de {POQ_LIMIT} ajustes atingido. Use "Zerar (reset mensal)" no início do próximo mês.
                  </div>
                )}
              </div>
            )}

            {/* TAB: Histórico */}
            {modalTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!(modalEmp.adjustmentHistory?.length) ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <History size={28} style={{ opacity: 0.3, marginBottom: '8px' }} /><br />Nenhum lançamento registrado ainda.
                  </div>
                ) : (
                  [...(modalEmp.adjustmentHistory || [])]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((h, i) => {
                      const isManual  = h.type === 'manual_adjustment';
                      const isReset   = h.type === 'manual_reset';
                      const icon      = isManual ? '📋' : isReset ? '🔄' : '⏱';
                      const col       = isManual ? colors.warning : isReset ? colors.info : colors.primary;
                      return (
                        <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 14px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderLeft: `3px solid ${col}`, borderRadius: '10px' }}>
                          <div style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                                {isManual  ? `+${h.qty} ajuste${h.qty > 1 ? 's' : ''} manual${h.qty > 1 ? 'is' : ''} (total: ${h.totalAfter}/${POQ_LIMIT})`
                                : isReset  ? 'Reset mensal de ajustes'
                                : `Saldo atualizado → ${h.balance >= 0 ? '+' : ''}${h.balance?.toFixed(1)}h`}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                              {h.reason} · <span style={{ fontWeight: '700' }}>{h.supervisor}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}

          </div>
        )}
      </Modal>
    </Page>
  );
}