import { CheckCircle2, ChevronRight, MapPin, ShieldAlert, Store, Tag, User, Zap } from 'lucide-react';

import { Btn, colors } from '../ui';

const SUMMARY_ICONS = {
  customer: User,
  city: Store,
  origin: Tag,
  product: Zap,
  status: ShieldAlert,
  location: MapPin,
};

function SummaryRow({ id, sectionId, label, value, helper, accent, kind, onJump }) {
  const Icon = SUMMARY_ICONS[kind] || CheckCircle2;

  return (
    <button
      type="button"
      onClick={() => onJump?.(sectionId || id)}
      style={{
        textAlign: 'left',
        width: '100%',
        display: 'grid',
        gap: '8px',
        padding: '14px 15px',
        borderRadius: '18px',
        border: '1px solid rgba(148,163,184,0.14)',
        background: 'rgba(255,255,255,0.04)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '12px',
              background: `${accent}20`,
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </div>
            <div style={{ marginTop: '2px', fontSize: '13px', fontWeight: 900, color: '#fff', lineHeight: 1.45 }}>
              {value}
            </div>
          </div>
        </div>

        <ChevronRight size={15} color="rgba(255,255,255,0.48)" />
      </div>

      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.66)', lineHeight: 1.5 }}>
        {helper}
      </div>
    </button>
  );
}

export default function LeadDraftSummary({
  items = [],
  readyToSave,
  missingEssentials = [],
  loading = false,
  onSubmit,
  onJumpToSection,
}) {
  return (
    <div
      style={{
        position: 'sticky',
        top: '22px',
        display: 'grid',
        gap: '16px',
        padding: '18px',
        borderRadius: '26px',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))',
        border: '1px solid rgba(148,163,184,0.16)',
        boxShadow: '0 24px 48px rgba(15,23,42,0.18)',
      }}
    >
      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <CheckCircle2 size={14} />
          Lead em construcao
        </div>
        <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
          {readyToSave ? 'Pronto para registrar' : 'Faltam dados essenciais'}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          {readyToSave
            ? 'O fluxo ja tem os dados obrigatorios para entrar no CRM. Voce ainda pode complementar os detalhes opcionais antes de salvar.'
            : 'Use o painel ao lado para preencher o minimo necessario e liberar o envio com seguranca.'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {items.map((item) => (
          <SummaryRow key={item.id} {...item} onJump={onJumpToSection} />
        ))}
      </div>

      {missingEssentials.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gap: '8px',
            padding: '14px 15px',
            borderRadius: '18px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.18)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 900, color: colors.danger, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pendencias para salvar
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 }}>
            {missingEssentials.join(' • ')}
          </div>
        </div>
      ) : null}

      <Btn
        onClick={onSubmit}
        loading={loading}
        style={{
          width: '100%',
          justifyContent: 'center',
          background: readyToSave ? colors.success : 'rgba(148,163,184,0.24)',
          color: '#fff',
          border: readyToSave ? 'none' : '1px solid rgba(148,163,184,0.22)',
          boxShadow: readyToSave ? '0 18px 34px rgba(16,185,129,0.28)' : 'none',
        }}
      >
        <CheckCircle2 size={16} /> {readyToSave ? 'Registrar lead agora' : 'Faltam dados essenciais'}
      </Btn>
    </div>
  );
}
