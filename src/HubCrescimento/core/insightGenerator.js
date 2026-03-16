export function generateInsights({
  cancelamentos = 0,
  mediaUltimos3Meses = 0,
  custo = 0,
  leadsGenerated = 0,
  diasSemLeads = 0,
  roi = 0,
} = {}) {
  const insights = [];

  if (mediaUltimos3Meses > 0 && cancelamentos > mediaUltimos3Meses * 1.25) {
    insights.push({
      type: 'warning',
      title: 'Churn acima da media',
      text: 'Cancelamentos acima de 125% da media dos ultimos 3 meses.',
    });
  }

  if (custo > 500 && leadsGenerated === 0 && diasSemLeads >= 7) {
    insights.push({
      type: 'danger',
      title: 'Custo sem retorno',
      text: 'Gasto acima de R$ 500 sem leads apos 7 dias.',
    });
  }

  if (roi < 0) {
    insights.push({
      type: 'warning',
      title: 'ROI negativo',
      text: 'O retorno esta abaixo do custo no periodo.',
    });
  }

  return insights;
}
