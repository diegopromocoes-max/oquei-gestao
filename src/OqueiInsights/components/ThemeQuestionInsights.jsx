import React, { useMemo } from 'react';
import { Card, colors } from '../../components/ui';
import { questionMatchesTheme } from '../lib/strategicInsights';

function normalizeAnswer(answer) {
  if (Array.isArray(answer)) return answer.map((item) => String(item || '').trim()).filter(Boolean);
  if (answer === undefined || answer === null) return [];
  const text = String(answer).trim();
  return text ? [text] : [];
}

function summarizeAnswers(responses, questionId) {
  const counts = {};
  responses.forEach((response) => {
    normalizeAnswer(response.answers?.[questionId]).forEach((answer) => {
      counts[answer] = (counts[answer] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export default function ThemeQuestionInsights({ survey, responses, themeId, themeLabel }) {
  const themedQuestions = useMemo(
    () => (survey?.questions || []).filter((question) => questionMatchesTheme(question, themeId, survey)),
    [survey, themeId],
  );

  if (!survey) return null;

  return (
    <Card
      accent={colors.purple}
      title={themeId === 'all' ? 'Leituras por Pergunta' : `Leituras do Tema: ${themeLabel}`}
      subtitle={`${themedQuestions.length} pergunta(s) no recorte tematico`}
    >
      {!themedQuestions.length ? (
        <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nenhuma pergunta vinculada a este tema no questionario selecionado.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {themedQuestions.map((question) => {
            const summary = summarizeAnswers(responses, question.id);
            const total = summary.reduce((acc, item) => acc + item.count, 0);
            return (
              <div key={question.id} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.45 }}>{question.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>
                  {question.type} · {total} resposta(s)
                </div>
                {summary.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>Sem respostas registradas.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {summary.slice(0, 4).map((item) => {
                      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                      return (
                        <div key={item.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{item.label}</span>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: colors.purple }}>{pct}%</span>
                          </div>
                          <div style={{ height: '7px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: colors.purple, borderRadius: '999px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
