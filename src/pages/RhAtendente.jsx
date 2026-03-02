import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  FileCheck, Clock, Calendar, Paperclip, Send, 
  History, AlertTriangle, FileText, CheckCircle, XCircle, 
  Info, UploadCloud, ArrowLeft, CalendarDays, Watch
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

export default function RhAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('nova');
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  
  // Estado para controlar qual card foi clicado
  const [selectedType, setSelectedType] = useState(null);
  const [fileName, setFileName] = useState(null);

  // Formulário dinâmico
  const [form, setForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    allDay: true,
    startTime: '',
    endTime: '',
    description: ''
  });

  const REQUEST_TYPES = {
    falta_futura: { id: 'falta_futura', label: 'Informar Falta Futura', icon: AlertTriangle, color: '#ea580c', bg: '#ea580c15', desc: 'Avisar sobre ausência programada.' },
    atestado: { id: 'atestado', label: 'Enviar Atestado', icon: FileCheck, color: '#10b981', bg: '#10b98115', desc: 'Anexar atestado médico (até 48h).' },
    folga: { id: 'folga', label: 'Solicitar Folga', icon: CalendarDays, color: '#3b82f6', bg: '#3b82f615', desc: 'Pedir um dia de folga compensatória.' },
    correcao_ponto: { id: 'correcao_ponto', label: 'Contestar Banco de Horas', icon: Clock, color: '#f59e0b', bg: '#f59e0b15', desc: 'Solicitar revisão do seu saldo de horas.' },
    outros: { id: 'outros', label: 'Solicitação Avulsa', icon: FileText, color: '#8b5cf6', bg: '#8b5cf615', desc: 'Outros assuntos de RH.' },
  };

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;
      
      // Busca Solicitações Gerais de RH
      const qRh = query(collection(db, "rh_requests"), where("attendantId", "==", auth.currentUser.uid));
      const snapRh = await getDocs(qRh);
      
      // Busca Faltas e Atestados (que vão para a coleção absences para cruzar com a escala)
      const qAbsences = query(collection(db, "absences"), where("attendantId", "==", auth.currentUser.uid));
      const snapAbsences = await getDocs(qAbsences);
      
      let combined = [];
      snapRh.docs.forEach(d => combined.push({ id: d.id, _source: 'rh', ...d.data() }));
      snapAbsences.docs.forEach(d => combined.push({ id: d.id, _source: 'absence', ...d.data() }));

      // Ordena por data de criação mais recente
      combined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryList(combined);
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return window.alert("Por favor, preencha a justificativa/descrição.");
    if (selectedType === 'atestado' && !fileName) return window.alert("É obrigatório anexar a foto do atestado médico.");

    setLoading(true);
    try {
      const isAbsence = selectedType === 'falta_futura' || selectedType === 'atestado';
      const collectionName = isAbsence ? "absences" : "rh_requests";

      const payload = {
        type: isAbsence ? (selectedType === 'atestado' ? 'atestado' : 'falta') : selectedType,
        attendantId: auth.currentUser.uid,
        attendantName: userData?.name || 'Atendente',
        storeId: userData?.cityId || 'Geral',
        clusterId: userData?.clusterId || '', // Importante para o supervisor achar
        description: form.description,
        reason: form.description, // Duplicado para compatibilidade com absences
        status: 'Pendente',
        fileName: fileName || '',
        createdAt: serverTimestamp()
      };

      // Adiciona campos específicos dependendo do formulário
      if (isAbsence || selectedType === 'folga') {
        payload.startDate = form.startDate;
        payload.endDate = form.endDate || form.startDate;
        payload.allDay = form.allDay;
        payload.startTime = form.allDay ? '' : form.startTime;
        payload.endTime = form.allDay ? '' : form.endTime;
        payload.dateEvent = form.startDate; // Retrocompatibilidade
      } else {
        payload.dateEvent = form.startDate;
      }

      await addDoc(collection(db, collectionName), payload);

      window.alert("Solicitação enviada com sucesso para a Supervisão!");
      
      // Reseta o form
      setForm({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        allDay: true, startTime: '', endTime: '', description: ''
      });
      setFileName(null);
      setSelectedType(null); // Volta para a tela de cards
      setActiveTab('historico');

    } catch (error) {
      window.alert("Erro ao enviar solicitação: " + error.message);
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Aprovado': return <span style={local.badgeSuccess}><CheckCircle size={12}/> Aprovado</span>;
      case 'Rejeitado': return <span style={local.badgeError}><XCircle size={12}/> Rejeitado</span>;
      default: return <span style={local.badgeWarning}><Clock size={12}/> Em Análise</span>;
    }
  };

  // --- RENDERIZADORES DE FORMULÁRIO DINÂMICO ---
  const renderFormFields = () => {
    switch(selectedType) {
      case 'falta_futura':
      case 'atestado':
      case 'folga':
        return (
          <>
            <div style={global.row}>
              <div style={global.field}>
                <label style={global.label}>Data de Início</label>
                <input type="date" style={global.input} value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
              </div>
              <div style={global.field}>
                <label style={global.label}>Data de Fim (Opcional)</label>
                <input type="date" style={global.input} value={form.endDate} min={form.startDate} onChange={e => setForm({...form, endDate: e.target.value})} />
              </div>
            </div>
            
            <div style={{...global.field, flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px', marginBottom: '10px'}}>
              <input type="checkbox" id="allDay" checked={form.allDay} onChange={e => setForm({...form, allDay: e.target.checked})} style={{width: '18px', height: '18px'}} />
              <label htmlFor="allDay" style={{...global.label, margin: 0, cursor: 'pointer'}}>Ausência de Dia Inteiro</label>
            </div>

            {!form.allDay && (
              <div style={global.row}>
                <div style={global.field}>
                  <label style={global.label}>Hora de Saída/Início</label>
                  <input type="time" style={global.input} value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} required={!form.allDay} />
                </div>
                <div style={global.field}>
                  <label style={global.label}>Hora de Retorno/Fim</label>
                  <input type="time" style={global.input} value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} required={!form.allDay} />
                </div>
              </div>
            )}
            
            <div style={global.field}>
              <label style={global.label}>{selectedType === 'atestado' ? 'Motivo Médico / Observações' : 'Justificativa da Ausência'}</label>
              <textarea style={global.textarea} placeholder="Explique os detalhes..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            </div>
          </>
        );

      case 'correcao_ponto':
        return (
          <>
            <div style={local.infoBoxWarn}>
              <Info size={20} color="#f59e0b" style={{flexShrink: 0}} />
              <p style={{margin: 0, fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5'}}>
                Utilize esta opção se você <strong>discorda do saldo atual</strong> do seu banco de horas. Descreva o motivo e anexe prints ou comprovantes se necessário no campo de anexo abaixo.
              </p>
            </div>
            <div style={global.field}>
              <label style={global.label}>Mês/Período de Referência do Saldo</label>
              <input type="month" style={global.input} value={form.startDate.slice(0, 7)} onChange={e => setForm({...form, startDate: e.target.value + '-01'})} required />
            </div>
            <div style={global.field}>
              <label style={global.label}>Qual a divergência no saldo? (Explique detalhadamente)</label>
              <textarea style={global.textarea} placeholder="Ex: Meu saldo no sistema indica -02:00h, mas no dia 10 eu fiz hora extra e não foi contabilizado..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            </div>
          </>
        );

      default: // 'outros'
        return (
          <>
            <div style={global.field}>
              <label style={global.label}>Data de Referência</label>
              <input type="date" style={global.input} value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
            </div>
            <div style={global.field}>
              <label style={global.label}>Descrição da Solicitação</label>
              <textarea style={global.textarea} placeholder="Escreva o que precisa..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            </div>
          </>
        );
    }
  };

  return (
    <div style={{ ...global.container, maxWidth: '800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#2563eb'}}>
          <FileCheck size={28} color="white"/>
        </div>
        <div>
          <h1 style={global.title}>RH & Departamento Pessoal</h1>
          <p style={global.subtitle}>Envie atestados, justifique faltas ou solicite folgas.</p>
        </div>
      </div>

      {/* TABS */}
      <div style={local.tabsContainer}>
        <button onClick={() => { setActiveTab('nova'); setSelectedType(null); }} style={activeTab === 'nova' ? local.tabActive : local.tab}>
          <FileText size={16} /> Nova Solicitação
        </button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? local.tabActive : local.tab}>
          <History size={16} /> Meu Histórico
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={global.card}>
        
        {/* ABA: NOVA SOLICITAÇÃO */}
        {activeTab === 'nova' && !selectedType && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <h3 style={{fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '20px'}}>O que deseja solicitar hoje?</h3>
            <div style={global.gridCards}>
              {Object.values(REQUEST_TYPES).map((type) => (
                <button 
                  key={type.id} 
                  onClick={() => setSelectedType(type.id)}
                  style={local.actionCard}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = type.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ background: type.bg, padding: '15px', borderRadius: '16px', color: type.color, marginBottom: '12px' }}>
                    <type.icon size={30} strokeWidth={2} />
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 5px 0' }}>{type.label}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{type.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FORMULÁRIO ESPECÍFICO (Quando um card é clicado) */}
        {activeTab === 'nova' && selectedType && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <button onClick={() => setSelectedType(null)} style={{...global.btnSecondary, marginBottom: '20px', width: 'auto'}}>
              <ArrowLeft size={16} /> Voltar aos tipos
            </button>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid var(--border)'}}>
               <div style={{ background: REQUEST_TYPES[selectedType].bg, padding: '12px', borderRadius: '12px', color: REQUEST_TYPES[selectedType].color }}>
                 {React.createElement(REQUEST_TYPES[selectedType].icon, { size: 24 })}
               </div>
               <div>
                 <h2 style={{fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0}}>{REQUEST_TYPES[selectedType].label}</h2>
                 <p style={{fontSize: '13px', color: 'var(--text-muted)', margin: 0}}>Preencha os dados abaixo para enviar à supervisão.</p>
               </div>
            </div>

            <form onSubmit={handleSubmit} style={global.form}>
              
              {selectedType === 'falta_futura' && (
                <div style={local.infoBoxWarn}>
                  <AlertTriangle size={20} color="#f59e0b" style={{flexShrink: 0}} />
                  <p style={{margin: 0, fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5'}}>
                    Ao informar uma falta futura, a sua loja ficará pendente de cobertura na escala do Supervisor. <strong>Aguarde a aprovação oficial.</strong>
                  </p>
                </div>
              )}

              {/* RENDERIZA OS CAMPOS DINÂMICOS AQUI */}
              {renderFormFields()}

              {/* UPLOAD DE ARQUIVO (Sempre disponível, mas obrigatório no atestado) */}
              <div style={global.field}>
                <label style={global.label}>
                  Anexar Documento {selectedType === 'atestado' ? <span style={{color: '#ef4444'}}>*Obrigatório</span> : '(Opcional)'}
                </label>
                <label htmlFor="file-upload" style={local.uploadBox}>
                   <input id="file-upload" type="file" style={{display: 'none'}} onChange={handleFileChange} />
                   <UploadCloud size={28} color={fileName ? "#10b981" : "var(--text-muted)"} />
                   <span style={{fontSize: '14px', color: fileName ? '#10b981' : 'var(--text-muted)', fontWeight: 'bold', marginTop: '10px'}}>
                     {fileName ? `Anexado: ${fileName}` : "Clique para anexar foto/arquivo"}
                   </span>
                </label>
              </div>

              <button type="submit" style={{...global.btnPrimary, padding: '16px', fontSize: '16px', background: '#2563eb'}} disabled={loading}>
                {loading ? 'A enviar...' : 'Enviar Solicitação Oficial'} <Send size={18} />
              </button>
            </form>
          </div>
        )}

        {/* ABA: HISTÓRICO */}
        {activeTab === 'historico' && (
          <div>
            <h3 style={{fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '20px'}}>Meus Pedidos Anteriores</h3>
            
            {loading ? (
              <p style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>A carregar histórico...</p>
            ) : historyList.length === 0 ? (
              <div style={global.emptyState}>
                <FileCheck size={40} style={{margin: '0 auto 10px', opacity: 0.5}} />
                <p>Nenhuma solicitação enviada até ao momento.</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                {historyList.map(req => {
                  let typeKey = req.type === 'falta' ? 'falta_futura' : req.type;
                  const typeInfo = REQUEST_TYPES[typeKey] || REQUEST_TYPES.outros;
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <div key={req.id} style={local.historyCard}>
                      <div style={local.historyHeader}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <div style={{padding: '8px', borderRadius: '10px', background: typeInfo.bg, color: typeInfo.color}}>
                            <TypeIcon size={20} />
                          </div>
                          <div>
                            <h4 style={{margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)'}}>{typeInfo.label}</h4>
                            <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                              Data Relacionada: {req.startDate ? new Date(req.startDate).toLocaleDateString('pt-BR') : (req.dateEvent ? req.dateEvent.split('-').reverse().join('/') : 'N/A')}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>
                      
                      <div>
                        <p style={{margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5'}}>
                          <strong>Detalhes:</strong> {req.description || req.reason}
                        </p>
                      </div>

                      {req.supervisorReason && (
                        <div style={{...local.feedbackBox, borderColor: req.status === 'Rejeitado' ? '#ef444450' : '#10b98150'}}>
                          <strong style={{display: 'block', fontSize: '11px', color: req.status === 'Rejeitado' ? '#ef4444' : '#10b981', textTransform: 'uppercase', marginBottom: '4px'}}>
                            Feedback da Supervisão
                          </strong>
                          <span style={{fontSize: '13px', color: 'var(--text-main)'}}>{req.supervisorReason}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const local = {
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid var(--border)', paddingBottom: '1px', overflowX: 'auto', scrollbarWidth: 'none' },
  tab: { padding: '12px 20px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid transparent', transition: '0.2s', whiteSpace: 'nowrap' },
  tabActive: { padding: '12px 20px', border: 'none', background: 'transparent', color: 'var(--text-brand)', cursor: 'pointer', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid var(--text-brand)', whiteSpace: 'nowrap' },

  actionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px 20px', cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center' },
  
  infoBoxWarn: { background: '#f59e0b15', border: '1px solid #f59e0b50', padding: '15px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' },
  uploadBox: { border: '2px dashed var(--border)', borderRadius: '12px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-app)', transition: '0.2s' },

  historyCard: { background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' },
  feedbackBox: { padding: '12px 15px', borderRadius: '10px', border: '1px dashed var(--border)', marginTop: '15px', background: 'var(--bg-card)' },

  badgeSuccess: { display: 'flex', alignItems: 'center', gap: '4px', background: '#10b98115', color: '#10b981', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #10b98130' },
  badgeError: { display: 'flex', alignItems: 'center', gap: '4px', background: '#ef444415', color: '#ef4444', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #ef444430' },
  badgeWarning: { display: 'flex', alignItems: 'center', gap: '4px', background: '#f59e0b15', color: '#f59e0b', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #f59e0b30' },
};