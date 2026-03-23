import React from 'react';
import { Download, HardDriveDownload, ShieldAlert } from 'lucide-react';
import { colors } from '../../components/ui';

function formatDateTime(value) {
  if (!value) return 'Nenhum backup salvo ainda';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Nenhum backup salvo ainda';
  return parsed.toLocaleString('pt-BR');
}

export default function SurveyBackupCard({
  summary,
  onExport,
  title = 'Backups locais',
  subtitle = 'Os questionarios enviados por este link ficam guardados neste aparelho para exportacao e contingencia.',
}) {
  if (!summary?.storageAvailable) {
    return (
      <div
        style={{
          borderRadius: '14px',
          border: `1px solid ${colors.warning}30`,
          background: `${colors.warning}10`,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        <ShieldAlert size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: '900', color: colors.warning }}>Backup local indisponivel</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
            Este navegador nao permite armazenamento local. Os backups precisam ser feitos em outro dispositivo.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(16,185,129,0.06))',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDriveDownload size={15} color={colors.primary} />
            <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{title}</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
            {subtitle}
          </div>
        </div>

        <button
          onClick={onExport}
          disabled={!summary.total}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '10px',
            border: `1px solid ${summary.total ? `${colors.primary}40` : 'var(--border)'}`,
            background: summary.total ? `${colors.primary}10` : 'var(--bg-panel)',
            color: summary.total ? colors.primary : 'var(--text-muted)',
            fontWeight: '800',
            fontSize: '12px',
            cursor: summary.total ? 'pointer' : 'not-allowed',
          }}
        >
          <Download size={13} />
          Exportar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
        <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginTop: '4px' }}>{summary.total}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pendentes</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: colors.warning, marginTop: '4px' }}>{summary.pending}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sincronizados</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: colors.success, marginTop: '4px' }}>{summary.synced}</div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Ultimo backup: <strong style={{ color: 'var(--text-main)' }}>{formatDateTime(summary.lastSavedAt)}</strong>
      </div>
    </div>
  );
}
