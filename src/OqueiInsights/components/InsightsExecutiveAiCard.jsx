import React, { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Btn, Card, colors } from '../../components/ui';

function compactText(value, max = 110) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function buildQuestionHighlights(analytics) {
  return (analytics?.questions || []).slice(0, 8).map((item) => {
    if (item.q?.type === 'nps') {
      return {
        pergunta: item.q.label,
        tipo: 'nps',
        total: item.total || 0,
        media: item.avg || '0.0',
        nps: item.nps ?? 0,
      };
    }

    return {
      pergunta: item.q?.label || 'Pergunta',
      tipo: item.q?.type || 'select',
      total: item.total || 0,
      topRespostas: (item.data || []).slice(0, 4).map((entry) => ({
        valor: entry.key,
        count: entry.count,
      })),
    };
  });
}

function buildTextSamples(responses, survey) {
  const textQuestions = (survey?.questions || []).filter((question) => question.type === 'text').slice(0, 4);

  return textQuestions.map((question) => ({
    pergunta: question.label,
    exemplos: (responses || [])
      .map((response) => compactText(response.answers?.[question.id], 140))
      .filter(Boolean)
      .slice(0, 6),
  })).filter((item) => item.exemplos.length > 0);
}

function parseJsonPayload(text) {
  const cleaned = String(text || '').trim().replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function getConfidenceTone(level) {
  if (level === 'alto') return colors.success;
  if (level === 'medio') return colors.warning;
  return colors.neutral;
}

function SectionList({ title, items, accent }) {
  if (!items?.length) return null;

  return (
    <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
      <div style={{ fontSize: '11px', fontWeight: '900', color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {items.map((item, index) => (
          <div key={`${title}-${index}`} style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.45 }}>
            {index + 1}. {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsExecutiveAiCard({
  resetKey,
  survey,
  responses,
  analytics,
  plans,
  metrics,
  cityRows,
  campaignRows,
  themeRows,
  selectedCityLabel,
  selectedThemeLabel,
  selectedVersionLabel,
  selectedPeriodLabel,
  onReportChange,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const questionHighlights = useMemo(() => buildQuestionHighlights(analytics), [analytics]);
  const textSamples = useMemo(() => buildTextSamples(responses, survey), [responses, survey]);
  const planHighlights = useMemo(() => (
    (plans || []).slice(0, 6).map((plan) => ({
      titulo: plan.title,
      status: plan.status,
      prioridade: plan.priority,
      impacto: compactText(plan.expectedImpact, 90),
      kpi: compactText(plan.measurementKpi, 70),
    }))
  ), [plans]);

  useEffect(() => {
    setError('');
    setReport(null);
    onReportChange?.(null);
  }, [onReportChange, resetKey]);

  const generateExecutiveReading = async () => {
    if (!responses?.length) {
      setError('Nao ha respostas auditadas no recorte atual para gerar leitura executiva.');
      return;
    }

    const geminiKey = import.meta.env?.VITE_GEMINI_API_KEY || '';
    if (!geminiKey) {
      setError('Chave Gemini nao encontrada. Adicione VITE_GEMINI_API_KEY no .env');
      return;
    }

    setLoading(true);
    setError('');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const promptPayload = {
      recorte: {
        pesquisa: survey?.title || 'Todas as pesquisas',
        objetivo: survey?.objective || 'Nao informado',
        gatilho: survey?.triggerLabel || survey?.trigger || 'Nao informado',
        cidade: selectedCityLabel,
        tema: selectedThemeLabel,
        versao: selectedVersionLabel,
        periodo: selectedPeriodLabel,
      },
      kpis: metrics,
      destaquesCidades: (cityRows || []).slice(0, 5),
      destaquesCampanhas: (campaignRows || []).slice(0, 5),
      destaquesTemas: (themeRows || []).slice(0, 5),
      perguntas: questionHighlights,
      amostrasTexto: textSamples,
      planosAtuais: planHighlights,
      base: {
        respostasAuditadas: responses.length,
        planosVinculados: plans?.length || 0,
      },
    };

    const prompt = `Voce e consultor de expansao comercial e inteligencia de mercado da Oquei Telecom.
Leia o contexto e retorne APENAS JSON valido no formato:
{
  "resumoExecutivo":"texto curto",
  "evidencias":["item","item"],
  "objecoesChave":["item","item"],
  "oportunidadesDeVenda":["item","item"],
  "canaisPrioritarios":["item","item"],
  "parceriasPatrocinios":["item","item"],
  "ajustesNosPlanos":["item","item"],
  "proximosPassos":["item","item"],
  "nivelConfianca":"alto|medio|baixo"
}
Regras:
- nao invente dados que nao estejam no contexto;
- diferencie leitura baseada em evidencia de hipotese;
- cada item de lista com ate 18 palavras;
- recomende acoes praticas para o analista e para a operacao;
- trate a IA como apoio consultivo, nunca como decisao automatica.
Contexto: ${JSON.stringify(promptPayload)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseJsonPayload(text);

      if (!parsed) {
        throw new Error('A IA nao retornou um JSON valido.');
      }

      const nextReport = {
        ...parsed,
        generatedAt: new Date().toISOString(),
        auditTrail: {
          model: 'gemini-2.5-flash',
          respostasAuditadas: responses.length,
          planosVinculados: plans?.length || 0,
          periodo: selectedPeriodLabel,
        },
      };

      setReport(nextReport);
      onReportChange?.(nextReport);
    } catch (err) {
      setError(err.message || 'Falha ao gerar leitura estrategica.');
      onReportChange?.(null);
    } finally {
      setLoading(false);
    }
  };

  const confidenceTone = getConfidenceTone(report?.nivelConfianca);

  return (
    <Card
      accent={colors.purple}
      title="IA Estrategica"
      subtitle="Leitura consultiva orientada a plano de acao e priorizacao"
      actions={(
        <Btn
          variant="secondary"
          size="sm"
          onClick={generateExecutiveReading}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {loading ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Gerando...</> : <><Sparkles size={13} /> Gerar leitura</>}
        </Btn>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        {[
          { label: 'Base auditada', value: responses?.length || 0, color: colors.primary },
          { label: 'Planos vinculados', value: plans?.length || 0, color: colors.success },
          { label: 'Cidades no recorte', value: metrics?.cities || 0, color: colors.info },
          { label: 'Temas ativos', value: metrics?.themes || 0, color: colors.purple },
        ].map((item) => (
          <div key={item.label} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: item.color, marginTop: '5px' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {[selectedCityLabel, selectedThemeLabel, selectedVersionLabel, selectedPeriodLabel].map((item) => (
          <span key={item} style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '999px', padding: '6px 10px' }}>
            {item}
          </span>
        ))}
      </div>

      <div style={{ padding: '12px 14px', borderRadius: '14px', border: `1px solid ${colors.purple}22`, background: `${colors.purple}08`, display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <ShieldCheck size={16} color={colors.purple} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
          A leitura abaixo e consultiva. Ela usa o recorte filtrado, rankings executivos e planos vinculados, mas nao altera indicadores oficiais nem status de auditoria.
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${colors.danger}30`, background: `${colors.danger}10`, color: colors.danger, fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>
          {error}
        </div>
      )}

      {!report ? (
        <div style={{ padding: '18px', borderRadius: '14px', border: '1px dashed var(--border)', background: 'var(--bg-app)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Clique em "Gerar leitura" para montar um parecer executivo com foco em objecoes, oportunidades, canais e ajustes de plano.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BrainCircuit size={16} color={colors.purple} />
                <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>Resumo executivo</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: confidenceTone, background: `${confidenceTone}12`, padding: '5px 9px', borderRadius: '999px' }}>
                Confianca {report.nivelConfianca || 'nao informada'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.55 }}>
              {report.resumoExecutivo || 'A IA nao retornou um resumo executivo.'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
              Gerado em {new Date(report.generatedAt || Date.now()).toLocaleString('pt-BR')} | Modelo {report.auditTrail?.model || 'Gemini'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <SectionList title="Evidencias" items={report.evidencias} accent={colors.primary} />
            <SectionList title="Objecoes chave" items={report.objecoesChave} accent={colors.danger} />
            <SectionList title="Oportunidades de venda" items={report.oportunidadesDeVenda} accent={colors.success} />
            <SectionList title="Canais prioritarios" items={report.canaisPrioritarios} accent={colors.info} />
            <SectionList title="Parcerias e patrocinio" items={report.parceriasPatrocinios} accent={colors.warning} />
            <SectionList title="Ajustes nos planos" items={report.ajustesNosPlanos} accent={colors.purple} />
            <SectionList title="Proximos passos" items={report.proximosPassos} accent={colors.neutral} />
          </div>
        </div>
      )}
    </Card>
  );
}
