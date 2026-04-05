import React, { useMemo, useState } from 'react';
import { Btn, Card, Input, InfoBox } from './ui';

const dimensionLabels = {
  commercial: 'Comercial',
  behavior: 'Comportamental',
  attendance: 'Assiduidade',
  engagement: 'Engajamento',
};

export default function ScoreConfigEditor({ config, onSave, saving = false }) {
  const [form, setForm] = useState(() => ({
    weights: { ...(config?.weights || {}) },
    thresholds: { ...(config?.thresholds || {}) },
    feedbackWindowDays: config?.feedbackWindowDays || 10,
    alertThresholds: { ...(config?.alertThresholds || {}) },
  }));

  const weightTotal = useMemo(
    () => Object.values(form.weights).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [form.weights],
  );

  const handleSubmit = async () => {
    if (weightTotal !== 100) {
      window.showToast?.('Os pesos precisam somar 100.', 'error');
      return;
    }
    await onSave({
      ...config,
      ...form,
      feedbackWindowDays: Number(form.feedbackWindowDays) || 0,
      thresholds: {
        green: Number(form.thresholds.green) || 0,
        yellow: Number(form.thresholds.yellow) || 0,
      },
      alertThresholds: {
        conversionDrop: Number(form.alertThresholds.conversionDrop) || 0,
        attendanceRise: Number(form.alertThresholds.attendanceRise) || 0,
        stalledScoreDelta: Number(form.alertThresholds.stalledScoreDelta) || 0,
        improvementStreakCount: Number(form.alertThresholds.improvementStreakCount) || 0,
      },
    });
  };

  return (
    <Card
      title="Configuracao do score"
      subtitle="Os pesos precisam somar 100 para o calculo ficar valido."
      actions={[<Btn key="save" onClick={handleSubmit} loading={saving}>Salvar configuracao</Btn>]}
    >
      {weightTotal !== 100 && (
        <div style={{ marginBottom: '16px' }}>
          <InfoBox type="warning">A soma atual dos pesos e {weightTotal}. Ajuste para 100.</InfoBox>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {Object.entries(dimensionLabels).map(([key, label]) => (
          <Input
            key={key}
            label={`Peso ${label}`}
            type="number"
            value={form.weights[key] ?? 0}
            onChange={(event) => setForm((current) => ({
              ...current,
              weights: { ...current.weights, [key]: event.target.value },
            }))}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <Input
          label="Threshold verde"
          type="number"
          value={form.thresholds.green ?? 0}
          onChange={(event) => setForm((current) => ({
            ...current,
            thresholds: { ...current.thresholds, green: event.target.value },
          }))}
        />
        <Input
          label="Threshold amarelo"
          type="number"
          value={form.thresholds.yellow ?? 0}
          onChange={(event) => setForm((current) => ({
            ...current,
            thresholds: { ...current.thresholds, yellow: event.target.value },
          }))}
        />
        <Input
          label="Janela de feedback (dias)"
          type="number"
          value={form.feedbackWindowDays}
          onChange={(event) => setForm((current) => ({ ...current, feedbackWindowDays: event.target.value }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        <Input
          label="Queda de conversao"
          type="number"
          value={form.alertThresholds.conversionDrop ?? 0}
          onChange={(event) => setForm((current) => ({
            ...current,
            alertThresholds: { ...current.alertThresholds, conversionDrop: event.target.value },
          }))}
        />
        <Input
          label="Alta de faltas"
          type="number"
          value={form.alertThresholds.attendanceRise ?? 0}
          onChange={(event) => setForm((current) => ({
            ...current,
            alertThresholds: { ...current.alertThresholds, attendanceRise: event.target.value },
          }))}
        />
        <Input
          label="Variacao minima"
          type="number"
          value={form.alertThresholds.stalledScoreDelta ?? 0}
          onChange={(event) => setForm((current) => ({
            ...current,
            alertThresholds: { ...current.alertThresholds, stalledScoreDelta: event.target.value },
          }))}
        />
        <Input
          label="Periodos de melhora"
          type="number"
          value={form.alertThresholds.improvementStreakCount ?? 0}
          onChange={(event) => setForm((current) => ({
            ...current,
            alertThresholds: { ...current.alertThresholds, improvementStreakCount: event.target.value },
          }))}
        />
      </div>
    </Card>
  );
}
