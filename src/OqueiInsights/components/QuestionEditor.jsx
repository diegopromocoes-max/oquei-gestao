import React, { useState } from 'react';
import { AlertTriangle, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { colors } from '../../components/ui';
import { QUESTION_TYPES } from '../lib/surveyQuestions';

export default function QuestionEditor({
  question,
  index,
  total,
  themeOptions = [],
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const config = QUESTION_TYPES.find((item) => item.value === question.type) || QUESTION_TYPES[0];
  const [optionInput, setOptionInput] = useState('');

  const inputStyle = {
    padding: '9px 12px',
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

  const setType = (type) => {
    const next = {
      ...question,
      type,
      options:
        type === 'select' || type === 'multiselect'
          ? []
          : type === 'boolean'
            ? ['Sim', 'Nao']
            : undefined,
    };
    onChange(next);
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    onChange({
      ...question,
      options: [...(question.options || []), optionInput.trim()],
    });
    setOptionInput('');
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '14px',
        borderRadius: '12px',
        background: 'var(--bg-app)',
        border: `1px solid ${question.label?.trim() ? `${config.color}35` : `${colors.warning}55`}`,
        borderLeft: `3px solid ${question.label?.trim() ? config.color : colors.warning}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <GripVertical size={15} color="var(--text-muted)" />
        <strong style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{index + 1}</strong>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {QUESTION_TYPES.map((item) => {
            const Icon = item.icon;
            const selected = item.value === question.type;
            return (
              <button
                key={item.value}
                onClick={() => setType(item.value)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: selected ? `${item.color}18` : 'var(--bg-panel)',
                  color: selected ? item.color : 'var(--text-muted)',
                  outline: `1px solid ${selected ? item.color : 'var(--border)'}`,
                  fontSize: '11px',
                  fontWeight: '800',
                }}
              >
                <Icon size={11} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div>
          {themeOptions.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <select
                style={{ ...inputStyle, fontSize: '12px' }}
                value={question.themeId || ''}
                onChange={(event) => {
                  const nextTheme = themeOptions.find((item) => item.id === event.target.value);
                  onChange({
                    ...question,
                    themeId: event.target.value,
                    themeName: nextTheme?.name || '',
                  });
                }}
              >
                <option value="">Sem tema vinculado</option>
                {themeOptions.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            style={{
              ...inputStyle,
              borderColor: question.label?.trim() ? 'var(--border)' : `${colors.warning}80`,
            }}
            value={question.label}
            placeholder={`Texto da pergunta ${index + 1}... *`}
            onChange={(event) => onChange({ ...question, label: event.target.value })}
          />
          {!question.label?.trim() && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: colors.warning,
                fontWeight: '700',
                marginTop: '4px',
              }}
            >
              <AlertTriangle size={11} />
              Campo obrigatorio para ativar
            </div>
          )}
        </div>

        {(question.type === 'select' || question.type === 'multiselect') && (
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '900',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Opcoes
            </div>

            {(question.options || []).map((option, optionIndex) => (
              <div
                key={`${question.id}-option-${optionIndex}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: config.color,
                    flexShrink: 0,
                  }}
                />
                <input
                  style={{ ...inputStyle, flex: 1, padding: '7px 11px', fontSize: '12px' }}
                  value={option}
                  onChange={(event) => {
                    const nextOptions = [...(question.options || [])];
                    nextOptions[optionIndex] = event.target.value;
                    onChange({ ...question, options: nextOptions });
                  }}
                />
                <button
                  onClick={() =>
                    onChange({
                      ...question,
                      options: (question.options || []).filter((_, idx) => idx !== optionIndex),
                    })
                  }
                  style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                style={{ ...inputStyle, flex: 1, fontSize: '12px' }}
                value={optionInput}
                placeholder="Nova opcao..."
                onChange={(event) => setOptionInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addOption();
                  }
                }}
              />
              <button
                onClick={addOption}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  border: `1px solid ${colors.primary}45`,
                  background: `${colors.primary}12`,
                  color: colors.primary,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {onRemove != null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              opacity: index === 0 ? 0.25 : 1,
            }}
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: index === total - 1 ? 'not-allowed' : 'pointer',
              opacity: index === total - 1 ? 0.25 : 1,
            }}
          >
            ▼
          </button>
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}