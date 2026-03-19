import React from 'react';
import { Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { styles as global, colors } from '../../styles/globalStyles';

// Função auxiliar para calcular os dias entre duas datas
const getDatesInRange = (start, end) => {
  if (!start || !end) return [];
  const dateArray = [];
  let currentDate = new Date(start + 'T12:00:00');
  const stopDate = new Date(end + 'T12:00:00');
  while (currentDate <= stopDate) {
    dateArray.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
};

export default function GestaoView({ absencesList, stores, attendants, floaters, deleteAbsence, updateCoverageQuickly }) {
  const today = new Date().toISOString().split('T')[0];
  
  // Filtramos apenas as ausências que ainda não terminaram (data final >= hoje)
  const upcomingAbsences = absencesList.filter(abs => abs.endDate >= today && abs.type === 'falta');
  const upcomingVacations = absencesList.filter(abs => abs.endDate >= today && abs.type === 'ferias');

  const renderAbsenceCard = (item) => {
    const dates = getDatesInRange(item.startDate, item.endDate);
    const storeName = stores.find(s => s.id === item.storeId)?.name || item.storeId;
    
    // Procura o nome do atendente tanto na lista de fixos como nos volantes
    const attendantName = attendants.find(a => a.id === item.attendantId)?.name 
                       || floaters.find(f => f.id === item.attendantId)?.name 
                       || 'Atendente';

    // Verifica se existe algum dia pendente de cobertura
    const hasPending = dates.some(d => !item.coverageMap?.[d]);

    return (
      <div key={item.id} style={{ ...local.dataCard, borderLeft: hasPending ? `4px solid ${colors.warning}` : `4px solid ${colors.success}` }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'15px'}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <span style={{fontSize:'10px', fontWeight:'900', color: item.type==='ferias' ? colors.success : colors.danger, background: item.type==='ferias' ? `${colors.success}15` : `${colors.danger}15`, padding:'4px 10px', borderRadius:'8px', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                {item.type === 'ferias' ? 'FÉRIAS' : 'FALTA'}
              </span>
              <h4 style={{fontWeight:'900', color:'var(--text-main)', margin:0, fontSize: '16px'}}>{storeName}</h4>
            </div>
            <p style={{fontSize:'14px', color:'var(--text-muted)', marginTop:'8px', marginBottom: '4px'}}>
              <strong style={{color:'var(--text-main)'}}>{attendantName}</strong> • {item.reason || 'Ausência Programada'}
            </p>
            <p style={{fontSize:'12px', color:'var(--text-muted)', margin: 0}}>
              {new Date(item.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(item.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
          <button onClick={() => deleteAbsence(item.id)} style={local.actionBtn} title="Excluir Registo">
            <Trash2 size={16} color={colors.danger}/>
          </button>
        </div>

        <div style={{background:'var(--bg-app)', borderRadius:'16px', padding:'15px', display:'flex', flexDirection:'column', gap:'10px', border: '1px solid var(--border)'}}>
          {dates.map(date => {
            const assignedId = item.coverageMap?.[date];
            const isClosed = assignedId === 'loja_fechada';
            const dateObj = new Date(date + 'T12:00:00');
            const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

            return (
              <div key={date} style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'13px'}}>
                <div style={{display:'flex', gap:'10px', alignItems:'center', width:'130px'}}>
                  <span style={{fontWeight:'900', color:'var(--text-main)'}}>
                    {dateObj.getDate().toString().padStart(2, '0')}/{(dateObj.getMonth()+1).toString().padStart(2, '0')}
                  </span>
                  <span style={{fontSize:'11px', textTransform:'uppercase', color:'var(--text-muted)', fontWeight: 'bold'}}>
                    {dayName}
                  </span>
                </div>
                
                <div style={{flex: 1}}>
                  <select 
                    value={assignedId || ''} 
                    onChange={(e) => updateCoverageQuickly(item.id, date, e.target.value, item.coverageMap)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: !assignedId ? `1px solid ${colors.warning}` : isClosed ? `1px solid ${colors.danger}40` : `1px solid ${colors.success}40`,
                      background: !assignedId ? `${colors.warning}15` : isClosed ? `${colors.danger}15` : `${colors.success}15`,
                      color: !assignedId ? '#b45309' : isClosed ? colors.danger : colors.success,
                      fontWeight: '800',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">⚠️ Pendente - Quem cobre?</option>
                    <option value="loja_fechada">🚫 LOJA FECHADA</option>
                    {floaters.map(f => (
                      <option key={f.id} value={f.id}>{f.name.split(' ')[0]} ({f.cityId || 'Volante'})</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="animated-view">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h3 style={{...global.sectionTitle, margin: 0}}>Próximas Ausências e Férias</h3>
        <div style={{display:'flex', gap:'15px'}}>
           <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:colors.warning, fontWeight:'800'}}><AlertCircle size={14}/> Faltam Coberturas</div>
           <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:colors.success, fontWeight:'800'}}><CheckCircle size={14}/> Tudo Coberto</div>
        </div>
      </div>

      {upcomingAbsences.length === 0 && upcomingVacations.length === 0 ? (
        <div style={global.emptyState}>
          <CheckCircle size={40} style={{marginBottom:'10px', opacity:0.5}} />
          <p>Nenhuma falta ou férias programada para os próximos dias.</p>
        </div>
      ) : (
        <div style={local.gridCards}>
          {upcomingAbsences.map(renderAbsenceCard)}
          {upcomingVacations.map(renderAbsenceCard)}
        </div>
      )}
    </div>
  );
}

const local = {
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px', width: '100%' },
  dataCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: 'var(--shadow-sm)' },
  actionBtn: { border: '1px solid var(--border)', background: 'var(--bg-app)', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }
};