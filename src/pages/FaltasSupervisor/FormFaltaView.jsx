import React from 'react';
import { AlertTriangle, UploadCloud } from 'lucide-react';
import { styles as global, colors } from '../../styles/globalStyles';
import CoverageManager from './components/CoverageManager';

export default function FormFaltaView({ 
  faltaForm, 
  setFaltaForm, 
  stores, 
  attendants, 
  floaters, 
  handleStoreChange, 
  saveFalta, 
  loading, 
  fileName, 
  handleFileChange 
}) {
  return (
    <div className="animated-view" style={global.card}>
      <form onSubmit={saveFalta} style={{...global.form, padding: '10px 0'}}>
        
        <h3 style={{...global.sectionTitle, color: colors.danger, display: 'flex', alignItems: 'center', gap: '8px'}}><AlertTriangle size={20}/> 1. Dados da Falta</h3>
        <div style={local.row}>
          <div style={global.field}>
            <label style={local.label}>Loja Foco</label>
            <select style={global.select} value={faltaForm.storeId} onChange={(e) => handleStoreChange(e, 'falta')} required>
              <option value="">Selecione...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={global.field}>
            <label style={local.label}>Colaborador Ausente</label>
            <select style={global.select} value={faltaForm.attendantId} onChange={e => setFaltaForm({...faltaForm, attendantId: e.target.value})} required disabled={!faltaForm.storeId}>
              <option value="">Selecione...</option>
              {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div style={local.row}>
          <div style={global.field}>
            <label style={local.label}>Motivo Registado</label>
            <select style={global.select} value={faltaForm.reason} onChange={e => setFaltaForm({...faltaForm, reason: e.target.value})} required>
              <option value="">Selecione...</option>
              <option value="Atestado">Atestado Médico</option>
              <option value="Injustificada">Falta Injustificada</option>
              <option value="Pessoal">Problema Pessoal / Familiar</option>
            </select>
          </div>
          <div style={global.field}>
            <label style={local.label}>Período de Ausência</label>
            <div style={{display:'flex', gap:'15px'}}>
              <input type="date" style={global.input} value={faltaForm.startDate} onChange={e => setFaltaForm({...faltaForm, startDate: e.target.value})} required />
              <input type="date" style={global.input} value={faltaForm.endDate} onChange={e => setFaltaForm({...faltaForm, endDate: e.target.value})} required />
            </div>
          </div>
        </div>

        <CoverageManager 
          startDate={faltaForm.startDate} 
          endDate={faltaForm.endDate} 
          coverageMap={faltaForm.coverageMap} 
          onChange={(newMap) => setFaltaForm({...faltaForm, coverageMap: newMap})} 
          floaters={floaters} 
        />

        <h3 style={{...global.sectionTitle, marginTop: '30px', display: 'flex', alignItems: 'center', gap: '8px'}}><UploadCloud size={20}/> 2. Anexos e Notas</h3>
        <label htmlFor="file-upload" style={local.uploadBox}>
          <input id="file-upload" type="file" style={{display: 'none'}} onChange={handleFileChange} />
          <UploadCloud size={32} color="var(--text-muted)" style={{marginBottom: '10px'}} />
          <span style={{fontSize: '14px', color: 'var(--text-main)', fontWeight: '900'}}>{fileName ? `Arquivo Anexado: ${fileName}` : "Clique para anexar o Comprovante (Opcional)"}</span>
        </label>
        
        <div style={{...global.field, marginTop: '20px'}}>
          <label style={local.label}>Observações Adicionais</label>
          <textarea style={{...global.input, minHeight: '100px', resize: 'vertical'}} placeholder="Descreva mais detalhes se necessário..." value={faltaForm.obs} onChange={e => setFaltaForm({...faltaForm, obs: e.target.value})} />
        </div>

        <button type="submit" style={{...global.btnPrimary, background: colors.danger, height: '54px', fontWeight: '900', borderRadius: '14px', fontSize: '15px', marginTop: '20px'}} disabled={loading}>
          {loading ? 'Salvando no sistema...' : 'Registrar Falta Oficial'}
        </button>
      </form>
    </div>
  );
}

const local = {
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' },
  uploadBox: { border: '2px dashed var(--border)', borderRadius: '20px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-app)', transition: '0.2s' },
};