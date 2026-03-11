import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, Target, ChevronDown, Plus, Star, Calendar, Users, 
  CheckCircle2, Trophy, Play, X, Save, TrendingUp, GripHorizontal, Medal, Award, BarChart2
} from 'lucide-react';

import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { colors, Btn, Badge } from '../../components/ui';
import { assinarPlanosAcao, salvarPlanoAcao, getMemoriaAcoes, salvarMemoriaAcao } from '../../services/acoes';
import { getMetasCidades, getCanaisVenda } from '../../services/metas';

export default function TabPlanoAcoes({ selectedMonth, userData }) {
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [cityGoals, setCityGoals] = useState({});
  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Memória e Sugestões
  const [memoryDescriptions, setMemoryDescriptions] = useState([]);
  const [memorySectors, setMemorySectors] = useState([]);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [isCompletionMode, setIsCompletionMode] = useState(false);

  // Estado do Top Ranking
  const [rankingFilter, setRankingFilter] = useState('Vendas'); // Vendas, Leads, Migrações, Nota

  // Formulário Inteligente
  const [form, setForm] = useState({
    name: '', description: '', status: 'Planejamento',
    startDate: '', endDate: '', responsible: '', cost: '',
    selectedChannels: [], extraSector: '',
    objective: 'Venda de Planos', customObjective: '',
    results: {}, rating: 0
  });

  const predefinedObjectives = ['Venda de Planos', 'Prospectar Clientes', 'Realizar Migrações', 'Posicionamento de Marca', 'Outros'];

  useEffect(() => {
    setLoading(true);
    const myCluster = String(userData?.clusterId || "").trim();
    const isCoord = userData?.role === 'coordinator' || userData?.role === 'coordenador';

    const unsubs = [
      onSnapshot(isCoord ? collection(db, 'cities') : query(collection(db, 'cities'), where('clusterId', '==', myCluster)), snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCities(list);
        if (list.length > 0 && !selectedCityId) setSelectedCityId(list[0].id);
      })
    ];
    
    getCanaisVenda().then(setChannels);
    getMemoriaAcoes('descriptions').then(setMemoryDescriptions);
    getMemoriaAcoes('sectors').then(setMemorySectors);

    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [userData]);

  useEffect(() => {
    if (!selectedCityId) return;
    getMetasCidades(selectedMonth).then(goals => setCityGoals(goals[selectedCityId] || {}));
    const unsub = assinarPlanosAcao(selectedMonth, selectedCityId, setActionPlans);
    return () => unsub();
  }, [selectedCityId, selectedMonth]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    actionPlans.forEach(action => {
      if (action.status === 'Planejamento' && action.startDate && action.startDate <= today) {
        salvarPlanoAcao(action.id, { ...action, status: 'Em Andamento' }, userData);
      }
    });
  }, [actionPlans, userData]);

  const totalMetaVendas = useMemo(() => {
    let total = 0;
    Object.values(cityGoals).forEach(ch => Object.values(ch).forEach(v => total += Number(v || 0)));
    return total;
  }, [cityGoals]);

  // 🚀 LÓGICA DO TOP RANKING
  const topActions = useMemo(() => {
    const scoredActions = actionPlans.map(action => {
      let score = 0;
      
      if (rankingFilter === 'Nota') {
        score = action.rating || 0;
      } 
      else if (rankingFilter === 'Vendas') {
        // Soma todas as chaves que terminam com "_vendas" nos resultados
        Object.keys(action.results || {}).forEach(key => {
          if (key.includes('_vendas')) score += Number(action.results[key] || 0);
        });
      } 
      else if (rankingFilter === 'Leads') {
        // Soma chaves "_leads" e o campo "leads" isolado
        Object.keys(action.results || {}).forEach(key => {
          if (key.includes('_leads')) score += Number(action.results[key] || 0);
        });
        score += Number(action.results?.leads || 0);
      } 
      else if (rankingFilter === 'Migrações') {
        score = Number(action.results?.migracoes || 0);
      }

      return { ...action, score };
    });

    // Filtra as que têm pontuação > 0, ordena decrescente e pega o Top 5
    return scoredActions
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [actionPlans, rankingFilter]);

  const openModal = (action = null, forceCompletion = false) => {
    if (action) {
      setForm({ ...action, status: forceCompletion ? 'Finalizada' : action.status });
      setCurrentAction(action.id);
    } else {
      setForm({
        name: '', description: '', status: 'Planejamento', startDate: '', endDate: '', 
        responsible: '', cost: '', selectedChannels: [], extraSector: '',
        objective: 'Venda de Planos', customObjective: '', results: {}, rating: 0
      });
      setCurrentAction(null);
    }
    setIsCompletionMode(forceCompletion);
    setIsModalOpen(true);
  };

  const handleSaveAction = async () => {
    if (!form.name || !form.description) return alert("Preencha o nome e a descrição.");
    if (form.status === 'Finalizada' && form.rating === 0) return alert("Por favor, avalie a ação de 1 a 5 estrelas.");
    
    setSavingAction(true);
    try {
      const finalObjective = form.objective === 'Outros' ? form.customObjective : form.objective;
      if (form.description) await salvarMemoriaAcao('descriptions', form.description);
      if (form.extraSector) await salvarMemoriaAcao('sectors', form.extraSector);

      const payload = { month: selectedMonth, cityId: selectedCityId, ...form, objective: finalObjective };

      await salvarPlanoAcao(currentAction, payload, userData);
      if (window.showToast) window.showToast('Ação salva com sucesso!', 'success');
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      if (window.showToast) window.showToast('Erro ao salvar.', 'error');
    }
    setSavingAction(false);
  };

  const [draggedAction, setDraggedAction] = useState(null);

  const handleDragStart = (e, action) => {
    setDraggedAction(action);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedAction || draggedAction.status === newStatus) return;

    if (newStatus === 'Finalizada') {
      openModal(draggedAction, true);
    } else {
      await salvarPlanoAcao(draggedAction.id, { ...draggedAction, status: newStatus }, userData);
      if (window.showToast) window.showToast(`Ação movida para ${newStatus}`, 'success');
    }
    setDraggedAction(null);
  };

  const renderKanbanColumn = (title, statusId, icon, color) => {
    const columnActions = actionPlans.filter(a => a.status === statusId);
    
    return (
      <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, statusId)} style={{ background: 'var(--bg-app)', borderRadius: '24px', padding: '20px', border: `1px solid var(--border)`, display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '500px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon} {title}</h3>
          <span style={{ background: color, color: '#fff', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '900' }}>{columnActions.length}</span>
        </div>

        {columnActions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '800', border: '2px dashed var(--border)', borderRadius: '16px' }}>Solte os cards aqui</div>
        ) : (
          columnActions.map(action => (
            <div key={action.id} draggable onDragStart={(e) => handleDragStart(e, action)} onClick={() => openModal(action)} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: action.rating >= 4 ? `1px solid ${colors.warning}` : '1px solid var(--border)', cursor: 'grab', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} onMouseOver={e => e.currentTarget.style.transform='translateY(-3px)'} onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}>
              <div style={{ position: 'absolute', top: 0, left: 0, background: color, color: '#fff', padding: '4px 12px', borderBottomRightRadius: '12px', fontSize: '10px', fontWeight: '900' }}>AÇÃO #{String(action.actionNumber).padStart(3, '0')}</div>
              <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--text-muted)', cursor: 'grab' }}><GripHorizontal size={16} /></div>

              <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>{action.name}</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>{action.objective}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-main)', fontWeight: '800', background: 'var(--bg-app)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Calendar size={12} color="var(--text-muted)" /> {action.startDate ? new Date(action.startDate).toLocaleDateString('pt-BR') : '--'}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '24px 30px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={24} color={colors.primary} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Plano de Ação Regional</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select value={selectedCityId} onChange={e => setSelectedCityId(e.target.value)} style={{ appearance: 'none', border: '1px solid var(--border)', background: 'var(--bg-app)', fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', padding: '10px 45px 10px 15px', borderRadius: '12px', minWidth: '220px' }}>
                {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
              <ChevronDown size={18} color="var(--text-muted)" style={{ position: 'absolute', right: '15px', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900' }}>META (GROSS)</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: colors.success }}>{totalMetaVendas}</div>
           </div>
           <Btn onClick={() => openModal()} style={{ background: colors.primary, color: '#fff', borderRadius: '12px', padding: '12px 24px', fontWeight: '900', display: 'flex', gap: '8px', alignItems: 'center' }}>
             <Plus size={18} /> Nova Ação
           </Btn>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
        {renderKanbanColumn('Planejamento', 'Planejamento', <Target size={18} color="var(--text-muted)" />, 'var(--text-muted)')}
        {renderKanbanColumn('Em Andamento', 'Em Andamento', <Play size={18} color={colors.primary} />, colors.primary)}
        {renderKanbanColumn('Finalizada', 'Finalizada', <CheckCircle2 size={18} color={colors.success} />, colors.success)}
      </div>

      {/* 🚀 TOP RANKING DE AÇÕES */}
      {/* 🚀 TOP RANKING DE AÇÕES DETALHADO */}
      <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.03)', marginTop: '10px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trophy size={24} color={colors.warning} /> Top Ranking de Performance
            </h3>
            <p style={{ margin: '5px 0 0 34px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>As estratégias que mais geraram resultado para a regional.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-app)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {['Vendas', 'Leads', 'Migrações', 'Nota'].map(btn => (
              <button 
                key={btn}
                onClick={() => setRankingFilter(btn)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none', 
                  background: rankingFilter === btn ? colors.primary : 'transparent', 
                  color: rankingFilter === btn ? '#fff' : 'var(--text-muted)', 
                  fontWeight: '800', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
                }}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        {topActions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <BarChart2 size={40} style={{ opacity: 0.3, marginBottom: '15px' }} />
            <div style={{ fontSize: '14px', fontWeight: '800' }}>Aguardando apuração de resultados...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {topActions.map((action, index) => {
              let badgeColor = 'rgba(100, 116, 139, 0.1)';
              let badgeText = 'var(--text-muted)';
              let icon = <Award size={16} />;

              if (index === 0) { badgeColor = 'rgba(245, 158, 11, 0.1)'; badgeText = colors.warning; icon = <Medal size={16} color={colors.warning} />; }
              if (index === 1) { badgeColor = 'rgba(156, 163, 175, 0.1)'; badgeText = '#6b7280'; icon = <Medal size={16} color="#6b7280" />; }
              if (index === 2) { badgeColor = 'rgba(180, 83, 9, 0.1)'; badgeText = '#b45309'; icon = <Medal size={16} color="#b45309" />; }

              return (
                <div 
                  key={action.id} 
                  onClick={() => openModal(action)} // ✅ AGORA ABRE O MODAL
                  style={{ 
                    background: 'var(--bg-app)', padding: '24px', borderRadius: '20px', 
                    border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', 
                    transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '15px' 
                  }} 
                  onMouseOver={e => {
                    e.currentTarget.style.transform='translateY(-5px)';
                    e.currentTarget.style.borderColor = colors.primary;
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
                  }} 
                  onMouseOut={e => {
                    e.currentTarget.style.transform='translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Medalha e Posição */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: badgeColor, color: badgeText, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid ${badgeText}40` }}>
                      {icon} {index + 1}º Lugar
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: '24px', fontWeight: '900', color: rankingFilter === 'Nota' ? colors.warning : colors.success }}>
                          {rankingFilter === 'Nota' ? action.score : `+${action.score}`}
                       </div>
                       <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{rankingFilter}</div>
                    </div>
                  </div>

                  {/* Informações Principais */}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{action.name}</h4>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                      {action.description}
                    </p>
                  </div>

                  {/* Participantes e Metas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={14} color={colors.primary} />
                      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {action.responsible} <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>• {action.selectedChannels?.join(', ')}</span>
                      </div>
                    </div>
                    
                    {/* Badge de Meta Atingida (Exemplo para Vendas) */}
                    {action.objective === 'Venda de Planos' && (
                      <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <TrendingUp size={12} color={colors.success} />
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>CONVERSÃO: <b style={{color: 'var(--text-main)'}}>{((action.score / (action.results?.totalLeads || 1)) * 100).toFixed(1)}%</b></span>
                         </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>
                    ID #{String(action.actionNumber).padStart(3, '0')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* MODAL DE AÇÃO INTELIGENTE */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isCompletionMode ? <CheckCircle2 size={24} color={colors.success} /> : <Target size={20} color={colors.primary} />}
                {isCompletionMode ? `Apurar Resultados - Ação #${String(form.actionNumber).padStart(3, '0')}` : currentAction ? `Editar Ação #${String(form.actionNumber).padStart(3, '0')}` : 'Planejar Nova Ação'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '30px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* BLOCO DE DADOS DA AÇÃO */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                <div><label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px'}}>NOME DA AÇÃO</label>
                <input type="text" value={form.name} disabled={isCompletionMode} onChange={e => setForm({...form, name: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', opacity: isCompletionMode ? 0.6 : 1}} /></div>
                
                <div><label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px'}}>STATUS</label>
                <select value={form.status} disabled={isCompletionMode} onChange={e => setForm({...form, status: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', opacity: isCompletionMode ? 0.6 : 1}}>
                  <option value="Planejamento">Planejamento</option><option value="Em Andamento">Em Andamento</option><option value="Finalizada">Finalizada</option><option value="Cancelada">Cancelada</option>
                </select></div>
              </div>

              {!isCompletionMode && (
                <>
                  <div>
                    <label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px'}}>DESCRIÇÃO TÁTICA</label>
                    <input list="desc-suggestions" type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none'}} placeholder="Descreva o que será feito..." />
                    <datalist id="desc-suggestions">{memoryDescriptions.map((d, i) => <option key={i} value={d} />)}</datalist>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                    <div><label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px'}}>INÍCIO</label><input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)'}} /></div>
                    <div><label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px'}}>FIM</label><input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)'}} /></div>
                    <div><label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px'}}>RESPONSÁVEL</label><input type="text" value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)'}} /></div>
                    <div><label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px'}}>CUSTO (R$)</label><input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)'}} /></div>
                  </div>

                  <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: colors.primary, marginBottom: '10px'}}>OBJETIVO PRINCIPAL</label>
                        <select value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none'}}>
                          {predefinedObjectives.map((o, i) => <option key={i} value={o}>{o}</option>)}
                        </select>
                        {form.objective === 'Outros' && <input type="text" value={form.customObjective} onChange={e => setForm({...form, customObjective: e.target.value})} style={{width: '100%', padding: '12px', marginTop: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)'}} placeholder="Especifique o objetivo..." />}
                      </div>
                      <div>
                        <label style={{display: 'block', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '10px'}}>CANAIS / SETORES DE APOIO</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          {channels.map(ch => (
                            <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px', color: 'var(--text-main)' }}>
                              <input type="checkbox" checked={form.selectedChannels.includes(ch.name)} onChange={e => {
                                const newCh = e.target.checked ? [...form.selectedChannels, ch.name] : form.selectedChannels.filter(c => c !== ch.name);
                                setForm({...form, selectedChannels: newCh});
                              }} /> {ch.name}
                            </label>
                          ))}
                        </div>
                        <input list="sector-suggestions" type="text" value={form.extraSector} onChange={e => setForm({...form, extraSector: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontSize: '12px'}} placeholder="Setor Extra (Ex: Retenção)" />
                        <datalist id="sector-suggestions">{memorySectors.map((s, i) => <option key={i} value={s} />)}</datalist>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* BLOCO DE RESULTADOS */}
              {(form.status === 'Finalizada' || isCompletionMode) && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '25px', borderRadius: '16px', border: `2px dashed ${colors.success}` }}>
                  <label style={{display: 'block', fontSize: '14px', fontWeight: '900', color: colors.success, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}><CheckCircle2 size={18}/> APURAÇÃO DE RESULTADOS ({form.objective})</label>
                  
                  {form.objective === 'Venda de Planos' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      {form.selectedChannels.length > 0 ? form.selectedChannels.map(chName => (
                        <div key={chName} style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '10px', textTransform: 'uppercase' }}>{chName}</div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div><span style={{fontSize:'10px', fontWeight:'800', color:'var(--text-muted)'}}>LEADS</span><input type="number" value={form.results[`${chName}_leads`] || ''} onChange={e => setForm({...form, results: {...form.results, [`${chName}_leads`]: e.target.value}})} style={{width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)'}} /></div>
                            <div><span style={{fontSize:'10px', fontWeight:'800', color:'var(--text-muted)'}}>VENDAS</span><input type="number" value={form.results[`${chName}_vendas`] || ''} onChange={e => setForm({...form, results: {...form.results, [`${chName}_vendas`]: e.target.value}})} style={{width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)'}} /></div>
                          </div>
                        </div>
                      )) : <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum canal selecionado na aba anterior.</div>}
                    </div>
                  ) : form.objective === 'Prospectar Clientes' ? (
                    <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', width: '50%' }}>
                      <label style={{display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '5px'}}>VOLUME DE PROSPECTOS / LEADS</label>
                      <input type="number" value={form.results.leads || ''} onChange={e => setForm({...form, results: {...form.results, leads: e.target.value}})} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)'}} placeholder="0" />
                    </div>
                  ) : form.objective === 'Realizar Migrações' ? (
                    <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', width: '50%' }}>
                      <label style={{display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '5px'}}>MIGRAÇÕES REALIZADAS</label>
                      <input type="number" value={form.results.migracoes || ''} onChange={e => setForm({...form, results: {...form.results, migracoes: e.target.value}})} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)'}} placeholder="0" />
                    </div>
                  ) : (
                    <textarea value={form.results.textResult || ''} onChange={e => setForm({...form, results: {...form.results, textResult: e.target.value}})} style={{width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '100px', fontFamily: 'inherit'}} placeholder="Descreva os resultados e impactos operacionais alcançados..." />
                  )}

                  <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <label style={{display: 'block', fontSize: '14px', fontWeight: '900', color: colors.warning, marginBottom: '15px'}}>NOTA DO GESTOR (Playbook)</label>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={36} fill={star <= form.rating ? colors.warning : 'transparent'} color={star <= form.rating ? colors.warning : 'var(--border)'} cursor="pointer" onClick={() => setForm({...form, rating: star})} style={{ transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform='scale(1.2)'} onMouseOut={e => e.currentTarget.style.transform='scale(1)'} />
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginTop: '15px' }}>Notas 4 e 5 transformam esta ação em um padrão para o Playbook Comercial.</div>
                  </div>
                </div>
              )}

            </div>

            <div style={{ padding: '20px 30px', borderTop: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', fontWeight: '800', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveAction} disabled={savingAction} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: isCompletionMode ? colors.success : colors.primary, color: '#fff', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 4px 15px ${isCompletionMode ? colors.success : colors.primary}40` }}>
                {isCompletionMode ? <><CheckCircle2 size={18} /> Consolidar Resultados</> : <><Save size={18} /> {savingAction ? 'Salvando...' : 'Salvar Plano de Ação'}</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}