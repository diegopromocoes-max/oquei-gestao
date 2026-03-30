import React, { useState } from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import { Card, colors } from '../../components/ui';
import { buildStrategicAiPrompt } from '../lib/analysisResults';

function renderMarkdown(text) {
  return text.split('\n').map((line, index) => {
    const bold = line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    if (/^\*\*\d/.test(line) || /^##/.test(line)) {
      const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      return <div key={index} style={{ fontWeight: '900', fontSize: '13px', color: colors.primary, marginTop: '14px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{clean}</div>;
    }
    if (/^[-•]/.test(line)) {
      return (
        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '5px', fontSize: '13px', paddingLeft: '8px' }}>
          <span style={{ color: colors.primary, flexShrink: 0 }}>→</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•]\s*/, '').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>') }} />
        </div>
      );
    }
    if (!line.trim()) return <div key={index} style={{ height: '6px' }} />;
    return <div key={index} style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.65, marginBottom: '3px' }} dangerouslySetInnerHTML={{ __html: bold }} />;
  });
}

export default function StrategicAiCard({
  market,
  opData,
  relatedPlans,
  survey,
  selectedThemeLabel,
  selectedVersion,
  selectedMonth,
  filteredCount,
  totalCount,
}) {
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const runAi = async () => {
    const key = import.meta.env?.VITE_GEMINI_API_KEY || '';
    if (!key) {
      setAiError('VITE_GEMINI_API_KEY não configurada');
      return;
    }
    if (!market) {
      setAiError('Selecione uma pesquisa com dados.');
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiInsights('');

    const prompt = buildStrategicAiPrompt({
      market,
      opData,
      relatedPlans,
      survey,
      selectedThemeLabel,
      selectedVersion,
      selMonth: selectedMonth,
      filteredCount,
      totalCount,
    });

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 2500 },
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        setAiError(error?.error?.message || String(res.status));
        setAiLoading(false);
        return;
      }

      const data = await res.json();
      setAiInsights(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
    } catch (error) {
      setAiError(error.message);
    }

    setAiLoading(false);
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `linear-gradient(135deg,${colors.warning},${colors.danger})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightbulb size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: '900', fontSize: '15px', color: 'var(--text-main)' }}>Análise Estratégica — IA</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Diagnóstico, ranking de ataque e scripts de abordagem</div>
          </div>
        </div>

        <button
          onClick={runAi}
          disabled={aiLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '11px', border: 'none', background: `linear-gradient(135deg,${colors.warning},${colors.danger})`, color: '#fff', fontWeight: '900', fontSize: '13px', cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.7 : 1, boxShadow: `0 4px 14px ${colors.warning}44` }}
        >
          {aiLoading ? <><Zap size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Analisando...</> : <><Zap size={14} /> {aiInsights ? 'Reanalisar' : 'Gerar Análise'}</>}
        </button>
      </div>

      {aiError && <div style={{ background: `${colors.danger}10`, border: `1px solid ${colors.danger}30`, borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '13px', color: colors.danger, fontWeight: '700' }}>{aiError}</div>}

      {!aiInsights && !aiLoading && (
        <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '12px' }}>
          <Lightbulb size={28} style={{ opacity: 0.2, marginBottom: '10px' }} />
          <div style={{ fontWeight: '800', marginBottom: '4px' }}>Análise ainda não gerada</div>
          <div style={{ fontSize: '13px' }}>Clique em &quot;Gerar Análise&quot; para diagnóstico, ranking de ataque e scripts de abordagem por concorrente.</div>
        </div>
      )}

      {aiInsights && (
        <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', lineHeight: 1.6 }}>
          {renderMarkdown(aiInsights)}
        </div>
      )}

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </Card>
  );
}
