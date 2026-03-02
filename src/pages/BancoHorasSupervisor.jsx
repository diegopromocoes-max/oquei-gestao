import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { 
  Clock, Search, User, AlertTriangle, 
  ArrowUpCircle, ArrowDownCircle, History, X, BarChart3, 
  LayoutGrid, List, Camera, Trophy, AlertOctagon, Activity
} from 'lucide-react';

export default function BancoHorasSupervisor({ userData }) {
  const [loading, setLoading] = useState(true);
  const [attendants, setAttendants] = useState([]);
  const [filteredAttendants, setFilteredAttendants] = useState([]);
  const [cities, setCities] = useState([]);
  const [supervisors, setSupervisors] = useState([]); 
  
  const [viewMode, setViewMode] = useState('grid'); 

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCity, setSelectedCity] = useState('');

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editBalance, setEditBalance] = useState({ 
    status: 'positive', 
    hours: '', 
    supervisor: userData?.name || 'Supervisor', 
    manualAdjustments: 0 
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', city: '', photo: null });
  
  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. OBTÉM CIDADES DO CLUSTER DO SUPERVISOR (Para evitar vazamento de dados)
      let qCities;
      if (userData?.role === 'coordinator') {
        qCities = query(collection(db, "cities"));
      } else {
        qCities = query(collection(db, "cities"), where("clusterId", "==", userData?.clusterId || ''));
      }
      
      const snapCities = await getDocs(qCities);
      const myCitiesIds = snapCities.docs.map(d => d.id);
      const myCitiesNames = snapCities.docs.map(d => d.data().name);

      // Preenche o dropdown de filtro com as cidades reais encontradas
      setCities([...new Set(myCitiesNames)]);

      // 2. OBTÉM ATENDENTES E FILTRA APENAS OS DAS SUAS CIDADES
      const qUsers = query(collection(db, "users"), where("role", "==", "attendant"));
      const snapUsers = await getDocs(qUsers);
      
      const list = snapUsers.docs
        .map(d => ({ 
          id: d.id, 
          ...d.data(), 
          balance: d.data().balance || 0,
          manualAdjustments: d.data().manualAdjustments || 0,
          history: d.data().history || [],
          photo: d.data().photo || null
        }))
        // Filtro de Segurança: Coordenador vê tudo, Supervisor vê só as suas cidades
        .filter(u => userData?.role === 'coordinator' || myCitiesIds.includes(u.cityId) || myCitiesNames.includes(u.cityId));
      
      setAttendants(list);
      setFilteredAttendants(list);

      // 3. OBTÉM SUPERVISORES (Para exibir no Histórico)
      const qSup = query(collection(db, "users"), where("role", "==", "supervisor"));
      const snapSup = await getDocs(qSup);
      setSupervisors(snapSup.docs.map(d => d.data().name));

    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    let result = attendants;
    if (searchTerm) result = result.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCity) result = result.filter(a => a.cityId === selectedCity);
    if (filterType === 'positive') result = result.filter(a => a.balance > 0);
    if (filterType === 'negative') result = result.filter(a => a.balance < 0);
    if (filterType === 'alert') result = result.filter(a => a.manualAdjustments > 4);
    setFilteredAttendants(result);
  }, [searchTerm, selectedCity, filterType, attendants]);

  const stats = {
    total: attendants.length,
    globalBalance: attendants.reduce((acc, curr) => acc + curr.balance, 0),
    positiveCount: attendants.filter(a => a.balance >= 0).length,
    negativeCount: attendants.filter(a => a.balance < 0).length,
    alertCount: attendants.filter(a => a.manualAdjustments > 4).length,
    topPositives: [...attendants].filter(a => a.balance > 0).sort((a,b) => b.balance - a.balance).slice(0, 5),
    topNegatives: [...attendants].filter(a => a.balance < 0).sort((a,b) => a.balance - b.balance).slice(0, 5),
    topAdjustments: [...attendants].filter(a => a.manualAdjustments > 0).sort((a,b) => b.manualAdjustments - a.manualAdjustments).slice(0, 5),
  };

  const formatMinutes = (totalMinutes) => {
    if (isNaN(totalMinutes)) return "00:00";
    const isNegative = totalMinutes < 0;
    const abs = Math.abs(totalMinutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${isNegative ? '-' : '+'}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };
  
  const processFile = async (event, context) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
          const base64 = await convertToBase64(file);
          if (context === 'edit') setEditForm(prev => ({ ...prev, photo: base64 }));
      } catch (err) {
          console.error(err);
          alert("Erro ao processar imagem");
      }
  };

  const updateEmployee = async () => {
      if(!selectedEmployee) return;
      try {
          await updateDoc(doc(db, "users", selectedEmployee.id), {
              name: editForm.name,
              cityId: editForm.city, 
              photo: editForm.photo
          });
          alert("Perfil atualizado!");
          setIsEditing(false);
          fetchData();
      } catch(e) {
          alert("Erro de Permissão: A sua conta de Supervisor não tem permissão para editar utilizadores diretamente no banco de dados. Verifique as regras do Firebase.");
      }
  };

  const formatTimeInput = (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
        value = value.slice(0, 2) + ':' + value.slice(2);
    }
    setEditBalance({ ...editBalance, hours: value });
  };

  const saveBalance = async () => {
    if (!editBalance.hours || editBalance.hours.length < 3) return alert("Informe o saldo no formato HH:MM");
    if (!editBalance.supervisor) return alert("Selecione o supervisor responsável.");

    try {
      const [hStr, mStr] = editBalance.hours.split(':');
      const hours = parseInt(hStr);
      const minutes = parseInt(mStr);
      let totalMinutes = (hours * 60) + minutes;

      if (editBalance.status === 'negative') totalMinutes = -totalMinutes;

      const newEntry = {
        date: new Date().toISOString(),
        supervisor: editBalance.supervisor,
        amount: formatMinutes(totalMinutes), 
        rawAmount: totalMinutes,
        reason: `Atualização de Saldo (Ajustes: ${editBalance.manualAdjustments})`
      };

      const userRef = doc(db, "users", selectedEmployee.id);
      
      await updateDoc(userRef, {
        balance: totalMinutes,
        manualAdjustments: parseInt(editBalance.manualAdjustments),
        history: arrayUnion(newEntry),
        lastUpdate: serverTimestamp()
      });

      alert("Banco de horas atualizado com sucesso!");
      
      setEditBalance({ ...editBalance, hours: '' });
      setSelectedEmployee(null);
      fetchData(); 

    } catch (err) { 
      alert("Erro ao salvar: O Supervisor não tem permissão direta na Firestore para editar o banco de dados do utilizador. Solicite ajuste nas regras do banco (Adicione isSupervisor() à regra de users)."); 
    }
  };

  const openDetails = (emp) => {
    setSelectedEmployee(emp);
    setIsEditing(false);
    setEditForm({ name: emp.name, city: emp.cityId, photo: emp.photo });
    
    const currentMinutes = emp.balance || 0;
    const absMinutes = Math.abs(currentMinutes);
    const hh = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mm = String(absMinutes % 60).padStart(2, '0');

    setEditBalance({
        status: currentMinutes >= 0 ? 'positive' : 'negative',
        hours: `${hh}:${mm}`,
        supervisor: userData?.name || 'Supervisor', 
        manualAdjustments: emp.manualAdjustments || 0
    });
  };

  const KpiCard = ({ label, value, sub, color, icon: Icon }) => (
    <div style={{...styles.card, borderLeft: `4px solid ${color}`}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
        <div>
          <p style={{fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</p>
          <h3 style={{fontSize:'28px', fontWeight:'900', color:'var(--text-main)', marginTop:'5px'}}>{value}</h3>
          {sub && <p style={{fontSize:'12px', color: color, fontWeight:'bold', marginTop:'5px'}}>{sub}</p>}
        </div>
        <div style={{padding:'10px', borderRadius:'12px', background: `${color}15`, color: color}}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div style={styles.iconHeader}><Clock size={28} color="white"/></div>
        <div>
          <h1 style={styles.title}>Banco de Horas & POQ</h1>
          <p style={styles.subtitle}>Gestão de tempo e produtividade da equipe.</p>
        </div>
      </div>

      <div style={styles.grid4}>
        <KpiCard label="Colaboradores" value={stats.total} sub={`${stats.alertCount} com POQ Zerado`} color="#3b82f6" icon={User} />
        <KpiCard label="Saldo Global" value={formatMinutes(stats.globalBalance)} sub="Total Acumulado" color={stats.globalBalance >= 0 ? "#10b981" : "#ef4444"} icon={BarChart3} />
        <KpiCard label="Positivos" value={stats.positiveCount} color="#10b981" icon={ArrowUpCircle} />
        <KpiCard label="Negativos" value={stats.negativeCount} color="#ef4444" icon={ArrowDownCircle} />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px', marginBottom:'30px'}}>
        
        <div style={styles.rankingCard}>
           <h3 style={{...styles.cardTitle, color: '#10b981'}}><Trophy size={18}/> Top Créditos</h3>
           <div style={styles.rankingList}>
             {stats.topPositives.map((att, i) => (
               <div key={att.id} style={styles.rankingItem}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <span style={{fontWeight:'bold', color:'var(--text-muted)', width:'15px'}}>{i+1}</span>
                   <span style={{fontWeight:'600', color:'var(--text-main)'}}>{att.name.split(' ')[0]}</span>
                 </div>
                 <span style={{fontWeight:'bold', color:'#10b981'}}>{formatMinutes(att.balance)}</span>
               </div>
             ))}
             {stats.topPositives.length === 0 && <p style={styles.emptyText}>Sem saldos positivos.</p>}
           </div>
        </div>

        <div style={styles.rankingCard}>
           <h3 style={{...styles.cardTitle, color: '#ef4444'}}><AlertOctagon size={18}/> Top Débitos</h3>
           <div style={styles.rankingList}>
             {stats.topNegatives.map((att, i) => (
               <div key={att.id} style={styles.rankingItem}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <span style={{fontWeight:'bold', color:'var(--text-muted)', width:'15px'}}>{i+1}</span>
                   <span style={{fontWeight:'600', color:'var(--text-main)'}}>{att.name.split(' ')[0]}</span>
                 </div>
                 <span style={{fontWeight:'bold', color:'#ef4444'}}>{formatMinutes(att.balance)}</span>
               </div>
             ))}
             {stats.topNegatives.length === 0 && <p style={styles.emptyText}>Sem saldos negativos.</p>}
           </div>
        </div>

        <div style={styles.rankingCard}>
           <h3 style={{...styles.cardTitle, color: '#f59e0b'}}><Activity size={18}/> Top Ajustes Manuais</h3>
           <div style={styles.rankingList}>
             {stats.topAdjustments.map((att, i) => (
               <div key={att.id} style={styles.rankingItem}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <span style={{fontWeight:'bold', color:'var(--text-muted)', width:'15px'}}>{i+1}</span>
                   <div>
                     <span style={{fontWeight:'600', color:'var(--text-main)', display:'block'}}>{att.name.split(' ')[0]}</span>
                     {att.manualAdjustments > 4 && <span style={{fontSize:'9px', background:'var(--bg-danger-light)', color:'#ef4444', padding:'1px 4px', borderRadius:'4px', fontWeight:'bold'}}>POQ ZERADO</span>}
                   </div>
                 </div>
                 <span style={{fontWeight:'bold', color: att.manualAdjustments > 4 ? '#ef4444' : '#f59e0b'}}>{att.manualAdjustments}</span>
               </div>
             ))}
             {stats.topAdjustments.length === 0 && <p style={styles.emptyText}>Sem ajustes manuais.</p>}
           </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input style={styles.searchInput} placeholder="Buscar colaborador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
          <select style={styles.select} value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
            <option value="">Todas as Cidades</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('grid')} style={viewMode === 'grid' ? styles.viewBtnActive : styles.viewBtn}><LayoutGrid size={18}/></button>
            <button onClick={() => setViewMode('list')} style={viewMode === 'list' ? styles.viewBtnActive : styles.viewBtn}><List size={18}/></button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div style={styles.gridCards}>
          {filteredAttendants.map(att => (
            <div key={att.id} style={styles.employeeCard} onClick={() => openDetails(att)}>
              <div style={styles.cardHeaderBanner}>
                <span style={{
                  ...styles.statusBadge, 
                  background: att.balance >= 0 ? 'var(--bg-success-light)' : 'var(--bg-danger-light)',
                  color: att.balance >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {att.balance >= 0 ? 'POSITIVO' : 'NEGATIVO'}
                </span>
              </div>
              
              <div style={styles.cardAvatarWrapper}>
                 {att.photo ? (
                    <img src={att.photo} alt={att.name} style={styles.cardAvatarImg} />
                 ) : (
                    <div style={styles.cardAvatarPlaceholder}>{att.name.charAt(0)}</div>
                 )}
              </div>
              
              <div style={{textAlign:'center', marginTop:'10px', paddingBottom:'20px'}}>
                <h3 style={styles.cardName}>{att.name}</h3>
                <p style={styles.cardRole}>{att.cityId}</p>
                
                <div style={styles.cardBalance}>
                   <span style={{fontSize:'10px', fontWeight:'bold', color:'var(--text-muted)', textTransform:'uppercase'}}>Saldo Atual</span>
                   <div style={{fontSize:'24px', fontWeight:'900', color: att.balance >= 0 ? '#10b981' : '#ef4444'}}>
                     {formatMinutes(att.balance)}
                   </div>
                </div>

                {att.manualAdjustments > 4 && (
                   <div style={styles.alertPoq}>⚠️ POQ ZERADO ({att.manualAdjustments})</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={{background:'var(--bg-panel)', borderBottom:'1px solid var(--border)'}}>
                <th style={styles.th}>Colaborador</th>
                <th style={styles.th}>Cidade</th>
                <th style={{...styles.th, textAlign:'center'}}>Ajustes</th>
                <th style={{...styles.th, textAlign:'right'}}>Saldo</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendants.map(att => (
                <tr key={att.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={styles.td}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      {att.photo ? <img src={att.photo} style={{width:32, height:32, borderRadius:'50%', objectFit:'cover'}} /> : <div style={{...styles.avatar, width:32, height:32, fontSize:12}}>{att.name.charAt(0)}</div>}
                      <span style={{fontWeight:'bold', color:'var(--text-main)'}}>{att.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{att.cityId}</td>
                  <td style={{...styles.td, textAlign:'center'}}>
                    <span style={{padding:'2px 6px', borderRadius:'4px', background: att.manualAdjustments > 4 ? 'var(--bg-danger-light)' : 'var(--bg-panel)', color: att.manualAdjustments > 4 ? '#ef4444' : 'var(--text-muted)', fontWeight:'bold', fontSize:'11px'}}>
                      {att.manualAdjustments}
                    </span>
                  </td>
                  <td style={{...styles.td, textAlign:'right', fontWeight:'bold', color: att.balance >= 0 ? '#10b981' : '#ef4444'}}>
                    {formatMinutes(att.balance)}
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => openDetails(att)} style={styles.actionBtn}>Gerenciar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedEmployee && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                 <div style={{position:'relative'}}>
                    {selectedEmployee.photo ? (
                       <img src={selectedEmployee.photo} style={{width:60, height:60, borderRadius:'16px', objectFit:'cover'}} />
                    ) : (
                       <div style={{width:60, height:60, borderRadius:'16px', background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'24px', color:'var(--text-muted)'}}>{selectedEmployee.name.charAt(0)}</div>
                    )}
                    <label htmlFor="photo-upload" style={styles.cameraBtn}>
                       <Camera size={14} color="white" />
                       <input id="photo-upload" type="file" style={{display:'none'}} onChange={(e) => processFile(e, 'edit')} />
                    </label>
                 </div>
                 <div>
                    <h3 style={{fontSize:'20px', fontWeight:'bold', color:'var(--text-main)', margin:0}}>{selectedEmployee.name}</h3>
                    <p style={{fontSize:'12px', color:'var(--text-muted)', margin:0}}>{selectedEmployee.cityId} • {selectedEmployee.email}</p>
                 </div>
              </div>
              <button onClick={() => {setSelectedEmployee(null);}} style={styles.closeBtn}><X size={24}/></button>
            </div>
            
            {isEditing ? (
               <div style={{marginBottom:'20px', padding:'15px', background:'var(--bg-panel)', borderRadius:'12px', border:'1px solid var(--border)'}}>
                  <h4 style={{fontSize:'12px', fontWeight:'bold', color:'var(--text-main)', marginBottom:'10px'}}>Editar Dados</h4>
                  <input value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})} style={{...styles.input, marginBottom:'10px'}} placeholder="Nome" />
                  <select value={editForm.city} onChange={e=>setEditForm({...editForm, city:e.target.value})} style={styles.select}>
                     <option value="">Selecione a Loja</option>
                     {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                     <button onClick={updateEmployee} style={{...styles.saveBtn, padding:'10px'}}>Salvar Dados</button>
                     <button onClick={() => setIsEditing(false)} style={styles.btnSecondary}>Cancelar</button>
                  </div>
               </div>
            ) : (
               <button onClick={() => setIsEditing(true)} style={{fontSize:'11px', color:'var(--text-brand)', background:'none', border:'none', cursor:'pointer', marginBottom:'20px', fontWeight:'bold'}}>Editar Nome/Loja</button>
            )}

            <div style={{background: 'var(--bg-panel)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)'}}>
              <h4 style={{fontSize:'12px', fontWeight:'bold', color:'var(--text-muted)', marginBottom:'15px', textTransform:'uppercase'}}>Atualizar Status Atual</h4>
              
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                <button type="button" onClick={() => setEditBalance({...editBalance, status: 'positive'})} style={{...styles.toggleBtn, background: editBalance.status === 'positive' ? 'var(--bg-success-light)' : 'var(--bg-card)', color: editBalance.status === 'positive' ? '#10b981' : 'var(--text-muted)', borderColor: editBalance.status === 'positive' ? '#10b981' : 'var(--border)'}}>
                  <ArrowUpCircle size={16}/> Saldo Positivo
                </button>
                <button type="button" onClick={() => setEditBalance({...editBalance, status: 'negative'})} style={{...styles.toggleBtn, background: editBalance.status === 'negative' ? 'var(--bg-danger-light)' : 'var(--bg-card)', color: editBalance.status === 'negative' ? '#ef4444' : 'var(--text-muted)', borderColor: editBalance.status === 'negative' ? '#ef4444' : 'var(--border)'}}>
                  <ArrowDownCircle size={16}/> Saldo Negativo
                </button>
              </div>

              <div style={{display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px'}}>
                 <input 
                   type="text" 
                   value={editBalance.hours} 
                   onChange={formatTimeInput} 
                   placeholder="00:00" 
                   style={{
                     fontSize: '40px', fontWeight: '900', color: editBalance.status === 'positive' ? '#10b981' : '#ef4444',
                     width: '180px', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none'
                   }} 
                 />
              </div>

              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 15px', background:'var(--bg-card)', borderRadius:'10px', border:'1px solid var(--border)', marginBottom:'15px'}}>
                 <span style={{fontSize:'13px', fontWeight:'bold', color:'var(--text-main)'}}>Ajustes Manuais (Mês)</span>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <button onClick={() => setEditBalance({...editBalance, manualAdjustments: Math.max(0, editBalance.manualAdjustments - 1)})} style={styles.circleBtn}>-</button>
                    <span style={{fontWeight:'bold', fontSize:'16px', color: 'var(--text-main)'}}>{editBalance.manualAdjustments}</span>
                    <button onClick={() => setEditBalance({...editBalance, manualAdjustments: editBalance.manualAdjustments + 1})} style={styles.circleBtn}>+</button>
                 </div>
              </div>
              
              <button onClick={saveBalance} style={styles.saveBtn}>Salvar Atualização</button>
            </div>

            <div style={{marginTop:'30px', borderTop:'1px solid var(--border)', paddingTop:'20px'}}>
              <h4 style={{fontSize:'14px', fontWeight:'bold', color:'var(--text-main)', marginBottom:'10px', display:'flex', alignItems:'center', gap:'5px'}}>
                <History size={16}/> Histórico de Atualizações
              </h4>
              <div style={{maxHeight:'150px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px'}} className="hide-scrollbar">
                {selectedEmployee.history?.slice().reverse().map((h, i) => (
                  <div key={i} style={{fontSize:'12px', display:'flex', justifyContent:'space-between', padding:'10px', background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:'8px'}}>
                    <div>
                      <span style={{fontWeight:'bold', color:'var(--text-main)'}}>Atualizado por {h.supervisor}</span>
                      <div style={{fontSize:'10px', color:'var(--text-muted)'}}>{new Date(h.date).toLocaleString()} • Ajustes: {h.adjustmentsSnapshot || h.reason?.replace(/\D/g, '') || 0}</div>
                    </div>
                    <span style={{fontWeight:'bold', color: h.amount.includes('+') ? '#10b981' : '#ef4444'}}>
                      {h.amount}
                    </span>
                  </div>
                ))}
                {(!selectedEmployee.history || selectedEmployee.history.length === 0) && <p style={{fontSize:'12px', color:'var(--text-muted)', textAlign:'center'}}>Nenhum registro.</p>}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", animation: 'fadeIn 0.4s ease-out' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
  iconHeader: { width: '45px', height: '45px', borderRadius: '12px', background: 'var(--text-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  title: { fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: 0 },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: 0 },
  
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },

  toolbar: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)', flex: 1, minWidth: '250px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: 'var(--text-main)' },
  select: { padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', fontSize:'13px', fontWeight:'600' },
  
  viewToggle: { display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px' },
  viewBtn: { padding: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '8px' },
  viewBtnActive: { padding: '8px', border: 'none', background: 'var(--bg-primary-light)', color: 'var(--text-brand)', cursor: 'pointer', borderRadius: '8px' },

  rankingCard: { background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  rankingList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  rankingItem: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid var(--bg-panel)' },
  emptyText: { textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '10px', fontStyle: 'italic' },
  cardTitle: { fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', margin: 0 },

  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' },
  employeeCard: { background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' },
  cardHeaderBanner: { height: '60px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display:'flex', justifyContent:'center', alignItems:'start', paddingTop:'10px' },
  cardAvatarWrapper: { width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--bg-card)', margin: '-40px auto 0', overflow: 'hidden', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardAvatarPlaceholder: { fontSize: '32px', fontWeight: 'bold', color: 'var(--text-muted)' },
  
  statusBadge: { fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '20px' },
  cardName: { fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '0' },
  cardRole: { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' },
  cardBalance: { marginTop: '15px', padding: '15px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)' },
  alertPoq: { background: 'var(--bg-danger-light)', color: '#ef4444', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '5px' },

  tableCard: { background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' },
  td: { padding: '15px', fontSize: '14px', color: 'var(--text-main)' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)' },
  actionBtn: { padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-panel)', color: 'var(--text-main)', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid var(--border)' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, background: 'var(--text-brand)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)', cursor: 'pointer' },

  toggleBtn: { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: 'bold', fontSize: '13px' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', width: '100%', boxSizing: 'border-box', outline: 'none', background: 'var(--bg-app)', color: 'var(--text-main)' },
  saveBtn: { padding: '14px', borderRadius: '12px', background: 'var(--text-brand)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
  circleBtn: { width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-main)' },
  btnSecondary: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }
};