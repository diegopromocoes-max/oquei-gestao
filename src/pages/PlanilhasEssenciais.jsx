// ============================================================
//  PlanilhasEssenciais.jsx — Painel Growth Team
//  Links de planilhas com persistência no Firestore
//  Qualquer usuário autenticado pode inserir ou deletar
// ============================================================

import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { FileSpreadsheet, ExternalLink, Plus, Trash2, Table2, BarChart2, ClipboardList, Calculator, FileText, Target } from 'lucide-react';
import { Btn, Modal, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

// ── Ícones de planilha ────────────────────────────────────────
const SHEET_ICONS = {
  FileSpreadsheet: { icon: FileSpreadsheet, color: '#10b981', label: 'Planilha'    },
  Table2:          { icon: Table2,          color: '#0ea5e9', label: 'Tabela'      },
  BarChart2:       { icon: BarChart2,       color: '#f59e0b', label: 'Gráfico'     },
  ClipboardList:   { icon: ClipboardList,   color: '#7c3aed', label: 'Lista'       },
  Calculator:      { icon: Calculator,      color: '#2563eb', label: 'Calculadora' },
  FileText:        { icon: FileText,        color: '#64748b', label: 'Documento'   },
  Target:          { icon: Target,          color: '#ef4444', label: 'Meta'        },
};

// Planilhas base fixas
const BASE_SHEETS = [
  { id: 'bs1', title: 'Planilha de Metas',         description: 'Controle mensal de metas por cidade.',   url: '#', iconName: 'Target',          isBase: true },
  { id: 'bs2', title: 'Relatório de Performance',  description: 'Resultados comerciais consolidados.',    url: '#', iconName: 'BarChart2',        isBase: true },
  { id: 'bs3', title: 'Controle de Ações Growth',  description: 'Tracking de ações e campanhas.',         url: '#', iconName: 'ClipboardList',    isBase: true },
];

// ── Card de planilha ──────────────────────────────────────────
function SheetCard({ sheet, onDelete }) {
  const [hover, setHover] = useState(false);
  const cfg = SHEET_ICONS[sheet.iconName] || SHEET_ICONS.FileSpreadsheet;
  const Icon = cfg.icon;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--bg-card)', border: `1px solid ${hover ? cfg.color : 'var(--border)'}`,
        borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px',
        transition: 'all 0.18s ease', boxShadow: hover ? `0 4px 16px ${cfg.color}22` : 'var(--shadow-sm)',
      }}
    >
      <div style={{ width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '14px' }}>{sheet.title}</div>
        {sheet.description && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sheet.description}
          </div>
        )}
        {sheet.addedBy && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Adicionado por {sheet.addedBy}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {sheet.url && sheet.url !== '#' ? (
          <a href={sheet.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Btn size="sm" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ExternalLink size={13} /> Abrir
            </Btn>
          </a>
        ) : (
          <Btn size="sm" variant="secondary" disabled style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ExternalLink size={13} /> Abrir
          </Btn>
        )}
        {!sheet.isBase && (
          <Btn size="sm" variant="danger" onClick={() => onDelete(sheet.id)} title="Remover">
            <Trash2 size={13} />
          </Btn>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function PlanilhasEssenciais({ userData }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', description: '', iconName: 'FileSpreadsheet' });

  const S = { input: { padding: '11px 13px', borderRadius: '9px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-input, var(--bg-app))', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' } };

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'essential_sheets'), orderBy('createdAt', 'desc')));
      setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchSheets(); }, []);

  const handleAdd = async () => {
    if (!form.title.trim()) { window.showToast?.('Informe o título.', 'error'); return; }
    if (!form.url.trim())   { window.showToast?.('Informe a URL.', 'error'); return; }
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`;
    setSaving(true);
    try {
      await addDoc(collection(db, 'essential_sheets'), {
        title: form.title.trim(), url, description: form.description.trim(),
        iconName: form.iconName, addedBy: userData?.name || 'Growth Team',
        addedById: auth?.currentUser?.uid, createdAt: serverTimestamp(),
      });
      setForm({ title: '', url: '', description: '', iconName: 'FileSpreadsheet' });
      setModalOpen(false);
      window.showToast?.('Planilha adicionada!', 'success');
      fetchSheets();
    } catch { window.showToast?.('Erro ao salvar.', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta planilha?')) return;
    try {
      await deleteDoc(doc(db, 'essential_sheets', id));
      window.showToast?.('Removido.', 'success');
      fetchSheets();
    } catch { window.showToast?.('Erro ao remover.', 'error'); }
  };

  return (
    <div style={global.container}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={global.pageTitle}>Planilhas Essenciais</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: '500' }}>
            Acesse as planilhas do time. Qualquer membro pode adicionar ou remover.
          </p>
        </div>
        <Btn onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} /> Adicionar Planilha
        </Btn>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...BASE_SHEETS, ...sheets].map(s => <SheetCard key={s.id} sheet={s} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Modal adicionar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar Nova Planilha">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Título *</label>
            <input style={S.input} placeholder="Ex: Planilha de Metas Q2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>URL (Google Sheets, Excel Online...) *</label>
            <input style={S.input} placeholder="https://docs.google.com/spreadsheets/..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</label>
            <input style={S.input} placeholder="Para que serve esta planilha?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ícone</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(SHEET_ICONS).map(([key, cfg]) => {
                const Icon = cfg.icon; const sel = form.iconName === key;
                return (
                  <button key={key} onClick={() => setForm({ ...form, iconName: key })} title={cfg.label} style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', background: sel ? `${cfg.color}22` : 'var(--bg-app)', outline: sel ? `2px solid ${cfg.color}` : '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    <Icon size={16} color={cfg.color} />
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={handleAdd} loading={saving}>Salvar Planilha</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
