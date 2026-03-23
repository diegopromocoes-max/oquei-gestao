import React, { useMemo, useState } from 'react';
import { BookMarked, Layers3, ListChecks, Plus, Power, Sparkles } from 'lucide-react';
import { Badge, Btn, Card, colors } from '../../components/ui';
import { QUESTION_TYPES } from '../lib/surveyQuestions';

const emptyQuestionForm = {
  themeId: '',
  label: '',
  type: 'boolean',
  optionsText: '',
  isCore: true,
  guidance: '',
};

export default function InsightsKnowledgeBase({
  themes,
  questionBank,
  savingTheme,
  savingQuestion,
  onCreateTheme,
  onCreateQuestion,
  onToggleThemeStatus,
  onToggleQuestionStatus,
}) {
  const [themeForm, setThemeForm] = useState({ name: '', description: '' });
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);

  const activeThemes = useMemo(
    () => themes.filter((theme) => theme.status !== 'inactive'),
    [themes],
  );
  const latestQuestions = useMemo(() => questionBank.slice(0, 8), [questionBank]);

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: '9px',
    border: '1px solid var(--border)',
    outline: 'none',
    fontSize: '13px',
    color: 'var(--text-main)',
    background: 'var(--bg-app)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const handleCreateTheme = async () => {
    const created = await onCreateTheme(themeForm);
    if (created) setThemeForm({ name: '', description: '' });
  };

  const handleCreateQuestion = async () => {
    const created = await onCreateQuestion(questionForm);
    if (created) setQuestionForm(emptyQuestionForm);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.3fr)', gap: '16px' }}>
      <Card accent={colors.primary} title="Temas Estrategicos" subtitle="Organize os eixos que a empresa quer observar em cada cidade.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: `${colors.primary}10`, border: `1px solid ${colors.primary}20` }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: colors.primary, textTransform: 'uppercase' }}>Temas ativos</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: colors.primary }}>{activeThemes.length}</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: `${colors.purple}10`, border: `1px solid ${colors.purple}20` }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: colors.purple, textTransform: 'uppercase' }}>Perguntas na base</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: colors.purple }}>{questionBank.length}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>
              <Layers3 size={14} color={colors.primary} />
              Novo tema
            </div>
            <input
              style={inputStyle}
              placeholder="Ex: Objecoes comerciais"
              value={themeForm.name}
              onChange={(event) => setThemeForm((current) => ({ ...current, name: event.target.value }))}
            />
            <textarea
              style={{ ...inputStyle, minHeight: '74px', resize: 'vertical' }}
              placeholder="Contexto e objetivo analitico do tema"
              value={themeForm.description}
              onChange={(event) => setThemeForm((current) => ({ ...current, description: event.target.value }))}
            />
            <Btn onClick={handleCreateTheme} loading={savingTheme} disabled={!themeForm.name.trim()} style={{ width: 'fit-content' }}>
              <Plus size={14} />
              Criar tema
            </Btn>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {themes.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum tema cadastrado.</div>
            ) : (
              themes.map((theme) => {
                const isActive = theme.status !== 'inactive';
                const questionCount = questionBank.filter((question) => question.themeId === theme.id).length;
                return (
                  <div
                    key={theme.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '900', color: 'var(--text-main)' }}>{theme.name}</span>
                        <Badge cor={isActive ? 'success' : 'neutral'}>{isActive ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                      {theme.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>{theme.description}</div>}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{questionCount} pergunta(s) vinculada(s)</div>
                    </div>
                    <button
                      onClick={() => onToggleThemeStatus(theme)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 10px',
                        borderRadius: '9px',
                        border: `1px solid ${isActive ? `${colors.warning}45` : `${colors.success}45`}`,
                        background: isActive ? `${colors.warning}12` : `${colors.success}12`,
                        color: isActive ? colors.warning : colors.success,
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '11px',
                      }}
                    >
                      <Power size={12} />
                      {isActive ? 'Pausar' : 'Ativar'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      <Card accent={colors.purple} title="Banco de Perguntas" subtitle="Monte um acervo reutilizavel para campanhas locais e comparativos globais.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select
              style={inputStyle}
              value={questionForm.themeId}
              onChange={(event) => setQuestionForm((current) => ({ ...current, themeId: event.target.value }))}
            >
              <option value="">Selecione o tema</option>
              {activeThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
            <select
              style={inputStyle}
              value={questionForm.type}
              onChange={(event) => setQuestionForm((current) => ({ ...current, type: event.target.value }))}
            >
              {QUESTION_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <input
            style={inputStyle}
            placeholder="Texto da pergunta"
            value={questionForm.label}
            onChange={(event) => setQuestionForm((current) => ({ ...current, label: event.target.value }))}
          />

          {(questionForm.type === 'select' || questionForm.type === 'multiselect') && (
            <textarea
              style={{ ...inputStyle, minHeight: '88px', resize: 'vertical' }}
              placeholder="Uma opcao por linha"
              value={questionForm.optionsText}
              onChange={(event) => setQuestionForm((current) => ({ ...current, optionsText: event.target.value }))}
            />
          )}

          <textarea
            style={{ ...inputStyle, minHeight: '74px', resize: 'vertical' }}
            placeholder="Orientacao para leitura analitica ou observacoes de aplicacao"
            value={questionForm.guidance}
            onChange={(event) => setQuestionForm((current) => ({ ...current, guidance: event.target.value }))}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
            <input
              type="checkbox"
              checked={questionForm.isCore}
              onChange={(event) => setQuestionForm((current) => ({ ...current, isCore: event.target.checked }))}
            />
            Marcar como pergunta nucleo
          </label>

          <Btn onClick={handleCreateQuestion} loading={savingQuestion} disabled={!questionForm.label.trim() || !questionForm.themeId} style={{ width: 'fit-content' }}>
            <Plus size={14} />
            Salvar pergunta
          </Btn>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>
            <BookMarked size={14} color={colors.purple} />
            Ultimas perguntas cadastradas
          </div>

          {latestQuestions.length === 0 ? (
            <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma pergunta na base.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {latestQuestions.map((question) => {
                const isActive = question.active !== false;
                return (
                  <div
                    key={question.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{question.label}</strong>
                        {question.isCore && <Badge cor="primary">Nucleo</Badge>}
                        <Badge cor={isActive ? 'success' : 'neutral'}>{isActive ? 'Ativa' : 'Inativa'}</Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>{themes.find((theme) => theme.id === question.themeId)?.name || question.themeName || 'Sem tema'}</span>
                        <span>{QUESTION_TYPES.find((item) => item.value === question.type)?.label || question.type}</span>
                        {question.guidance && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={11} />
                            Com guia de leitura
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleQuestionStatus(question)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 10px',
                        borderRadius: '9px',
                        border: `1px solid ${isActive ? `${colors.warning}45` : `${colors.success}45`}`,
                        background: isActive ? `${colors.warning}12` : `${colors.success}12`,
                        color: isActive ? colors.warning : colors.success,
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '11px',
                      }}
                    >
                      <ListChecks size={12} />
                      {isActive ? 'Inativar' : 'Reativar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
