import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Star, BarChart2, TrendingUp, Save, Wifi, DollarSign } from 'lucide-react';
import { colors } from '../components/ui';

const StarRating = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</label>
    <div style={{ display: 'flex', gap: '8px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star 
          key={s} size={28} fill={s <= value ? colors.warning : "transparent"} color={s <= value ? colors.warning : "var(--border)"} 
          cursor="pointer" onClick={() => onChange(s)} style={{ transition: 'transform 0.1s' }}
          onMouseOver={e => e.currentTarget.style.transform='scale(1.15)'} onMouseOut={e => e.currentTarget.style.transform='scale(1)'}
        />
      ))}
    </div>
  </div>
);

export default function TabAvaliacaoPatrocinio({ sponsorships, preSelectedId, onSuccess }) {
  const [selectedId, setSelectedId] = useState(preSelectedId || '');
  const [loading, setLoading] = useState(false);

  // 🚀 ADICIONADO CAMPOS FINANCEIROS (Internet e Custos Reais)
  const [form, setForm] = useState({
    internetCourtesyValue: '', leadsGenerated: '', salesClosed: '', actualAudience: '', 
    brandScore: 0, cityImpactScore: 0, generalObservations: '', rating: 0
  });

const eligibleSponsorships = sponsorships.filter(s => s.status === 'Aprovado' || s.status === 'Finalizado');
  const selectedItem = eligibleSponsorships.find(s => s.id === selectedId);

  useEffect(() => { if (preSelectedId) setSelectedId(preSelectedId); }, [preSelectedId]);

  useEffect(() => {
    if (selectedItem?.evaluation) {
      setForm(selectedItem.evaluation);
    } else {
      setForm({ internetCourtesyValue: '', leadsGenerated: '', salesClosed: '', actualAudience: '', brandScore: 0, cityImpactScore: 0, generalObservations: '', rating: 0 });
    }
  }, [selectedId, selectedItem]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedId) return alert("Selecione um patrocínio para avaliar.");
    if (form.rating === 0) return alert("Por favor, defina a nota geral final.");
    if (form.leadsGenerated === '' || form.salesClosed === '') return alert("Preencha os leads e vendas.");

    setLoading(true);
    try {
      await updateDoc(doc(db, "sponsorships", selectedId), {
        evaluation: form,
        status: 'Finalizado' 
      });
      if (window.showToast) window.showToast('Apuração salva com sucesso!', 'success');
      onSuccess(); 
    } catch (err) { alert("Erro ao salvar avaliação."); }
    setLoading(false);
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ background: 'var(--bg-panel)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={18} color={colors.primary} /> Selecione o Patrocínio para Apuração (ROI)
        </label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${selectedId ? colors.primary : 'var(--border)'}`, background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '15px', fontWeight: '800', outline: 'none', cursor: 'pointer' }}>
          <option value="">-- Escolha um evento na lista --</option>
          {eligibleSponsorships.map(s => (
            <option key={s.id} value={s.id}>{s.eventName} ({s.city}) - R$ {Number(s.investmentValue || 0).toLocaleString('pt-BR')}</option>
          ))}
        </select>
      </div>

      {selectedId && selectedItem && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
          
          {/* 🚀 SESSÃO 1: CUSTOS OCULTOS E PERMUTA */}
          {selectedItem.isExchange && (
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '25px', borderRadius: '20px', border: `1px solid ${colors.primary}40`, borderLeft: `4px solid ${colors.primary}` }}>
              <h4 style={{ margin: '0 0 15px', fontSize: '14px', fontWeight: '900', color: colors.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={18} /> Custo de Internet / Permuta
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>Este evento solicitou internet como permuta. Qual foi o custo real (ou valor de tabela) do link instalado?</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', maxWidth: '300px' }}>
                <DollarSign size={18} color="var(--text-muted)" />
                <input type="number" min="0" value={form.internetCourtesyValue} onChange={e => setForm({...form, internetCourtesyValue: e.target.value})} placeholder="Valor em R$" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', width: '100%' }} />
              </div>
            </div>
          )}

          {/* SESSÃO 2: KPIs */}
          <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '900', color: colors.success, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} /> Métricas de Conversão (Retorno Real)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Leads Gerados</label><input type="number" min="0" value={form.leadsGenerated} onChange={e => setForm({...form, leadsGenerated: e.target.value})} placeholder="Ex: 150" style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '16px', fontWeight: '900', outline: 'none' }} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Vendas Fechadas (Gross)</label><input type="number" min="0" value={form.salesClosed} onChange={e => setForm({...form, salesClosed: e.target.value})} placeholder="Ex: 12" style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '16px', fontWeight: '900', outline: 'none' }} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Público Real Atingido</label><input type="number" min="0" value={form.actualAudience} onChange={e => setForm({...form, actualAudience: e.target.value})} placeholder="Ex: 5000" style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '16px', fontWeight: '900', outline: 'none' }} /></div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '900', color: colors.warning, textTransform: 'uppercase' }}>Avaliação Qualitativa</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <StarRating value={form.brandScore} onChange={(val) => setForm({...form, brandScore: val})} label="Posicionamento da Marca" />
              <StarRating value={form.cityImpactScore} onChange={(val) => setForm({...form, cityImpactScore: val})} label="Impacto na Cidade" />
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              <label style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>Lições Aprendidas</label>
              <textarea value={form.generalObservations} onChange={e => setForm({...form, generalObservations: e.target.value})} placeholder="O patrocínio se pagou financeiramente? Vale a pena repetir?" style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
            <div style={{ textAlign: 'center', padding: '25px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '20px', border: `2px dashed ${colors.warning}` }}>
              <label style={{ fontSize: '16px', fontWeight: '900', color: colors.warning, display: 'block', marginBottom: '15px' }}>Nota Geral do Evento (Investimento x Retorno)</label>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (<Star key={star} size={48} fill={star <= form.rating ? colors.warning : "transparent"} color={star <= form.rating ? colors.warning : "var(--border)"} style={{ cursor: 'pointer' }} onClick={() => setForm({...form, rating: star})} />))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ background: colors.primary, color: '#fff', padding: '20px', fontSize: '16px', display: 'flex', justifyContent: 'center', gap: '10px', borderRadius: '16px', fontWeight: '900', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Consolidando...' : <><Save size={20} /> Consolidar Apuração Financeira e Comercial</>}
          </button>
        </form>
      )}
    </div>
  );
}