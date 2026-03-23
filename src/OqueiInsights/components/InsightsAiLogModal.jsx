import React, { useMemo, useState } from 'react';
import { Download, X, Zap } from 'lucide-react';

function scoreColor(score) {
  if (score >= 9) return '#ef4444';
  if (score >= 7) return '#f59e0b';
  if (score >= 4) return '#3b82f6';
  return '#64748b';
}

function scoreLabel(score) {
  if (score >= 9) return 'Muito Quente';
  if (score >= 7) return 'Quente';
  if (score >= 4) return 'Morno';
  return 'Frio';
}

function logColor(type) {
  return {
    success: '#10b981',
    error: '#ef4444',
    warn: '#f59e0b',
    info: 'var(--text-muted)',
    divider: 'var(--border)',
  }[type] || 'var(--text-muted)';
}

export default function InsightsAiLogModal({ log, aiScores, responses, survey, onClose }) {
  const [tab, setTab] = useState('log');

  const quentes = useMemo(
    () => Object.entries(aiScores || {})
      .map(([id, score]) => ({ id, ...score, response: (responses || []).find((item) => item.id === id) }))
      .filter((item) => item.score >= 7)
      .sort((a, b) => b.score - a.score),
    [aiScores, responses],
  );

  const exportLeads = () => {
    const rows = [['Score', 'Temperatura', 'Nome', 'Cidade', 'Numero', 'Motivo']];
    quentes.forEach((item) => {
      rows.push([
        item.score,
        scoreLabel(item.score),
        item.response?.researcherName || '',
        item.response?.city || '',
        item.response?.numero || '',
        item.motivo || '',
      ]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'leads-quentes.csv';
    link.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px #f59e0b44' }}>
                <Zap size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: '900', fontSize: '17px', color: 'var(--text-main)' }}>Relatorio da IA</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {survey?.title || 'Pesquisa'} · {Object.keys(aiScores || {}).length} respondentes · {quentes.length} lead(s) quente(s)
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Muito quentes', value: Object.values(aiScores || {}).filter((item) => item.score >= 9).length, color: '#ef4444' },
              { label: 'Quentes', value: Object.values(aiScores || {}).filter((item) => item.score >= 7 && item.score < 9).length, color: '#f59e0b' },
              { label: 'Mornos', value: Object.values(aiScores || {}).filter((item) => item.score >= 4 && item.score < 7).length, color: '#3b82f6' },
              { label: 'Frios', value: Object.values(aiScores || {}).filter((item) => item.score < 4).length, color: '#64748b' },
            ].map((item) => (
              <div key={item.label} style={{ background: 'var(--bg-app)', border: `1px solid ${item.color}30`, borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-panel)', borderRadius: '10px', padding: '3px' }}>
            {[
              { id: 'log', label: 'Log de execucao' },
              { id: 'leads', label: `Leads quentes (${quentes.length})` },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px', background: tab === item.id ? 'var(--bg-card)' : 'transparent', color: tab === item.id ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: tab === item.id ? 'var(--shadow-sm)' : 'none' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px 24px' }}>
          {tab === 'log' && (
            <div style={{ fontFamily: 'monospace', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {(log || []).map((entry, index) => (
                <div key={`${entry.time || 'log'}-${index}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '4px 0', borderBottom: entry.type === 'divider' ? '1px solid var(--border)' : 'none' }}>
                  {entry.type !== 'divider' && <span style={{ color: 'var(--text-muted)', opacity: 0.6, flexShrink: 0, fontSize: '10px', marginTop: '1px' }}>{entry.time}</span>}
                  <span style={{ color: logColor(entry.type), lineHeight: 1.5 }}>{entry.msg}</span>
                </div>
              ))}
              {!(log || []).length && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhum log disponivel.</div>}
            </div>
          )}

          {tab === 'leads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                <button onClick={exportLeads} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                  <Download size={11} /> Exportar CSV
                </button>
              </div>

              {!quentes.length && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum lead quente encontrado.</div>
              )}

              {quentes.map((item) => {
                const response = item.response;
                return (
                  <div key={item.id} style={{ background: 'var(--bg-app)', border: `1px solid ${scoreColor(item.score)}30`, borderLeft: `4px solid ${scoreColor(item.score)}`, borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${scoreColor(item.score)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px', color: scoreColor(item.score) }}>
                          {item.score}
                        </div>
                        <div>
                          <div style={{ fontWeight: '900', fontSize: '14px', color: 'var(--text-main)' }}>{response?.researcherName || 'Pesquisador'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {response?.city && <span>{response.city}</span>}
                            {response?.numero && <span>#{response.numero}</span>}
                            {response?.timestamp?.toDate && <span>{response.timestamp.toDate().toLocaleDateString('pt-BR')}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ background: `${scoreColor(item.score)}20`, color: scoreColor(item.score), borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: '900' }}>
                          {scoreLabel(item.score)}
                        </span>
                        {item.motivo && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{item.motivo}"</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
