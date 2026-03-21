// ============================================================
//  AuditoriaPesquisas.jsx — Auditoria de Entrevistas
//  Status: pendente | aceita | recusada
//  Ações: aceitar, recusar, excluir permanentemente
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import {
  Search, Filter, Download, MapPin, ChevronUp, ChevronDown,
  X, Eye, Hash, CheckCircle, AlertCircle, Trash2, ThumbsUp, ThumbsDown, Clock,
} from 'lucide-react';
import { Card, Btn, Badge, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';

const STATUS_CONFIG = {
  pendente:  { label: 'Pendente',  color: colors.warning, icon: Clock,      bg: `${colors.warning}15`  },
  aceita:    { label: 'Aceita',    color: colors.success, icon: CheckCircle, bg: `${colors.success}15` },
  recusada:  { label: 'Recusada',  color: colors.danger,  icon: AlertCircle, bg: `${colors.danger}15`  },
};

// ── Modal de respostas ────────────────────────────────────────
function ModalRespostas({ r, survey, onClose, onAceitar, onRecusar, onExcluir }) {
  const questions = survey?.questions || [];
  const st = STATUS_CONFIG[r.auditStatus || 'pendente'];

  const renderVal = (q, val) => {
    if (val === undefined || val === null || val === '') return <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>—</span>;
    if (q.type === 'nps') { const n=Number(val); const c=n<=3?colors.danger:n<=6?colors.warning:n<=8?colors.primary:colors.success; return <span style={{ fontWeight:'900', fontSize:'18px', color:c }}>{val}/10</span>; }
    if (q.type === 'boolean') return <span style={{ fontWeight:'800', color: val==='Sim'?colors.success:colors.danger }}>{val}</span>;
    if (Array.isArray(val)) return <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>{val.map((v,i)=><span key={i} style={{ background:`${colors.primary}15`, borderRadius:'5px', padding:'2px 8px', fontSize:'12px', fontWeight:'700', color:colors.primary }}>{v}</span>)}</div>;
    return <span>{String(val)}</span>;
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:'18px', width:'100%', maxWidth:'580px', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontWeight:'900', fontSize:'16px', color:'var(--text-main)' }}>{r.researcherName || 'Pesquisador'}</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'3px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {r.numero && <span style={{ background:`${colors.primary}15`, padding:'1px 7px', borderRadius:'5px', color:colors.primary, fontWeight:'800' }}>#{r.numero}</span>}
                <span>{r.surveyTitle}</span>
                {r.city && <span>📍 {r.city}</span>}
                {r.timestamp?.toDate && <span>🗓 {r.timestamp.toDate().toLocaleString('pt-BR')}</span>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ background: st.bg, color: st.color, borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight:'900' }}>{st.label}</span>
              <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}><X size={20}/></button>
            </div>
          </div>
        </div>

        {/* Respostas */}
        <div style={{ overflowY:'auto', padding:'14px 24px', display:'flex', flexDirection:'column', gap:'10px', flex:1 }}>
          {questions.length === 0
            ? <div style={{ textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'13px' }}>Perguntas não disponíveis.</div>
            : questions.map((q, i) => (
              <div key={q.id} style={{ background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'10px', padding:'11px 13px' }}>
                <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'4px' }}>P{i+1} · {q.label}</div>
                <div style={{ fontSize:'14px' }}>{renderVal(q, r.answers?.[q.id])}</div>
              </div>
            ))
          }
          {r.location?.lat && (
            <div style={{ background:`${colors.success}10`, border:`1px solid ${colors.success}30`, borderRadius:'10px', padding:'9px 13px', fontSize:'12px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'6px' }}>
              <MapPin size={13} color={colors.success}/> GPS: {r.location.lat.toFixed(6)}, {r.location.lng.toFixed(6)}
            </div>
          )}
          {!r.location?.lat && (
            <div style={{ background:`${colors.warning}10`, border:`1px solid ${colors.warning}30`, borderRadius:'10px', padding:'9px 13px', fontSize:'12px', color:colors.warning, display:'flex', alignItems:'center', gap:'6px', fontWeight:'700' }}>
              <MapPin size={13}/> Sem localização GPS registrada
            </div>
          )}
        </div>

        {/* Ações */}
        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:'8px', flexShrink:0, flexWrap:'wrap' }}>
          {r.auditStatus !== 'aceita' && (
            <button onClick={() => { onAceitar(r.id); onClose(); }}
              style={{ flex:1, padding:'11px', borderRadius:'10px', border:'none', background:`${colors.success}20`, color:colors.success, fontWeight:'900', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', outline:`1px solid ${colors.success}40` }}>
              <ThumbsUp size={15}/> Aceitar
            </button>
          )}
          {r.auditStatus !== 'recusada' && (
            <button onClick={() => { onRecusar(r.id); onClose(); }}
              style={{ flex:1, padding:'11px', borderRadius:'10px', border:'none', background:`${colors.warning}15`, color:colors.warning, fontWeight:'900', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', outline:`1px solid ${colors.warning}40` }}>
              <ThumbsDown size={15}/> Recusar
            </button>
          )}
          <button onClick={() => { if (window.confirm('Excluir permanentemente esta entrevista?')) { onExcluir(r.id); onClose(); } }}
            style={{ padding:'11px 16px', borderRadius:'10px', border:`1px solid ${colors.danger}30`, background:`${colors.danger}10`, color:colors.danger, fontWeight:'900', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <Trash2 size={14}/> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function AuditoriaPesquisas({ userData }) {
  const [surveys,   setSurveys]   = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [busca,      setBusca]      = useState('');
  const [selSurvey,  setSelSurvey]  = useState('all');
  const [selCity,    setSelCity]    = useState('all');
  const [selPesq,    setSelPesq]    = useState('all');
  const [selStatus,  setSelStatus]  = useState('all');
  const [sortField,  setSortField]  = useState('timestamp');
  const [sortDir,    setSortDir]    = useState('desc');
  const [modalResp,  setModalResp]  = useState(null);

  useEffect(() => {
    const unsubS = onSnapshot(collection(db, 'surveys'), snap => setSurveys(snap.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    const unsubR = onSnapshot(collection(db, 'survey_responses'), snap => {
      setResponses(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    }, ()=>setLoading(false));
    return () => { unsubS(); unsubR(); };
  }, []);

  // Ações de auditoria
  const handleAceitar = async (id) => {
    try { await updateDoc(doc(db, 'survey_responses', id), { auditStatus: 'aceita' }); }
    catch (e) { window.showToast?.(e.message, 'error'); }
  };
  const handleRecusar = async (id) => {
    try { await updateDoc(doc(db, 'survey_responses', id), { auditStatus: 'recusada' }); }
    catch (e) { window.showToast?.(e.message, 'error'); }
  };
  const handleExcluir = async (id) => {
    try { await deleteDoc(doc(db, 'survey_responses', id)); }
    catch (e) { window.showToast?.(e.message, 'error'); }
  };

  const surveyMap = useMemo(() => Object.fromEntries(surveys.map(s=>[s.id,s])), [surveys]);
  const cities    = useMemo(() => [...new Set(responses.map(r=>r.city).filter(Boolean))].sort(), [responses]);
  const pesquisa  = useMemo(() => [...new Set(responses.map(r=>r.researcherName).filter(Boolean))].sort(), [responses]);
  const surveysComResp = useMemo(() => [...new Set(responses.map(r=>r.surveyId))].map(id=>surveys.find(s=>s.id===id)).filter(Boolean), [responses, surveys]);

  const lista = useMemo(() => {
    let list = [...responses];
    if (selSurvey !== 'all') list = list.filter(r => r.surveyId === selSurvey);
    if (selCity   !== 'all') list = list.filter(r => r.city === selCity);
    if (selPesq   !== 'all') list = list.filter(r => r.researcherName === selPesq);
    if (selStatus !== 'all') list = list.filter(r => (r.auditStatus || 'pendente') === selStatus);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(r =>
        (r.researcherName||'').toLowerCase().includes(q) ||
        (r.surveyTitle||'').toLowerCase().includes(q) ||
        (r.city||'').toLowerCase().includes(q) ||
        (r.numero||'').toLowerCase().includes(q)
      );
    }
    list.sort((a,b) => {
      let va, vb;
      if (sortField==='timestamp') { va=a.timestamp?.seconds||0; vb=b.timestamp?.seconds||0; }
      else if (sortField==='name') { va=a.researcherName||''; vb=b.researcherName||''; }
      else if (sortField==='survey') { va=a.surveyTitle||''; vb=b.surveyTitle||''; }
      else if (sortField==='city') { va=a.city||''; vb=b.city||''; }
      else if (sortField==='status') { va=a.auditStatus||'pendente'; vb=b.auditStatus||'pendente'; }
      else { va=a[sortField]||''; vb=b[sortField]||''; }
      if (va<vb) return sortDir==='asc'?-1:1;
      if (va>vb) return sortDir==='asc'?1:-1;
      return 0;
    });
    return list;
  }, [responses, selSurvey, selCity, selPesq, selStatus, busca, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField===field) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Contadores de status
  const counts = useMemo(() => ({
    total:    responses.length,
    pendente: responses.filter(r=>(r.auditStatus||'pendente')==='pendente').length,
    aceita:   responses.filter(r=>r.auditStatus==='aceita').length,
    recusada: responses.filter(r=>r.auditStatus==='recusada').length,
  }), [responses]);

  const exportCSV = () => {
    const allSurveyQs = surveys.flatMap(s=>(s.questions||[]).map(q=>({surveyId:s.id,q})));
    const headers = ['#','Nº','Status','Pesquisador','Telefone','Pesquisa','Cidade','GPS','Data',...allSurveyQs.map(({q})=>q.label)];
    const rows = lista.map((r,i) => {
      const qs = allSurveyQs.map(({surveyId,q}) => {
        if (r.surveyId!==surveyId) return '';
        const v=r.answers?.[q.id]; return Array.isArray(v)?v.join(' | '):(v||'');
      });
      return [i+1,r.numero||'',r.auditStatus||'pendente',r.researcherName||'',r.telefone||'',r.surveyTitle||'',r.city||'',
        r.location?.lat?`${r.location.lat.toFixed(5)},${r.location.lng.toFixed(5)}`:'',
        r.timestamp?.toDate?.()?.toLocaleString('pt-BR')||'',...qs];
    });
    const csv=[headers,...rows].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='auditoria.csv';a.click();
  };

  const SortIcon = ({field}) => sortField!==field?<ChevronUp size={11} style={{opacity:0.2}}/>:sortDir==='asc'?<ChevronUp size={11}/>:<ChevronDown size={11}/>;
  const inp = { padding:'7px 11px', borderRadius:'8px', border:'1px solid var(--border)', outline:'none', fontSize:'12px', color:'var(--text-main)', background:'var(--bg-app)', fontFamily:'inherit', cursor:'pointer' };
  const thS = { padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', userSelect:'none', whiteSpace:'nowrap', background:'var(--bg-panel)', borderBottom:'1px solid var(--border)', cursor:'pointer' };

  const StatusBadge = ({ status }) => {
    const s = STATUS_CONFIG[status || 'pendente'];
    const Icon = s.icon;
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:s.bg, color:s.color, borderRadius:'6px', padding:'3px 8px', fontSize:'11px', fontWeight:'800' }}>
        <Icon size={11}/> {s.label}
      </span>
    );
  };

  return (
    <div style={{ ...global.container }}>
      {/* Cabeçalho */}
      <div style={{ background:'linear-gradient(135deg, var(--bg-card), var(--bg-panel))', border:'1px solid var(--border)', borderRadius:'20px', padding:'24px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px', boxShadow:'var(--shadow-sm)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'50px', height:'50px', borderRadius:'14px', background:`linear-gradient(135deg, ${colors.purple}, ${colors.primary})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 6px 18px ${colors.purple}44` }}>
            <Hash size={24} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:'21px', fontWeight:'900', color:'var(--text-main)' }}>Auditoria de Entrevistas</div>
            <div style={{ fontSize:'13px', color:'var(--text-muted)', marginTop:'2px' }}>{loading?'Carregando...':`${counts.total} total · ${counts.aceita} aceitas · ${counts.pendente} pendentes · ${counts.recusada} recusadas`}</div>
          </div>
        </div>
        <Btn variant="secondary" size="sm" onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          <Download size={13}/> Exportar CSV
        </Btn>
      </div>

      {/* KPIs de status */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'12px' }}>
        {[
          { key:'all',      label:'Total',     value:counts.total,    color:colors.primary },
          { key:'pendente', label:'Pendentes', value:counts.pendente, color:colors.warning },
          { key:'aceita',   label:'Aceitas',   value:counts.aceita,   color:colors.success },
          { key:'recusada', label:'Recusadas', value:counts.recusada, color:colors.danger  },
        ].map(k => (
          <div key={k.key} onClick={() => setSelStatus(k.key === selStatus ? 'all' : k.key)}
            style={{ background:'var(--bg-card)', border:`1px solid ${selStatus===k.key ? k.color : 'var(--border)'}`, borderLeft:`4px solid ${k.color}`, borderRadius:'12px', padding:'14px 16px', cursor:'pointer', boxShadow: selStatus===k.key ? `0 0 0 2px ${k.color}30` : 'var(--shadow-sm)', transition:'all 0.15s' }}>
            <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:'26px', fontWeight:'900', color:k.color, lineHeight:1.1, marginTop:'4px' }}>{loading?'...':k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <Filter size={14} color="var(--text-muted)"/>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'8px', padding:'0 10px', flex:'1', minWidth:'160px' }}>
            <Search size={12} color="var(--text-muted)"/>
            <input style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:'12px', color:'var(--text-main)', padding:'7px 0', fontFamily:'inherit' }}
              placeholder="Buscar..." value={busca} onChange={e=>setBusca(e.target.value)}/>
            {busca && <button onClick={()=>setBusca('')} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', padding:0 }}><X size={11} color="var(--text-muted)"/></button>}
          </div>
          <select style={inp} value={selSurvey} onChange={e=>setSelSurvey(e.target.value)}>
            <option value="all">Todas as pesquisas</option>
            {surveysComResp.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <select style={inp} value={selCity} onChange={e=>setSelCity(e.target.value)}>
            <option value="all">Todas as cidades</option>
            {cities.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={inp} value={selPesq} onChange={e=>setSelPesq(e.target.value)}>
            <option value="all">Todos os pesquisadores</option>
            {pesquisa.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select style={inp} value={selStatus} onChange={e=>setSelStatus(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aceita">Aceita</option>
            <option value="recusada">Recusada</option>
          </select>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>
            <AlertCircle size={36} style={{ opacity:0.2, marginBottom:'12px' }}/>
            <div style={{ fontWeight:'800' }}>Nenhuma entrevista encontrada</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr>
                  {[{f:'numero',label:'Nº'},{f:'status',label:'Status'},{f:'name',label:'Pesquisador'},{f:'survey',label:'Pesquisa'},{f:'city',label:'Cidade'},{f:'timestamp',label:'Data'}].map(col=>(
                    <th key={col.f} style={thS} onClick={()=>toggleSort(col.f)}>
                      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>{col.label}<SortIcon field={col.f}/></div>
                    </th>
                  ))}
                  <th style={{ ...thS, cursor:'default' }}>GPS</th>
                  <th style={{ ...thS, cursor:'default', minWidth:'180px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => {
                  const auditSt = r.auditStatus || 'pendente';
                  return (
                    <tr key={r.id} style={{ borderBottom:'1px solid var(--border)', opacity: auditSt==='recusada' ? 0.6 : 1 }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-app)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'9px 12px', fontWeight:'800', color:colors.primary }}>
                        {r.numero?<span style={{ background:`${colors.primary}15`, padding:'2px 7px', borderRadius:'5px' }}>{r.numero}</span>:'—'}
                      </td>
                      <td style={{ padding:'9px 12px' }}><StatusBadge status={auditSt}/></td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ fontWeight:'800', color:'var(--text-main)' }}>{r.researcherName||'—'}</div>
                        {r.telefone && <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>{r.telefone}</div>}
                      </td>
                      <td style={{ padding:'9px 12px', color:'var(--text-muted)', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.surveyTitle||r.surveyId}</td>
                      <td style={{ padding:'9px 12px', color:'var(--text-muted)' }}>{r.city||'—'}</td>
                      <td style={{ padding:'9px 12px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{r.timestamp?.toDate?r.timestamp.toDate().toLocaleString('pt-BR'):'—'}</td>
                      <td style={{ padding:'9px 12px', textAlign:'center' }}>
                        {r.location?.lat
                          ? <CheckCircle size={14} color={colors.success} title={`${r.location.lat.toFixed(4)}, ${r.location.lng.toFixed(4)}`}/>
                          : <span style={{ color:colors.warning, fontSize:'11px', fontWeight:'700' }}>⚠ Sem GPS</span>
                        }
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                          <button onClick={()=>setModalResp(r)}
                            style={{ padding:'4px 9px', borderRadius:'6px', border:`1px solid ${colors.primary}30`, background:`${colors.primary}10`, color:colors.primary, fontSize:'11px', fontWeight:'800', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                            <Eye size={11}/> Ver
                          </button>
                          {auditSt !== 'aceita' && (
                            <button onClick={()=>handleAceitar(r.id)}
                              style={{ padding:'4px 9px', borderRadius:'6px', border:`1px solid ${colors.success}30`, background:`${colors.success}10`, color:colors.success, fontSize:'11px', fontWeight:'800', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                              <ThumbsUp size={11}/>
                            </button>
                          )}
                          {auditSt !== 'recusada' && (
                            <button onClick={()=>handleRecusar(r.id)}
                              style={{ padding:'4px 9px', borderRadius:'6px', border:`1px solid ${colors.warning}30`, background:`${colors.warning}10`, color:colors.warning, fontSize:'11px', fontWeight:'800', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                              <ThumbsDown size={11}/>
                            </button>
                          )}
                          <button onClick={()=>{ if(window.confirm('Excluir permanentemente?')) handleExcluir(r.id); }}
                            style={{ padding:'4px 9px', borderRadius:'6px', border:`1px solid ${colors.danger}30`, background:`${colors.danger}10`, color:colors.danger, fontSize:'11px', fontWeight:'800', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                            <Trash2 size={11}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && lista.length > 0 && (
          <div style={{ padding:'10px 0 0', fontSize:'11px', color:'var(--text-muted)', fontWeight:'700' }}>
            Mostrando {lista.length} de {responses.length} registros
          </div>
        )}
      </Card>

      {modalResp && (
        <ModalRespostas
          r={modalResp}
          survey={surveyMap[modalResp.surveyId]}
          onClose={()=>setModalResp(null)}
          onAceitar={handleAceitar}
          onRecusar={handleRecusar}
          onExcluir={handleExcluir}
        />
      )}
    </div>
  );
}