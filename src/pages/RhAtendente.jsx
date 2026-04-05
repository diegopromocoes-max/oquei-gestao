import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  FileCheck,
  FileText,
  History,
  Loader2,
  Send,
  UploadCloud,
  XCircle,
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { createRhRequest, listMyRhRequests } from '../services/atendenteRhService';

const REQUEST_TYPES = {
  falta_futura: { id: 'falta_futura', label: 'Falta Futura', icon: AlertTriangle, color: '#ea580c', bg: '#ea580c15', desc: 'Avisar ausencia programada.' },
  atestado: { id: 'atestado', label: 'Enviar Atestado', icon: FileCheck, color: '#10b981', bg: '#10b98115', desc: 'Anexar comprovacao medica.' },
  folga: { id: 'folga', label: 'Solicitar Folga', icon: CalendarDays, color: '#3b82f6', bg: '#3b82f615', desc: 'Pedir folga compensatoria.' },
  correcao_ponto: { id: 'correcao_ponto', label: 'Revisao de Ponto', icon: Clock, color: '#f59e0b', bg: '#f59e0b15', desc: 'Contestar saldo de horas.' },
  outros: { id: 'outros', label: 'Solicitacao Avulsa', icon: FileText, color: '#8b5cf6', bg: '#8b5cf615', desc: 'Outros assuntos de RH.' },
};

