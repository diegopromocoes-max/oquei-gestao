import React from 'react';
import { CalendarDays, Briefcase } from 'lucide-react';
import { styles as global, colors } from '../../styles/globalStyles';
import CoverageManager from './components/CoverageManager';

export default function FormFeriasView({
  feriasForm,
  setFeriasForm,
  stores,
  attendants,
  floaters,
  handleStoreChange,
  saveFerias,
  loading
}) {
  return (
    <div className="animated-view" style={global.card}>
      <form onSubmit={saveFerias} style={{...global.form, padding: '10px 0'}}>
        
        <div style={local.infoBox}>
          <Briefcase size={22} color={colors.success} style={{flexShrink: 0}} />
          <p style={{margin:0}}>As férias devem ser programadas com <strong>30 dias de antecedência mínima</strong> para garantir a organização da escala.</p>
        </div>
        
        <h3 style={{...global.sectionTitle, color: colors.success, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '25px'}}><CalendarDays size={20}/> Dados das Férias</h3>
        <div style={local.row}>
          <div style={global.field}>
            <label style={local.label}>Loja Foco</label>
            <select style={global.select} value={feriasForm.storeId} onChange={(e) => handleStoreChange(e, 'ferias')} required>
              <option value="">Selecione...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={global.field}>
            <label style={local.label}>Colaborador</label>
            <select style={global.select} value={feriasForm.attendantId} onChange={e => setFeriasForm({...feriasForm, attendantId: e.target.value})} required disabled={!feriasForm.storeId}>
              <option value="">Selecione...</option>
              {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div style={local.row}>
          <div style={global.field}>
            <label style={local.label}>Período de Descanso</label>
            <div style={{display:'flex', gap:'15px'}}>
              <input type="date" style={global.input} value={feriasForm.startDate} onChange={e => setFeriasForm({...feriasForm, startDate: e.target.value})} required />
              <input type="date" style={global.input} value={feriasForm.endDate} onChange={e => setFeriasForm({...feriasForm, endDate: e.target.value})} required />
            </div>
          </div>
        </div>
        
        <CoverageManager 
          startDate={feriasForm.startDate} 
          endDate={feriasForm.endDate} 
          coverageMap={feriasForm.coverageMap} 
          onChange={(newMap) => setFeriasForm({...feriasForm, coverageMap: newMap})} 
          floaters={floaters} 
        />

        <button type="submit" style={{...global.btnPrimary, background: colors.success, height: '54px', fontWeight: '900', borderRadius: '14px', fontSize: '15px', marginTop: '30px'}} disabled={loading}>
          {loading ? 'Salvando...' : 'Agendar Férias no Sistema'}
        </button>
      </form>
    </div>
  );
}

const local = {
  infoBox: { background: `${colors.success}15`, border: `1px solid ${colors.success}40`, padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', alignItems: 'center', fontSize: '14px', color: 'var(--text-main)' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' },
};