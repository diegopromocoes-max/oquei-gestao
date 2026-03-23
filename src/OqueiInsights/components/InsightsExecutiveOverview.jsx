import React from 'react';
import { Card, colors } from '../../components/ui';

function MetricTile({ label, value, hint, color }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
      <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '900', color, lineHeight: 1.05, marginTop: '6px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>
    </div>
  );
}

function ComparisonCard({ title, subtitle, rows, selectedKey, emptyLabel, rowRender }) {
  return (
    <Card accent={colors.primary} title={title} subtitle={subtitle}>
      {!rows.length ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{emptyLabel}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rows.slice(0, 5).map((row, index) => {
            const isSelected = selectedKey !== 'all' && selectedKey === row.key;
            return (
              <div
                key={row.key}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${isSelected ? colors.primary : 'var(--border)'}`,
                  background: isSelected ? `${colors.primary}08` : 'var(--bg-app)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: colors.primary }}>#{index + 1}</span>
                      <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{row.label}</span>
                      {isSelected && (
                        <span style={{ fontSize: '10px', fontWeight: '900', color: colors.primary, background: `${colors.primary}12`, padding: '3px 8px', borderRadius: '999px' }}>
                          recorte atual
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>{rowRender(row)}</div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: colors.primary, lineHeight: 1 }}>{row.responses}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default function InsightsExecutiveOverview({
  metrics,
  cityRows,
  campaignRows,
  themeRows,
  periodLabel = 'Todo historico',
  selectedCityLabel = 'Todas as cidades',
  selectedCampaignLabel = 'Todas as pesquisas',
  selectedThemeLabel = 'Todos os temas',
  selectedCityKey = 'all',
  selectedCampaignKey = 'all',
  selectedThemeKey = 'all',
}) {
  const contextChips = [selectedCampaignLabel, selectedCityLabel, selectedThemeLabel, periodLabel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {contextChips.map((item) => (
          <span key={item} style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '999px' }}>
            {item}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        <MetricTile label="Respostas auditadas" value={metrics.totalResponses} hint={`${metrics.cities} cidade(s) e ${metrics.campaigns} campanha(s)`} color={colors.primary} />
        <MetricTile label="Cobertura de GPS" value={`${metrics.gpsCoverage}%`} hint="entrevistas com geolocalizacao valida" color={colors.info} />
        <MetricTile label="Temas acionados" value={metrics.themes} hint="temas com respostas ou planos no recorte" color={colors.purple} />
        <MetricTile label="Planos ativos" value={metrics.activePlans} hint={`${metrics.completedPlans} concluidos (${metrics.completionRate}% de execucao)`} color={colors.success} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <ComparisonCard
          title="Cidades em Foco"
          subtitle="Comparativo de volume, cobertura e desdobramento"
          rows={cityRows}
          selectedKey={selectedCityKey}
          emptyLabel="Nenhuma cidade encontrada para este recorte."
          rowRender={(row) => `${row.campaigns} campanha(s) | ${row.themes} tema(s) | ${row.plans} plano(s) | GPS ${row.gpsCoverage}%`}
        />
        <ComparisonCard
          title="Campanhas Comparadas"
          subtitle="Alcance, versoes e acao por campanha"
          rows={campaignRows}
          selectedKey={selectedCampaignKey}
          emptyLabel="Nenhuma campanha encontrada para este recorte."
          rowRender={(row) => `${row.cities} cidade(s) | ${row.themes} tema(s) | ${row.versions} versao(oes) | ${row.plans} plano(s)`}
        />
        <ComparisonCard
          title="Temas em Evidencia"
          subtitle="Onde ha mais campo e mais plano associado"
          rows={themeRows}
          selectedKey={selectedThemeKey}
          emptyLabel="Nenhum tema encontrado para este recorte."
          rowRender={(row) => `${row.campaigns} campanha(s) | ${row.cities} cidade(s) | ${row.plans} plano(s) | ${row.completedPlans} concluido(s)`}
        />
      </div>
    </div>
  );
}