function InlineAlert({ children }) {
  return (
    <div style={{ background: 'var(--bg-danger-light)', border: '1px solid var(--border-danger)', color: '#b45309', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', fontSize: '13px' }}>
      {children}
    </div>
  );
}

export default function RhAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('nova');
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    allDay: true,
    startTime: '',
    endTime: '',
    description: '',
  });

  useEffect(() => {
    if (activeTab === 'historico' && userData?.uid) {
      fetchHistory();
    }
  }, [activeTab, userData?.uid]);

  const fetchHistory = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await listMyRhRequests(userData?.uid);
      setHistoryList(list);
    } catch (error) {
      setHistoryList([]);
      setLoadError(error?.code === 'permission-denied' ? 'Sem permissao para consultar o historico de RH.' : 'Nao foi possivel carregar seu historico de solicitacoes.');
    }
    setLoading(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!form.description.trim()) {
      window.showToast?.('Descreva o motivo da solicitacao.', 'error');
      return;
    }

    if (selectedType === 'atestado' && !fileName) {
      window.showToast?.('Anexe a foto ou nome do atestado.', 'error');
      return;
    }

    setLoading(true);
    try {
      await createRhRequest({
        type: selectedType,
        attendantId: userData?.uid,
        attendantName: userData?.name || 'Atendente',
        storeId: userData?.cityId || 'Geral',
        clusterId: userData?.clusterId || '',
        description: form.description,
        status: 'Pendente',
        fileName: fileName || '',
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        allDay: form.allDay,
        startTime: form.allDay ? '' : form.startTime,
        endTime: form.allDay ? '' : form.endTime,
      });

      window.showToast?.('Solicitacao enviada com sucesso!', 'success');
      setSelectedType(null);
      setFileName(null);
      setForm({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        allDay: true,
        startTime: '',
        endTime: '',
        description: '',
      });
      setActiveTab('historico');
      await fetchHistory();
    } catch (error) {
      const message = error?.code === 'permission-denied' ? 'Sem permissao para abrir solicitacoes de RH.' : 'Nao foi possivel enviar sua solicitacao.';
      setSubmitError(message);
      window.showToast?.(message, 'error');
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      Aprovado: { bg: '#10b98115', color: '#10b981', icon: <CheckCircle size={12} /> },
      Rejeitado: { bg: '#ef444415', color: '#ef4444', icon: <XCircle size={12} /> },
      Pendente: { bg: '#f59e0b15', color: '#f59e0b', icon: <Clock size={12} /> },
    };
    const current = styles[status] || styles.Pendente;

    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: current.bg, color: current.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
        {current.icon} {status || 'Pendente'}
      </span>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
      <div style={global.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...global.iconHeader, background: colors?.primary || '#2563eb' }}>
            <FileCheck size={28} color="white" />
          </div>
          <div>
            <h1 style={global.title}>RH & Departamento Pessoal</h1>
            <p style={global.subtitle}>Agora o atendente envia tudo por solicitacao oficial em `rh_requests`.</p>
          </div>
        </div>
      </div>

      <div style={local.tabsContainer}>
        <button onClick={() => { setActiveTab('nova'); setSelectedType(null); }} style={activeTab === 'nova' ? local.tabActive : local.tab}>
          <FileText size={18} /> Nova Solicitacao
        </button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? local.tabActive : local.tab}>
          <History size={18} /> Meu Historico
        </button>
      </div>

      <div style={{ ...global.card, padding: '30px', borderRadius: '24px' }}>
        {loadError && <InlineAlert>{loadError}</InlineAlert>}
        {submitError && <InlineAlert>{submitError}</InlineAlert>}

        {activeTab === 'nova' && !selectedType && (
          <div style={{ animation: 'fadeInUp 0.3s' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-main)' }}>Selecione o tipo de pedido:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {Object.values(REQUEST_TYPES).map((type) => (
                <button key={type.id} onClick={() => setSelectedType(type.id)} style={local.actionCard}>
                  <div style={{ background: type.bg, padding: '12px', borderRadius: '12px', color: type.color, marginBottom: '15px' }}>
                    <type.icon size={24} />
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 5px 0' }}>{type.label}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{type.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'nova' && selectedType && (
          <div style={{ animation: 'fadeInUp 0.3s' }}>
            <button onClick={() => setSelectedType(null)} style={{ ...global.btnSecondary, width: 'auto', marginBottom: '20px', padding: '8px 15px' }}>
              <ArrowLeft size={16} /> Voltar
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', padding: '20px', background: 'var(--bg-app)', borderRadius: '16px' }}>
              <div style={{ background: REQUEST_TYPES[selectedType].bg, padding: '12px', borderRadius: '12px', color: REQUEST_TYPES[selectedType].color }}>
                {React.createElement(REQUEST_TYPES[selectedType].icon, { size: 24 })}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{REQUEST_TYPES[selectedType].label}</h2>
            </div>

            <form onSubmit={handleSubmit} style={global.form}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={global.field}>
                  <label style={global.label}>Data Inicial</label>
                  <input type="date" style={global.input} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </div>
                <div style={global.field}>
                  <label style={global.label}>Data Final (opcional)</label>
                  <input type="date" style={global.input} value={form.endDate} min={form.startDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
                <input type="checkbox" id="allDay" checked={form.allDay} onChange={(event) => setForm({ ...form, allDay: event.target.checked })} />
                <label htmlFor="allDay" style={{ fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Solicitacao de dia inteiro</label>
              </div>

              {!form.allDay && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={global.field}>
                    <label style={global.label}>Hora Inicio</label>
                    <input type="time" style={global.input} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
                  </div>
                  <div style={global.field}>
                    <label style={global.label}>Hora Fim</label>
                    <input type="time" style={global.input} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
                  </div>
                </div>
              )}

              <div style={global.field}>
                <label style={global.label}>Justificativa / Descricao</label>
                <textarea style={{ ...global.input, height: '100px', paddingTop: '12px' }} placeholder="Explique os detalhes..." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </div>

              <div style={global.field}>
                <label style={global.label}>Anexar Comprovante (obrigatorio para atestado)</label>
                <label style={{ ...local.uploadBox, borderColor: fileName ? '#10b981' : 'var(--border)' }}>
                  <input type="file" style={{ display: 'none' }} onChange={(event) => setFileName(event.target.files[0]?.name || null)} />
                  <UploadCloud size={24} color={fileName ? '#10b981' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '13px', marginTop: '10px', color: fileName ? '#10b981' : 'var(--text-muted)' }}>
                    {fileName || 'Clique para anexar arquivo ou foto'}
                  </span>
                </label>
              </div>

              <button type="submit" disabled={loading} style={{ ...global.btnPrimary, background: 'var(--text-brand)', marginTop: '10px' }}>
                {loading ? <Loader2 className="animate-spin" /> : 'Enviar Solicitacao Oficial'} <Send size={18} />
              </button>
            </form>
          </div>
        )}

        {activeTab === 'historico' && (
          <div style={{ animation: 'fadeInUp 0.3s', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando historico...</div>
            ) : historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Nenhuma solicitacao encontrada.</div>
            ) : (
              historyList.map((request) => (
                <div key={request.id} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--bg-app)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>{REQUEST_TYPES[request.type]?.label || 'Solicitacao'}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{request.startDate ? new Date(request.startDate).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)', opacity: 0.8 }}>{request.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const local = {
  tabsContainer: { display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '30px' },
  tab: { padding: '12px 5px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid transparent' },
  tabActive: { padding: '12px 5px', background: 'none', border: 'none', color: 'var(--text-brand)', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid var(--text-brand)' },
  actionCard: { background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  uploadBox: { border: '2px dashed var(--border)', borderRadius: '15px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
};
