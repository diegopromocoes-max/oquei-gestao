// ============================================================
//  sop/SopInsightsBox.jsx — Oquei Gestão
//  Bloco de Análise de Viabilidade S&OP.
//  Duas abas: análise local (regras de negócio) + IA Gemini.
// ============================================================

import React, { useState, useCallback } from 'react';
import { Brain, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { colors } from '../../../components/ui';
import { StreamingText } from './SopComponents';

// ─── Constantes internas ──────────────────────────────────────────────────────
const ALERT_STYLES = {
  critical: { color: colors.danger,  bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'   },
  warning:  { color: colors.warning, bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)'  },
  info:     { color: colors.primary, bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)'  },
  success:  { color: colors.success, bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)'  },
};

const PRIO_COLOR = { alta: colors.danger, media: colors.warning, baixa: colors.success };

// ─── Componente ───────────────────────────────────────────────────────────────
/**
 * Props:
 *   baseMetrics      — objeto com métricas calculadas
 *   strategicMatrix  — objeto com quadrante, perfis e guidance
 *   localAlerts      — array de alertas gerados por regras
 *   cityData         — dados da cidade selecionada
 *   growthPercent    — % crescimento do slider
 *   churnPercent     — % churn do slider
 */
export function SopInsightsBox({
  baseMetrics, strategicMatrix, localAlerts,
  cityData, growthPercent, churnPercent,
}) {
  const [insightMode,  setInsightMode]  = useState('local'); // 'local' | 'ai'
  const [insightState, setInsightState] = useState('idle');  // 'idle' | 'loading' | 'done' | 'error'
  const [aiInsights,   setAiInsights]   = useState(null);
  const [insightError, setInsightError] = useState('');

  const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';

  // ── Gerar insights via Gemini ─────────────────────────────────────────────
  const handleGenerateInsights = useCallback(async () => {
    if (!baseMetrics || !strategicMatrix || !cityData) return;

    if (!GEMINI_API_KEY) {
      setInsightError('Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY no .env');
      setInsightState('error');
      return;
    }

    setInsightState('loading');
    setInsightError('');

    const prompt = `Analise os dados S&OP abaixo e retorne SOMENTE um JSON, sem texto extra.

Unidade: ${cityData.name || cityData.city}
Base: ${baseMetrics.baseInicial} clientes
Crescimento projetado: +${growthPercent.toFixed(1)}% (${baseMetrics.metaNet} clientes)
Churn projetado: ${churnPercent.toFixed(1)}% (${baseMetrics.expectedChurn} saídas)
Meta bruta: ${baseMetrics.metaBruta} vendas
Penetração: ${baseMetrics.penetration.toFixed(1)}%
Histórico crescimento: ${baseMetrics.avgNetPct.toFixed(2)}%
Histórico churn: ${baseMetrics.avgChurnPct.toFixed(2)}%
Tendência: ${baseMetrics.trendDirection}
Quadrante: ${strategicMatrix.strategicQuadrant}

Retorne exatamente este JSON com 3 insights curtos e acionáveis:
{"insights":[{"titulo":"string","analise":"string de 1 frase","acao":"string de 1 frase","prioridade":"alta|media|baixa","categoria":"crescimento|churn|mercado|operacional"}]}`;

    try {
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      if (candidate?.finishReason === 'MAX_TOKENS')
        throw new Error('Resposta cortada pelo limite de tokens. Tente novamente.');

      let clean = (candidate?.content?.parts?.[0]?.text || '').trim();
      if (clean.startsWith('"') || clean.startsWith('\\"')) {
        try { clean = JSON.parse(clean); } catch (_) {}
      }
      clean = clean.replace(/```json|```/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta.');
      clean = jsonMatch[0];
      // Fecha estruturas truncadas
      clean += ']'.repeat(Math.max(0, (clean.match(/\[/g)||[]).length - (clean.match(/\]/g)||[]).length));
      clean += '}'.repeat(Math.max(0, (clean.match(/\{/g)||[]).length - (clean.match(/\}/g)||[]).length));

      const parsed = JSON.parse(clean);
      if (!parsed.insights || !Array.isArray(parsed.insights))
        throw new Error('Formato inválido na resposta da IA.');

      const valid = parsed.insights.filter(i => i?.titulo && i?.analise);
      if (!valid.length) throw new Error('Nenhum insight válido retornado.');

      setAiInsights(valid);
      setInsightState('done');
    } catch (err) {
      console.error('Gemini insights error:', err);
      setInsightError(`Erro ao gerar insights: ${err.message}`);
      setInsightState('error');
    }
  }, [baseMetrics, strategicMatrix, cityData, growthPercent, churnPercent, GEMINI_API_KEY]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '22px', padding: '28px', border: '1px solid var(--border)' }}>

      {/* Header + abas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
          <Brain size={22} color={colors.purple} /> Análise de Viabilidade S&OP
        </h3>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-app)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
          {[
            { id: 'local', label: '📊 Sistema' },
            { id: 'ai',    label: '✨ IA Gemini' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setInsightMode(tab.id)}
              style={{
                padding: '7px 16px', borderRadius: '8px', border: 'none',
                fontSize: '12px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s',
                background: insightMode === tab.id ? 'var(--bg-card)' : 'transparent',
                color: insightMode === tab.id
                  ? (tab.id === 'ai' ? colors.purple : 'var(--text-main)')
                  : 'var(--text-muted)',
                boxShadow: insightMode === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Aba LOCAL ── */}
      {insightMode === 'local' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Quadrant badge */}
          <div style={{
            background: strategicMatrix.quadrantColor, color: '#ffffff',
            padding: '13px 20px', borderRadius: '12px', fontWeight: '900',
            fontSize: '14px', textAlign: 'center', letterSpacing: '0.04em',
          }}>
            {strategicMatrix.strategicQuadrant}
          </div>

          {/* Perfil cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'PERFIL DE MERCADO',  value: strategicMatrix.marketProfile      },
              { label: 'DESEMPENHO OP.',     value: strategicMatrix.operationalProfile  },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {localAlerts.map((a, i) => {
            const s = ALERT_STYLES[a.type];
            return (
              <div key={i} style={{ padding: '16px 18px', borderRadius: '14px', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <AlertCircle size={18} color={s.color} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: s.color, marginBottom: '5px' }}>{a.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.55' }}>{a.text}</div>
                </div>
              </div>
            );
          })}

          {/* Posicionamento executivo */}
          <div style={{
            padding: '14px 18px', background: 'var(--bg-app)', borderRadius: '12px',
            border: '1px solid var(--border)', borderLeft: `4px solid ${strategicMatrix.quadrantColor}`,
          }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
              POSICIONAMENTO EXECUTIVO
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {strategicMatrix.executivePositioning}
            </div>
          </div>
        </div>
      )}

      {/* ── Aba IA ── */}
      {insightMode === 'ai' && (
        <div>
          {/* IDLE */}
          {insightState === 'idle' && (
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.65' }}>
                A IA analisa os parâmetros configurados e gera 3 insights executivos específicos para esta unidade usando o Gemini.
              </p>
              <button
                onClick={handleGenerateInsights}
                style={{
                  background: colors.purple, color: '#ffffff', border: 'none',
                  padding: '15px 32px', borderRadius: '12px', fontSize: '15px',
                  fontWeight: '900', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  boxShadow: `0 6px 18px ${colors.purple}35`, transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${colors.purple}50`; }}
                onMouseOut={e =>  { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = `0 6px 18px ${colors.purple}35`;  }}
              >
                <Sparkles size={18} /> Gerar Insights com IA
              </button>
            </div>
          )}

          {/* LOADING */}
          {insightState === 'loading' && (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${colors.purple}25`, borderTopColor: colors.purple, animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)' }}>Analisando dados da unidade...</div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {insightState === 'error' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '18px', marginBottom: '18px', fontSize: '14px', color: colors.danger, fontWeight: '800', lineHeight: '1.5' }}>
                {insightError}
              </div>
              <button
                onClick={handleGenerateInsights}
                style={{ background: 'transparent', border: `1px solid ${colors.purple}`, color: colors.purple, padding: '11px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* DONE */}
          {insightState === 'done' && aiInsights && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ background: strategicMatrix.quadrantColor, color: '#ffffff', padding: '13px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', textAlign: 'center', marginBottom: '18px', letterSpacing: '0.04em' }}>
                {strategicMatrix.strategicQuadrant}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {aiInsights.map((insight, idx) => {
                  const pColor = PRIO_COLOR[insight.prioridade] ?? colors.purple;
                  return (
                    <div key={idx} style={{ background: 'var(--bg-app)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', borderLeft: `5px solid ${pColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1.35' }}>
                          <StreamingText text={insight.titulo} />
                        </div>
                        <div style={{ background: `${pColor}18`, borderRadius: '7px', padding: '4px 10px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: pColor, fontWeight: '900', textTransform: 'uppercase' }}>{insight.categoria}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.65', marginBottom: '12px', opacity: 0.85 }}>
                        {insight.analise}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '900', color: pColor, display: 'flex', alignItems: 'center', gap: '7px', background: `${pColor}10`, padding: '10px 14px', borderRadius: '10px' }}>
                        <ArrowRight size={14} /> {insight.acao}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button
                  onClick={() => { setInsightState('idle'); setAiInsights(null); }}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                  onMouseOut={e =>  e.currentTarget.style.background = 'transparent'}
                >
                  ↩ Gerar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}