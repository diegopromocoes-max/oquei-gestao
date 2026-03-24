import React from 'react';
import { ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import { Btn, Card, colors } from '../../components/ui';
import SurveyCard from './SurveyCard';

function UnknownStatusCard({ survey, onEdit, onDelete }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div>
        <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
          {survey.title || '(sem titulo)'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
          Status atual: {survey.status || 'indefinido'}
          {survey.isLegacy ? ' | campanha legada aguardando vinculacao de temas' : ''}
          {survey.normalizationError ? ' | carregada em modo de recuperacao' : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => onEdit(survey)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '7px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.primary}30`,
            background: `${colors.primary}10`,
            color: colors.primary,
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <Save size={13} />
          Vincular temas
        </button>

        <button
          onClick={() => onDelete(survey.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '7px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.danger}30`,
            background: `${colors.danger}10`,
            color: colors.danger,
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={13} />
          Excluir
        </button>
      </div>
    </div>
  );
}

export default function SurveyBuilderCampaigns({
  loading,
  surveys,
  statusOrder,
  statusLabelMap,
  unknownStatusSurveys,
  questionBank,
  themeMap,
  onCreateCampaign,
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
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Carregando campanhas...
        </div>
      </Card>
    );
  }

  if (surveys.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <ClipboardList size={44} style={{ opacity: 0.2, marginBottom: '14px' }} />
          <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: 'var(--text-main)' }}>
            Nenhuma campanha criada
          </div>
          <div style={{ fontSize: '13px', marginBottom: '18px' }}>
            Cadastre os temas, monte a base de perguntas e crie a primeira campanha.
          </div>
          <Btn onClick={onCreateCampaign}>
            <Plus size={14} />
            Criar campanha
          </Btn>
        </div>
      </Card>
    );
  }

  return (
    <>
      {statusOrder.map((status) => {
        const group = surveys.filter((survey) => survey.status === status);
        if (!group.length) return null;

        return (
          <div key={status}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '900',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '10px',
              }}
            >
              {statusLabelMap[status]} ({group.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {group.map((survey) => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  questionBank={questionBank}
                  themeMap={themeMap}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                  onPause={onPause}
                  onReactivate={onReactivate}
                  onAddQuestion={onAddQuestion}
                  onAddBankQuestion={onAddBankQuestion}
                  onAddCoreQuestions={onAddCoreQuestions}
                  onUpdateQuestion={onUpdateQuestion}
                  onRemoveQuestion={onRemoveQuestion}
                  onMoveQuestion={onMoveQuestion}
                />
              ))}
            </div>
          </div>
        );
      })}

      {unknownStatusSurveys.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '900',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '10px',
            }}
          >
            Outros ({unknownStatusSurveys.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {unknownStatusSurveys.map((survey) => (
              <UnknownStatusCard
                key={survey.id}
                survey={survey}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}