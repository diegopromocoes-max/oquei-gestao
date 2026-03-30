import React from 'react';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { colors } from '../../components/ui';

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

export default function AnalysisHeader({
  surveys,
  cities,
  themeOptions,
  versionOptions,
  selSurvey,
  selCity,
  selTheme,
  selVersion,
  selMonth,
  filteredCount,
  loading,
  onSurveyChange,
  onCityChange,
  onThemeChange,
  onVersionChange,
  onMonthChange,
}) {
  return (
    <>
      <div style={{ background: 'linear-gradient(135deg,var(--bg-card),var(--bg-panel))', border: '1px solid var(--border)', borderRadius: '20px', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '13px', background: `linear-gradient(135deg,${colors.primary},${colors.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${colors.primary}44` }}>
            <BarChart3 size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>Análise dos Resultados</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Operação × Pesquisa de campo · {filteredCount} entrevistas no recorte
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={inputStyle} value={selSurvey} onChange={(event) => onSurveyChange(event.target.value)}>
            <option value="all">Todas as pesquisas</option>
            {surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}
          </select>
          <select style={inputStyle} value={selCity} onChange={(event) => onCityChange(event.target.value)}>
            <option value="all">Todas as cidades</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
          <select style={inputStyle} value={selTheme} onChange={(event) => onThemeChange(event.target.value)}>
            <option value="all">Todos os temas</option>
            {themeOptions.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select>
          <select style={inputStyle} value={selVersion} onChange={(event) => onVersionChange(event.target.value)}>
            <option value="all">Todas as versões</option>
            {versionOptions.map((version) => <option key={version} value={version}>{`Versão ${version}`}</option>)}
          </select>
          <input type="month" style={inputStyle} value={selMonth} onChange={(event) => onMonthChange(event.target.value)} />
        </div>
      </div>

      {!loading && filteredCount < 10 && (
        <div style={{ background: `${colors.warning}12`, border: `1px solid ${colors.warning}30`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: colors.warning, fontWeight: '700' }}>
          <AlertTriangle size={16} />
          Poucos dados ({filteredCount} entrevistas). Para análise confiável recomenda-se pelo menos 30 entrevistas aceitas.
        </div>
      )}
    </>
  );
}
