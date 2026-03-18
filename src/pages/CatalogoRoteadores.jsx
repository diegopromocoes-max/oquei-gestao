// ============================================================
//  CatalogoRoteadores.jsx — Oquei Gestão
//  Catálogo de equipamentos homologados.
//  Padrão: Card/Btn/Modal/Input/Select/Tabs do ui.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import {
  Router, Search, Plus, AlertTriangle,
  CheckCircle2, Wifi, Cpu, Edit, Trash2, Image as ImageIcon,
  ShieldCheck, AlertOctagon,
} from 'lucide-react';
import { Card, Btn, Modal, Input, Select, Tabs, InfoBox, Empty, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

// ─── Helpers de status ────────────────────────────────────────────────────────
const STATUS_COLOR = (s) => {
  if (s === 'Apto para Uso' || s === 'Recomendado') return colors.success;
  if (s === 'Troca Recomendada') return colors.warning;
  if (s === 'Troca Obrigatória') return colors.danger;
  return colors.neutral;
};

const STATUS_ICON = (s) => {
  if (s === 'Apto para Uso' || s === 'Recomendado') return <ShieldCheck size={18} color={colors.success} />;
  if (s === 'Troca Recomendada') return <AlertTriangle size={18} color={colors.warning} />;
  if (s === 'Troca Obrigatória') return <AlertOctagon size={18} color={colors.danger} />;
  return <AlertTriangle size={18} color={colors.neutral} />;
};

const emptyForm = () => ({ model: '', brand: '', tech: 'Wi-Fi 5 (Dual Band)', status: 'Apto para Uso', notes: '', photoUrl: '' });

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CatalogoRoteadores({ userData }) {
  const [equipments,  setEquipments]  = useState([]);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [activeTab,   setActiveTab]   = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [formData,    setFormData]    = useState(emptyForm());

  // ── Dados (onSnapshot — catálogo em tempo real) ──────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'router_catalog'), orderBy('brand', 'asc')),
      (snap) => { setEquipments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd = () => { setFormData(emptyForm()); setEditingId(null); setIsModalOpen(true); };

  const openEdit = (eq) => {
    const safeStatus = eq.status === 'Recomendado' ? 'Apto para Uso' : eq.status;
    setFormData({ model: eq.model || '', brand: eq.brand || '', tech: eq.tech || 'Wi-Fi 5 (Dual Band)', status: safeStatus || 'Troca Recomendada', notes: eq.notes || '', photoUrl: eq.photoUrl || '' });
    setEditingId(eq.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.brand.trim() || !formData.model.trim()) {
      window.showToast?.('Informe marca e modelo.', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, updatedAt: new Date().toISOString(), author: userData?.name || 'Gestor' };
      if (editingId) {
        await updateDoc(doc(db, 'router_catalog', editingId), payload);
      } else {
        await addDoc(collection(db, 'router_catalog'), { ...payload, createdAt: new Date().toISOString() });
      }
      setIsModalOpen(false);
      setEditingId(null);
      window.showToast?.(editingId ? 'Equipamento atualizado!' : 'Equipamento adicionado!', 'success');
    } catch (err) { window.showToast?.('Erro ao salvar.', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id, model) => {
    if (!window.confirm(`Excluir o roteador ${model}?`)) return;
    try {
      await deleteDoc(doc(db, 'router_catalog', id));
      window.showToast?.('Equipamento excluído.', 'success');
    } catch { window.showToast?.('Erro ao excluir.', 'error'); }
  };

  // ── Filtro ──────────────────────────────────────────────────────────────────
  const filtered = equipments.filter(eq => {
    const isApto = eq.status === 'Apto para Uso' || eq.status === 'Recomendado';
    const isObs  = eq.status === 'Troca Recomendada' || eq.status === 'Troca Obrigatória';
    const matchSearch = (eq.model || '').toLowerCase().includes(searchTerm.toLowerCase())
                     || (eq.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTab = activeTab === 'Todos' ? true : activeTab === 'Aptos' ? isApto : isObs;
    return matchSearch && matchTab;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={global.container}>

      {/* ── Cabeçalho padrão ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 18px ${colors.primary}55`,
          }}>
            <Router size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Catálogo de Equipamentos
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Roteadores homologados e tecnologias obsoletas · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <Btn onClick={openAdd}><Plus size={15} /> Novo Equipamento</Btn>
      </div>

      {/* ── Tabs + busca ── */}
      <Tabs tabs={['Todos', 'Aptos', 'Obsoletos']} active={activeTab} onChange={setActiveTab} />

      <div style={{ display: 'flex', gap: '16px', margin: '16px 0 24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Campo de busca */}
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar por marca ou modelo..."
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab === 'Obsoletos' && (
          <InfoBox type="warning">Equipamentos obsoletos devem ser agendados para troca nos clientes afetados.</InfoBox>
        )}
        {activeTab === 'Aptos' && (
          <InfoBox type="success">Equipamentos homologados. Não necessitam de substituição tecnológica.</InfoBox>
        )}
      </div>

      {/* ── Grid de cards ── */}
      {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando catálogo...</div>}

      {!loading && filtered.length === 0 && (
        <Empty icon="📡" title="Nenhum equipamento encontrado" description="Tente outro termo de busca ou adicione um novo equipamento." />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filtered.map(eq => {
          const sColor = STATUS_COLOR(eq.status);
          return (
            <div key={eq.id} style={{
              background: 'var(--bg-card)', borderRadius: '20px',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              borderTop: `4px solid ${sColor}`,
            }}>
              {/* Imagem */}
              {eq.photoUrl ? (
                <div style={{ width: '100%', height: '160px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', padding: '12px' }}>
                  <img src={eq.photoUrl} alt={eq.model} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ width: '100%', height: '160px', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', borderBottom: '1px solid var(--border)' }}>
                  <ImageIcon size={32} color="var(--text-muted)" />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>Sem Foto</span>
                </div>
              )}

              {/* Conteúdo */}
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '3px 8px', borderRadius: '6px' }}>
                    {eq.brand}
                  </span>
                  {STATUS_ICON(eq.status)}
                </div>

                <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '10px' }}>{eq.model}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Wifi size={13} /> {eq.tech}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Cpu size={13} /> Status: <strong style={{ color: sColor }}>{eq.status}</strong>
                  </div>
                </div>

                {eq.notes && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '12px', lineHeight: '1.5', flex: 1 }}>
                    {eq.notes}
                  </p>
                )}

                {/* Ações */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <Btn variant="secondary" size="sm" onClick={() => openEdit(eq)} style={{ flex: 1 }}>
                    <Edit size={13} /> Editar
                  </Btn>
                  <Btn variant="danger" size="sm" onClick={() => handleDelete(eq.id, eq.model)}>
                    <Trash2 size={13} />
                  </Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal adicionar / editar ── */}
      <Modal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingId(null); }}
        title={editingId ? 'Editar Equipamento' : 'Novo Equipamento'}
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>Cancelar</Btn>
            <Btn loading={saving} onClick={handleSave}>{editingId ? 'Salvar Alterações' : 'Adicionar ao Catálogo'}</Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Preview da foto */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>URL da Foto</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="url"
                value={formData.photoUrl}
                onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                style={{ flex: 1, padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                placeholder="https://exemplo.com/foto.png"
              />
              {formData.photoUrl && (
                <img src={formData.photoUrl} alt="preview" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Marca" placeholder="Ex: TP-Link" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} required />
            <Input label="Modelo" placeholder="Ex: Archer C60" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Tecnologia / Wi-Fi"
              value={formData.tech}
              onChange={e => setFormData({ ...formData, tech: e.target.value })}
              options={['Wi-Fi 4 (2.4GHz) - Antigo', 'Wi-Fi 5 (Dual Band) - Padrão', 'Wi-Fi Gigabit', 'ONT GPON', 'Wi-Fi 6 (AX) - Premium']}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              options={['Apto para Uso', 'Troca Recomendada', 'Troca Obrigatória']}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Observações</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Condições do equipamento, restrições de uso..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}