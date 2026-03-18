// ============================================================
//  LinksUteis.jsx — Painel Growth Team
//  Links dinâmicos com persistência no Firestore
//  Qualquer usuário autenticado pode inserir ou deletar
// ============================================================

import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Globe, Zap, PhoneCall, BarChart3, Database, FileText, Monitor, Video, Shield, Users, Link as LinkIcon, BookOpen, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Card, Btn, Input, Modal, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

const ICON_MAP = {
  Globe:     { icon: Globe,     color: '#0ea5e9', label: 'Globe'     },
  Zap:       { icon: Zap,       color: '#f59e0b', label: 'Raio'      },
  PhoneCall: { icon: PhoneCall, color: '#2563eb', label: 'Telefone'  },
  BarChart3: { icon: BarChart3, color: '#db2777', label: 'Gráfico'   },
  Database:  { icon: Database,  color: '#7c3aed', label: 'Database'  },
  FileText:  { icon: FileText,  color: '#64748b', label: 'Documento' },
  Monitor:   { icon: Monitor,   color: '#10b981', label: 'Monitor'   },
  Video:     { icon: Video,     color: '#ef4444', label: 'Vídeo'     },
  Shield:    { icon: Shield,    color: '#ea580c', label: 'Segurança' },
  Users:     { icon: Users,     color: '#4f46e5', label: 'Pessoas'   },
  BookOpen:  { icon: BookOpen,  color: '#0284c7', label: 'Manual'    },
  Link:      { icon: LinkIcon,  color: '#94a3b8', label: 'Link'      },
};

const BASE_LINKS = [
  { id: 'b1', title: 'Integrador Oquei',   description: 'Sistemas e ferramentas internas.',  url: 'https://integrador.oquei.com.br/login', iconName: 'Zap',       isBase: true },
  { id: 'b2', title: 'Painel Analítica 3M', description: 'Dashboards de performance.',        url: 'https://oquei.analitica3m.com.br/',      iconName: 'BarChart3', isBase: true },
  { id: 'b3', title: 'Wiki Oquei',          description: 'Base de conhecimento e manuais.',   url: 'http://wiki.oquei.com.br/',              iconName: 'Globe',     isBase: true },
  { id: 'b4', title: 'Ponto Sólides',       description: 'Portal do colaborador e RH.',       url: 'https://app.solides.com.br/',            iconName: 'Users',     isBase: true },
];

function LinkCard({ link, onDelete }) {
  const [hover, setHover] = useState(false);
  const cfg = ICON_MAP[link.iconName] || ICON_MAP.Link;
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
        <div style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '14px' }}>{link.title}</div>
        {link.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.description}</div>}
        {link.addedBy && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Adicionado por {link.addedBy}</div>}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Btn size="sm" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ExternalLink size={13} /> Abrir</Btn>
        </a>
        {!link.isBase && (
          <Btn size="sm" variant="danger" onClick={() => onDelete(link.id)} title="Remover"><Trash2 size={13} /></Btn>
        )}
      </div>
    </div>
  );
}

export default function LinksUteis({ userData }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', description: '', iconName: 'Globe' });

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'useful_links'), orderBy('createdAt', 'desc')));
      setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const handleAdd = async () => {
    if (!form.title.trim()) { window.showToast?.('Informe o título.', 'error'); return; }
    if (!form.url.trim())   { window.showToast?.('Informe a URL.', 'error'); return; }
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`;
    setSaving(true);
    try {
      await addDoc(collection(db, 'useful_links'), {
        title: form.title.trim(), url, description: form.description.trim(),
        iconName: form.iconName, addedBy: userData?.name || 'Growth Team',
        addedById: auth?.currentUser?.uid, createdAt: serverTimestamp(),
      });
      setForm({ title: '', url: '', description: '', iconName: 'Globe' });
      setModalOpen(false);
      window.showToast?.('Link adicionado!', 'success');
      fetchLinks();
    } catch { window.showToast?.('Erro ao salvar.', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este link?')) return;
    try { await deleteDoc(doc(db, 'useful_links', id)); fetchLinks(); window.showToast?.('Removido.', 'success'); }
    catch { window.showToast?.('Erro ao remover.', 'error'); }
  };

  const S = { input: { padding: '11px 13px', borderRadius: '9px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-input, var(--bg-app))', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' } };

  return (
    <div style={global.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={global.pageTitle}>Links Úteis</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: '500' }}>Qualquer membro do time pode adicionar links.</p>
        </div>
        <Btn onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={15} /> Adicionar Link</Btn>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...BASE_LINKS, ...links].map(link => <LinkCard key={link.id} link={link} onDelete={handleDelete} />)}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar Novo Link">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Título *</label>
            <input style={S.input} placeholder="Ex: Sistema de CRM" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>URL *</label>
            <input style={S.input} placeholder="https://..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</label>
            <input style={S.input} placeholder="Breve descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ícone</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(ICON_MAP).map(([key, cfg]) => {
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
            <Btn onClick={handleAdd} loading={saving}>Salvar Link</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
