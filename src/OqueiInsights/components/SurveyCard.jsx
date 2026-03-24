import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit2,
  FileText,
  Link as LinkIcon,
  Lock,
  PauseCircle,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Badge, colors } from '../../components/ui';
import {
  STATUS_COR,
  STATUS_ICON,
  STATUS_LABEL,
  canActivate,
  getSurveyTriggerLabel,
  surveyURL,
} from '../lib/surveyQuestions';
import { exportSurveyPDF } from '../lib/surveyPdf';
import CopyButton from './CopyButton';
import EntrevistadoresSection from './EntrevistadoresSection';
import QuestionEditor from './QuestionEditor';

export default function SurveyCard({
  survey,
  questionBank,
  themeMap,
  onEdit,
  onDelete,
  onToggleStatus,
  onPause,
  onReactivate,
  onAddQuestion,
  onAddBankQuestion,
  onAddCoreQuestions,
  onUpdateQuestion,
  onRemoveQuestion,
  onMoveQuestion,
}) {
  const [expanded, setExpanded] = useState(false);
  const activation = canActivate(survey);
  const isDraft = survey.status === 'draft';
  const isActive = survey.status === 'active';
  const isFinished = survey.status === 'finished';
  const url = surveyURL(survey.id);

  const themeNames = useMemo(() => {
    if (survey.themeNames?.length) return survey.themeNames;
    const questionThemeNames = [...new Set((survey.questions || []).map((question) => question.themeName).filter(Boolean))];
    if (questionThemeNames.length) return questionThemeNames;
    return (survey.themeIds || [])
      .map((themeId) => themeMap[themeId]?.name)
      .filter(Boolean);
  }, [survey.questions, survey.themeIds, survey.themeNames, themeMap]);

  const questionThemeOptions = useMemo(() => {
    const scopedThemes = (survey.themeIds || [])
      .map((themeId) => themeMap[themeId])
      .filter(Boolean)
      .map((theme) => ({ id: theme.id, name: theme.name }));

    if (scopedThemes.length) return scopedThemes;
    return Object.values(themeMap)
      .filter(Boolean)
      .map((theme) => ({ id: theme.id, name: theme.name }));
  }, [survey.themeIds, themeMap]);

  const linkedBankIds = useMemo(
    () => new Set((survey.questions || []).map((question) => question.bankQuestionId).filter(Boolean)),
    [survey.questions],
  );

  const availableBankQuestions = useMemo(() => {
    const allowedThemeIds = new Set(survey.themeIds || []);
    return (questionBank || []).filter((question) => {
      if (question.active === false) return false;
      if (!allowedThemeIds.size) return true;
      return allowedThemeIds.has(question.themeId);
    });
  }, [questionBank, survey.themeIds]);

  const missingCoreQuestions = availableBankQuestions.filter(
    (question) => question.isCore && !linkedBankIds.has(question.id),
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-sm)',
        border: `1px solid ${isActive ? `${colors.success}45` : isDraft ? `${colors.warning}30` : 'var(--border)'}`,
        borderTop: `3px solid ${isActive ? colors.success : isDraft ? colors.warning : colors.neutral}`,
      }}
    >
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>
              {STATUS_ICON[survey.status]} {survey.title}
            </div>
            {survey.description && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {survey.description}
              </div>
            )}
          </div>
          <Badge cor={STATUS_COR[survey.status] || 'neutral'}>{STATUS_LABEL[survey.status] || survey.status}</Badge>
          {survey.isLegacy && <Badge cor="warning">Legado</Badge>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: colors.primary, background: `${colors.primary}12`, padding: '4px 8px', borderRadius: '999px' }}>
            Versao {survey.questionnaireVersion || 1}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-panel)', padding: '4px 8px', borderRadius: '999px' }}>
            {survey.triggerLabel || getSurveyTriggerLabel(survey.trigger)}
          </span>
          {(themeNames || []).map((themeName) => (
            <span
              key={`${survey.id}-${themeName}`}
              style={{ fontSize: '11px', fontWeight: '800', color: colors.purple, background: `${colors.purple}12`, padding: '4px 8px', borderRadius: '999px' }}
            >
              {themeName}
            </span>
          ))}
        </div>

        {survey.objective && (
          <div
            style={{
              padding: '11px 12px',
              borderRadius: '12px',
              background: `${colors.info}08`,
              border: `1px solid ${colors.info}20`,
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: '900', color: colors.info, textTransform: 'uppercase', marginBottom: '4px' }}>Objetivo</div>
            <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.55 }}>{survey.objective}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
          <span style={{ color: !survey.questions?.length ? colors.warning : 'var(--text-muted)' }}>
            📋 {survey.questions?.length || 0} pergunta(s)
          </span>
          {survey.targetCities?.length > 0 && <span>📍 {survey.targetCities.length} cidade(s)</span>}
          {availableBankQuestions.length > 0 && <span>🧠 {availableBankQuestions.length} pergunta(s) disponiveis na base</span>}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            background: isActive ? `${colors.success}08` : 'var(--bg-panel)',
            border: `1px solid ${isActive ? `${colors.success}30` : 'var(--border)'}`,
            borderRadius: '10px',
            padding: '10px 14px',
            opacity: isActive ? 1 : 0.75,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '900', color: isActive ? colors.success : 'var(--text-muted)' }}>
              <LinkIcon size={11} />
              Link de aplicacao
            </div>
            {isActive ? (
              <CopyButton text={url} label="Copiar link" />
            ) : (
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>
                {isFinished ? 'Encerrado' : 'Disponivel ao ativar'}
              </span>
            )}
          </div>
          {isActive && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                background: 'var(--bg-panel)',
                borderRadius: '6px',
                padding: '4px 8px',
              }}
            >
              {url}
            </div>
          )}
        </div>

        {!activation.ok && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: `${colors.warning}12`,
              border: `1px solid ${colors.warning}30`,
              borderRadius: '10px',
              padding: '9px 12px',
              fontSize: '12px',
              fontWeight: '700',
              color: colors.warning,
            }}
          >
            <AlertTriangle size={13} />
            {activation.reason}
          </div>
        )}

        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          {!isFinished && (
            <button
              onClick={() => setExpanded((current) => !current)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
                padding: '7px 13px',
                borderRadius: '9px',
                border: '1px solid var(--border)',
                background: expanded ? 'var(--bg-panel)' : 'transparent',
                color: 'var(--text-muted)',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? 'Fechar' : 'Editar'}
            </button>
          )}

          {isFinished && (
            <button
              onClick={() => setExpanded((current) => !current)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
                padding: '7px 13px',
                borderRadius: '9px',
                border: '1px solid var(--border)',
                background: expanded ? 'var(--bg-panel)' : 'transparent',
                color: 'var(--text-muted)',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? 'Fechar' : 'Ver perguntas'}
            </button>
          )}

          <button
            onClick={() => onEdit(survey)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 13px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Edit2 size={12} />
            Info
          </button>

          <button
            onClick={() => exportSurveyPDF(survey)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 13px',
              borderRadius: '9px',
              border: `1px solid ${colors.primary}30`,
              background: `${colors.primary}08`,
              color: colors.primary,
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <FileText size={12} />
            PDF
          </button>

          {isActive && (
            <button
              onClick={() => onPause(survey)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 13px',
                borderRadius: '9px',
                border: `1px solid ${colors.warning}40`,
                background: `${colors.warning}15`,
                color: colors.warning,
                fontWeight: '900',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <PauseCircle size={12} />
              Pausar
            </button>
          )}

          {!isFinished && (
            <button
              onClick={() => onToggleStatus(survey)}
              disabled={isDraft && !activation.ok}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                justifyContent: 'center',
                padding: '7px 13px',
                borderRadius: '9px',
                border: 'none',
                fontWeight: '900',
                fontSize: '12px',
                cursor: isDraft && !activation.ok ? 'not-allowed' : 'pointer',
                flex: 1,
                background: isActive ? `${colors.danger}15` : activation.ok ? `${colors.success}18` : 'var(--bg-app)',
                color: isActive ? colors.danger : activation.ok ? colors.success : 'var(--text-muted)',
                outline: `1px solid ${isActive ? `${colors.danger}40` : activation.ok ? `${colors.success}50` : 'var(--border)'}`,
                opacity: isDraft && !activation.ok ? 0.5 : 1,
              }}
            >
              {isActive ? (
                <>
                  <span>⛔</span>
                  Encerrar
                </>
              ) : activation.ok ? (
                <>
                  <Unlock size={12} />
                  Ativar
                </>
              ) : (
                <>
                  <Lock size={12} />
                  Ativar
                </>
              )}
            </button>
          )}

          {isFinished && (
            <button
              onClick={() => onReactivate(survey)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                justifyContent: 'center',
                padding: '7px 13px',
                borderRadius: '9px',
                border: `1px solid ${colors.warning}40`,
                background: `${colors.warning}15`,
                color: colors.warning,
                fontWeight: '900',
                fontSize: '12px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <RotateCcw size={12} />
              Reativar
            </button>
          )}

          <button
            onClick={() => onDelete(survey.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 10px',
              borderRadius: '9px',
              border: `1px solid ${colors.danger}30`,
              background: `${colors.danger}10`,
              color: colors.danger,
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isActive && <EntrevistadoresSection survey={survey} />}

      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'var(--bg-app)',
            borderRadius: '0 0 13px 13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Perguntas ({survey.questions?.length || 0})
            </div>
            {!isFinished && missingCoreQuestions.length > 0 && (
              <button
                onClick={() => onAddCoreQuestions(survey)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  border: `1px solid ${colors.primary}40`,
                  background: `${colors.primary}10`,
                  color: colors.primary,
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <Target size={13} />
                Adicionar nucleo ({missingCoreQuestions.length})
              </button>
            )}
          </div>

          {(!survey.questions || !survey.questions.length) ? (
            <div
              style={{
                textAlign: 'center',
                padding: '28px',
                color: 'var(--text-muted)',
                border: `2px dashed ${colors.warning}40`,
                borderRadius: '12px',
                background: `${colors.warning}06`,
              }}
            >
              <ClipboardList size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px', color: colors.warning }}>
                Nenhuma pergunta ainda
              </div>
              <div style={{ fontSize: '12px' }}>Crie manualmente ou use a base estrategica.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {survey.questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  total={survey.questions.length}
                  themeOptions={questionThemeOptions}
                  onChange={isFinished ? null : (nextQuestion) => onUpdateQuestion(survey, index, nextQuestion)}
                  onRemove={isFinished ? null : () => onRemoveQuestion(survey, index)}
                  onMoveUp={isFinished ? null : () => onMoveQuestion(survey, index, index - 1)}
                  onMoveDown={isFinished ? null : () => onMoveQuestion(survey, index, index + 1)}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => onAddQuestion(survey)}
            style={{
              display: isFinished ? 'none' : 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px',
              borderRadius: '10px',
              border: `2px dashed ${colors.primary}40`,
              background: `${colors.primary}08`,
              color: colors.primary,
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Adicionar pergunta manual
          </button>

          {!isFinished && availableBankQuestions.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>Banco de perguntas sugeridas</div>
              {availableBankQuestions.slice(0, 6).map((question) => {
                const alreadyAdded = linkedBankIds.has(question.id);
                return (
                  <div
                    key={question.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{question.label}</strong>
                        {question.isCore && <Badge cor="primary">Nucleo</Badge>}
                        {question.themeName && <Badge cor="purple">{question.themeName}</Badge>}
                      </div>
                      {question.guidance && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                          {question.guidance}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onAddBankQuestion(survey, question)}
                      disabled={alreadyAdded}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 10px',
                        borderRadius: '9px',
                        border: `1px solid ${alreadyAdded ? 'var(--border)' : `${colors.success}40`}`,
                        background: alreadyAdded ? 'var(--bg-app)' : `${colors.success}12`,
                        color: alreadyAdded ? 'var(--text-muted)' : colors.success,
                        fontWeight: '800',
                        fontSize: '11px',
                        cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                        opacity: alreadyAdded ? 0.65 : 1,
                      }}
                    >
                      <Plus size={12} />
                      {alreadyAdded ? 'Ja incluida' : 'Usar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}