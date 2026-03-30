import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { Btn, Card, colors } from '../../components/ui';
import { CROSS_OPERATORS } from '../lib/analysisResults';

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '9px',
  border: '1px solid var(--border)',
  outline: 'none',
  fontSize: '13px',
  color: 'var(--text-main)',
  background: 'var(--bg-app)',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export default function CrossFilterCard({
  questions,
  crossConditions,
  responsesCount,
  filteredCount,
  activeCount,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
  onClearConditions,
}) {
  const questionsMap = useMemo(() => Object.fromEntries((questions || []).map((question) => [question.id, question])), [questions]);

  return (
    <Card title="Cruzamento Inteligente de Respostas" subtitle="Combine condições dinâmicas (E / OU) para refinar o segmento analisado">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {crossConditions.map((condition, index) => {
          const question = questionsMap[condition.questionId];
          const type = question?.type || 'text';
          const operators = CROSS_OPERATORS[type] || CROSS_OPERATORS.text;
          const selectedOperator = operators.some((operator) => operator.value === condition.operator)
            ? condition.operator
            : (operators[0]?.value || '');
          const optionValues = question?.options || [];
          const isRange = selectedOperator === 'between' || selectedOperator === 'not_between';
          const needsValues = ['in', 'not_in', 'contains_any', 'contains_all', 'contains_none'].includes(selectedOperator);
          const needsSingle = !isRange && !needsValues && !['is_empty', 'is_not_empty'].includes(selectedOperator);

          return (
            <div key={condition.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-app)', padding: '10px', display: 'grid', gridTemplateColumns: '110px minmax(200px,1fr) minmax(140px,180px) minmax(150px,1fr) 36px', gap: '8px', alignItems: 'center' }}>
              <select
                style={inputStyle}
                value={index === 0 ? 'and' : condition.connector}
                disabled={index === 0}
                onChange={(event) => onUpdateCondition(condition.id, { connector: event.target.value })}
              >
                <option value="and">E</option>
                <option value="or">OU</option>
              </select>

              <select
                style={inputStyle}
                value={condition.questionId}
                onChange={(event) => {
                  const nextQuestion = questionsMap[event.target.value];
                  const nextOperator = CROSS_OPERATORS[nextQuestion?.type || 'text']?.[0]?.value || 'eq';
                  onUpdateCondition(condition.id, { questionId: event.target.value, operator: nextOperator, value: '', values: [], min: '', max: '' });
                }}
              >
                <option value="">Selecione a questão</option>
                {questions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>

              <select
                style={inputStyle}
                value={selectedOperator}
                onChange={(event) => onUpdateCondition(condition.id, { operator: event.target.value, value: '', values: [], min: '', max: '' })}
              >
                {operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
              </select>

              <div>
                {isRange && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <input type="number" style={{ ...inputStyle, cursor: 'text' }} placeholder="Mín" value={condition.min} onChange={(event) => onUpdateCondition(condition.id, { min: event.target.value })} />
                    <input type="number" style={{ ...inputStyle, cursor: 'text' }} placeholder="Máx" value={condition.max} onChange={(event) => onUpdateCondition(condition.id, { max: event.target.value })} />
                  </div>
                )}

                {needsSingle && (
                  optionValues.length ? (
                    <select style={inputStyle} value={condition.value} onChange={(event) => onUpdateCondition(condition.id, { value: event.target.value })}>
                      <option value="">Selecione</option>
                      {optionValues.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input type={type === 'nps' ? 'number' : 'text'} style={{ ...inputStyle, width: '100%', cursor: 'text' }} placeholder="Valor" value={condition.value} onChange={(event) => onUpdateCondition(condition.id, { value: event.target.value })} />
                  )
                )}

                {needsValues && (
                  <select
                    multiple
                    style={{ ...inputStyle, width: '100%', minHeight: '74px', cursor: 'pointer' }}
                    value={condition.values || []}
                    onChange={(event) => {
                      const values = Array.from(event.target.selectedOptions || []).map((option) => option.value);
                      onUpdateCondition(condition.id, { values });
                    }}
                  >
                    {optionValues.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                )}

                {!isRange && !needsValues && !needsSingle && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Sem valor adicional</span>}
              </div>

              <button
                type="button"
                onClick={() => onRemoveCondition(condition.id)}
                style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-card)', color: colors.danger, width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
            Resultado do cruzamento: <b style={{ color: colors.primary }}>{filteredCount}</b> de <b>{responsesCount}</b> entrevistas. {activeCount > 0 ? `${activeCount} condição(ões) ativa(s).` : 'Condição sem valor não altera o recorte.'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn onClick={onAddCondition}>+ Nova condição</Btn>
            <Btn onClick={onClearConditions} variant="secondary">Limpar</Btn>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
          As condições são avaliadas da esquerda para a direita, na ordem exibida.
        </div>
      </div>
    </Card>
  );
}
