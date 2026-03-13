// ============================================================
//  sop/SopChannelMix.jsx — Oquei Gestão
//  Painel de Mix de Canais de Vendas + botão Publicar Cenário.
// ============================================================

import React from 'react';
import { PieChart, ChevronDown, Lock, Unlock, RefreshCcw } from 'lucide-react';
import { colors } from '../../../components/ui';

/**
 * Props:
 *   channels        — array de canais do Firestore
 *   channelMix      — { metasPorCanal, mix, originalGoals, dataSource }
 *   baseMetrics     — { metaBruta }
 *   distMethod      — método de distribuição selecionado
 *   onDistChange    — fn(newMethod)
 *   isLocked        — boolean
 *   savingLock      — boolean
 *   onPublish       — fn() — abre o confirm modal
 *   DIST_METHODS    — constante { AUTO, DIRETORIA, EQUAL }
 */
export function SopChannelMix({
  channels, channelMix, baseMetrics,
  distMethod, onDistChange,
  isLocked, savingLock, onPublish,
  DIST_METHODS,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* ── Mix de Canais ── */}
      <div style={{ background: 'var(--bg-card)', padding: '26px', borderRadius: '22px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontWeight: '900' }}>
            <PieChart size={19} color={colors.warning} /> Mix de Canais (Vendas)
          </h3>
          {/* Selector de método de distribuição */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={distMethod}
              onChange={e => onDistChange(e.target.value)}
              disabled={isLocked}
              style={{
                appearance: 'none', padding: '9px 32px 9px 13px',
                borderRadius: '10px', border: '1px solid var(--border)',
                background: 'var(--bg-app)', color: 'var(--text-main)',
                fontSize: '12px', fontWeight: '800', outline: 'none',
                cursor: isLocked ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              <option value={DIST_METHODS.AUTO}>Automático (Smart)</option>
              <option value={DIST_METHODS.DIRETORIA}>Metas da Diretoria</option>
              <option value={DIST_METHODS.EQUAL}>Igualitário</option>
            </select>
            <ChevronDown size={13} color="var(--text-muted)" style={{ position: 'absolute', right: '11px', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Lista de canais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {Object.keys(channelMix.metasPorCanal).length > 0 ? (
            Object.entries(channelMix.metasPorCanal).map(([canalId, valorSimulado]) => {
              const ch          = channels.find(c => c.id === canalId);
              const valorOriginal = Number(channelMix.originalGoals[canalId] ?? 0);
              const mixPct      = ((channelMix.mix[canalId] ?? 0) * 100).toFixed(1);
              const diff        = valorSimulado - valorOriginal;
              const barPct      = Math.min((valorSimulado / (baseMetrics.metaBruta || 1)) * 100, 100);

              return (
                <div key={canalId} style={{ paddingBottom: '14px', borderBottom: '1px dashed var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-main)' }}>
                        {ch?.name || canalId}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>
                        {mixPct}% do mix
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {distMethod === DIST_METHODS.DIRETORIA && valorOriginal > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>
                          Plano: {valorOriginal}
                        </div>
                      )}
                      <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)' }}>
                        {valorSimulado}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: colors.warning, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>

                  {/* Delta vs plano */}
                  {distMethod === DIST_METHODS.DIRETORIA && valorOriginal > 0 && (
                    <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: '900', color: diff >= 0 ? colors.success : colors.danger, marginTop: '5px' }}>
                      {diff >= 0 ? `+${diff}` : diff} vs plano
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '800' }}>
              Nenhum dado disponível para o método selecionado.
            </div>
          )}
        </div>

        {/* Fonte dos dados */}
        <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '900', background: 'var(--bg-app)', padding: '10px', borderRadius: '10px' }}>
          FONTE: {channelMix.dataSource.toUpperCase()}
        </div>
      </div>

      {/* ── Botão Publicar / Destravar ── */}
      <button
        onClick={onPublish}
        disabled={savingLock}
        style={{
          width: '100%',
          background: isLocked ? 'var(--bg-app)' : colors.success,
          color: isLocked ? 'var(--text-main)' : '#ffffff',
          border: isLocked ? '1px solid var(--border)' : 'none',
          padding: '18px', borderRadius: '16px', fontWeight: '900',
          cursor: savingLock ? 'not-allowed' : 'pointer',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px',
          fontSize: '15px',
          boxShadow: isLocked ? 'none' : `0 8px 24px ${colors.success}38`,
          transition: 'all 0.2s ease',
        }}
        onMouseOver={e => { if (!isLocked && !savingLock) e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseOut={e =>  { if (!isLocked && !savingLock) e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {savingLock
          ? <><RefreshCcw size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
          : isLocked
            ? <><Unlock size={18} /> Destravar Edição do Cenário</>
            : <><Lock size={18} /> Salvar e Publicar Cenário S&OP</>
        }
      </button>
    </div>
  );
}