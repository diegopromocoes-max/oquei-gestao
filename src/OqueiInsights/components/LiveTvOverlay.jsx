import React from 'react';
import { BellRing, Minimize2, Settings, ShieldCheck } from 'lucide-react';
import { formatRelativeTime } from '../lib/liveMonitor';

const glassCardStyle = {
  position: 'relative',
  zIndex: 1,
  borderRadius: '24px',
  background: 'linear-gradient(135deg, rgba(15,23,42,0.74), rgba(15,23,42,0.46))',
  border: '1px solid rgba(255,255,255,0.14)',
  WebkitBackdropFilter: 'blur(16px)',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 20px 60px rgba(2,6,23,0.28)',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  willChange: 'transform',
  contain: 'paint',
};

function OverlayButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(255,255,255,0.16)',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.82), rgba(30,41,59,0.58))',
        color: '#f8fafc',
        WebkitBackdropFilter: 'blur(14px)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 12px 30px rgba(2,6,23,0.24)',
        borderRadius: '18px',
        padding: '12px 14px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontWeight: '800',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

export default function LiveTvOverlay({
  overview,
  notifications,
  pendingAudit,
  questionKpis,
  onOpenAudit,
  onOpenConfig,
  onExitTvMode,
}) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1400,
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      pointerEvents: 'none',
      isolation: 'isolate',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...glassCardStyle, padding: '18px 20px', maxWidth: '720px', pointerEvents: 'auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '999px', background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.2)', color: '#67e8f9', fontSize: '11px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#10b981', boxShadow: '0 0 14px rgba(16,185,129,0.8)', animation: 'live-monitor-flash 1.25s ease-in-out infinite' }} />
            Modo TV ao vivo
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', marginTop: '14px', letterSpacing: '-0.03em' }}>Comando operacional em tempo real</div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '8px', lineHeight: 1.6 }}>
            {overview.selectedSurveyLabel} | {overview.selectedCityLabel} | {overview.selectedSourceLabel} | {overview.activeOnly ? 'somente sessoes ativas' : 'todas as sessoes'}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
            {[
              { label: 'Pesquisadores ao vivo', value: overview.onlineSessions, color: '#10b981' },
              { label: 'Coletas recentes', value: overview.recentResponses, color: '#38bdf8' },
              { label: 'Pendentes', value: overview.pendingAuditCount, color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '10px 12px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${item.color}36`, minWidth: '140px' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#f8fafc', marginTop: '4px' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', pointerEvents: 'auto' }}>
          <OverlayButton onClick={onOpenConfig}>
            <Settings size={16} /> KPIs
          </OverlayButton>
          <OverlayButton onClick={onExitTvMode}>
            <Minimize2 size={16} /> Sair do Modo TV
          </OverlayButton>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
        <div style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'auto' }}>
          <div style={{ ...glassCardStyle, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '13px', fontWeight: '900', marginBottom: '12px' }}>
              <BellRing size={16} color="#38bdf8" />
              Notificacoes de novas coletas
            </div>
            {!notifications.length ? (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>As novas entrevistas vao surgir aqui automaticamente.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenAudit?.(item.response)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '16px',
                      border: '1px solid rgba(56,189,248,0.18)',
                      background: 'linear-gradient(135deg, rgba(56,189,248,0.14), rgba(15,23,42,0.18))',
                      color: '#f8fafc',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '900' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>{item.subtitle}</div>
                    <div style={{ fontSize: '10px', color: '#7dd3fc', marginTop: '6px', fontWeight: '800' }}>Abrir para auditoria</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...glassCardStyle, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '13px', fontWeight: '900', marginBottom: '12px' }}>
              <ShieldCheck size={16} color="#f59e0b" />
              Auditoria pronta agora
            </div>
            {!pendingAudit.length ? (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Nenhuma coleta pendente dentro do recorte atual.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingAudit.slice(0, 4).map((response) => (
                  <button
                    key={response.id}
                    type="button"
                    onClick={() => onOpenAudit?.(response)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '16px',
                      border: '1px solid rgba(245,158,11,0.18)',
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(15,23,42,0.18))',
                      color: '#f8fafc',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '900' }}>{response.researcherName || 'Pesquisador'}</div>
                      <div style={{ fontSize: '10px', color: '#fde68a', fontWeight: '800' }}>{formatRelativeTime(response)}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      {response.cityName || response.city || response.cityId || 'Sem cidade'} | {response.surveyTitle || 'Pesquisa'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#fcd34d', marginTop: '6px', fontWeight: '800' }}>Abrir auditoria imediata</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...glassCardStyle, padding: '14px 16px', pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '900', color: '#f8fafc' }}>KPIs automaticos das respostas</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Rodape configuravel com leitura instantanea das perguntas selecionadas.</div>
          </div>
          <div style={{ fontSize: '11px', color: '#7dd3fc', fontWeight: '800' }}>Atualizacao continua conforme novas coletas chegam</div>
        </div>

        {!questionKpis.length ? (
          <div style={{ padding: '16px', borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.18)', color: '#94a3b8', fontSize: '12px' }}>
            Nenhum KPI configurado. Use o botao de configuracao para escolher perguntas do rodape.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
            {questionKpis.map((item) => (
              <div key={item.key} style={{ padding: '14px', borderRadius: '18px', border: `1px solid ${item.tone}36`, background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.typeLabel}</div>
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#f8fafc', marginTop: '6px', minHeight: '34px' }}>{item.label}</div>
                <div style={{ fontSize: '23px', fontWeight: '900', color: item.tone, marginTop: '10px', lineHeight: 1.05 }}>{item.value}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#e2e8f0', marginTop: '8px', lineHeight: 1.35, paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>{item.helper}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
