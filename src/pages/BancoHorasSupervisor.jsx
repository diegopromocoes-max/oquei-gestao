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
  const [supervisors, setSupervisors] = useState([]); // Lista de supervisores para o histórico
  
  // Estado de Navegação
  const [viewMode, setViewMode] = useState('grid'); 

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCity, setSelectedCity] = useState('');

  // Modal de Edição (Agora é Edição de Estado, não lançamento)
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editBalance, setEditBalance] = useState({ 
    status: 'positive', // 'positive' ou 'negative'
    hours: '', 
    supervisor: userData.name, // Nome do supervisor logado
    manualAdjustments: 0 
  });
  
  // Upload de foto
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', city: '', photo: null });
  
  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, "users"), where("role", "==", "attendant"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        balance: d.data().balance || 0,
        manualAdjustments: d.data().manualAdjustments || 0,
        history: d.data().history || [],
        photo: d.data().photo || null
      }));
      
      setAttendants(list);
      setFilteredAttendants(list);

      const uniqueCities = [...new Set(list.map(i => i.cityId).filter(Boolean))];
      setCities(uniqueCities);

      // Carregar lista de supervisores para dropdown (opcional, ou usa o logado)
      const qSup = query(collection(db, "users"), where("role", "==", "supervisor"));
      const snapSup = await getDocs(qSup);
      setSupervisors(snapSup.docs.map(d => d.data().name));

    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // --- FILTROS ---
  useEffect(() => {
    let result = attendants;
    if (searchTerm) result = result.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCity) result = result.filter(a => a.cityId === selectedCity);
    if (filterType === 'positive') result = result.filter(a => a.balance > 0);
    if (filterType === 'negative') result = result.filter(a => a.balance < 0);
    if (filterType === 'alert') result = result.filter(a => a.manualAdjustments > 4);
    setFilteredAttendants(result);
  }, [searchTerm, selectedCity, filterType, attendants]);

  // --- CÁLCULOS E ESTATÍSTICAS ---
  const stats = {
    total: attendants.length,
    globalBalance: attendants.reduce((acc, curr) => acc + curr.balance, 0),
    positiveCount: attendants.filter(a => a.balance >= 0).length,
    negativeCount: attendants.filter(a => a.balance < 0).length,
    alertCount: attendants.filter(a => a.manualAdjustments > 4).length,
    // Rankings
    topPositives: [...attendants].filter(a => a.balance > 0).sort((a,b) => b.balance - a.balance).slice(0, 5),
    topNegatives: [...attendants].filter(a => a.balance < 0).sort((a,b) => a.balance - b.balance).slice(0, 5),
    topAdjustments: [...attendants].filter(a => a.manualAdjustments > 0).sort((a,b) => b.manualAdjustments - a.manualAdjustments).slice(0, 5),
  };

  // --- HELPERS ---
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
          // Lógica para 'new' se necessário
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
              cityId: editForm.city, // Assumindo que no banco é cityId
              photo: editForm.photo
          });
          alert("Perfil atualizado!");
          setIsEditing(false);
          fetchData();
      } catch(e) {
          alert("Erro: " + e.message);
      }
  };
  
  const deleteEmployee = async (id) => {
      if(!window.confirm("Tem certeza? Isso apagará todo o histórico.")) return;
      // Implementar deleteDoc
      alert("Função de deletar desativada por segurança no demo.");
  };

  // --- MÁSCARA DE TEMPO (HH:MM) ---
  const formatTimeInput = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove não números
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
        value = value.slice(0, 2) + ':' + value.slice(2);
    }
    setEditBalance({ ...editBalance, hours: value });
  };

  // --- AÇÃO PRINCIPAL: SALVAR SALDO ---
  const saveBalance = async () => {
    if (!editBalance.hours || editBalance.hours.length < 3) return alert("Informe o saldo no formato HH:MM");
    if (!editBalance.supervisor) return alert("Selecione o supervisor responsável.");

    try {
      // 1. Converter HH:MM para Minutos Totais
      const [hStr, mStr] = editBalance.hours.split(':');
      const hours = parseInt(hStr);
      const minutes = parseInt(mStr);
      let totalMinutes = (hours * 60) + minutes;

      // Aplicar sinal
      if (editBalance.status === 'negative') totalMinutes = -totalMinutes;

      // 2. Criar registro de histórico (Snapshot)
      const newEntry = {
        date: new Date().toISOString(),
        supervisor: editBalance.supervisor,
        amount: formatMinutes(totalMinutes), // Salva visualmente como ficou
        rawAmount: totalMinutes,
        reason: `Atualização de Saldo (Ajustes: ${editBalance.manualAdjustments})`
      };

      const userRef = doc(db, "users", selectedEmployee.id);
      
      // 3. Atualizar o documento do usuário (Substitui os valores atuais)
      await updateDoc(userRef, {
        balance: totalMinutes, // O novo saldo absoluto
        manualAdjustments: parseInt(editBalance.manualAdjustments),
        history: arrayUnion(newEntry), // Adiciona ao log
        lastUpdate: serverTimestamp()
      });

      alert("Banco de horas atualizado com sucesso!");
      
      // Limpa e recarrega
      setEditBalance({ ...editBalance, hours: '' });
      setSelectedEmployee(null);
      fetchData(); 

    } catch (err) { alert("Erro ao salvar: " + err.message); }
  };

  // --- PREPARAR MODAL ---
  const openDetails = (emp) => {
    setSelectedEmployee(emp);
    setIsEditing(false);
    setEditForm({ name: emp.name, city: emp.cityId, photo: emp.photo });
    
    // Prepara o formulário com os dados atuais do banco
    const currentMinutes = emp.balance || 0;
    const absMinutes = Math.abs(currentMinutes);
    const hh = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mm = String(absMinutes % 60).padStart(2, '0');

    setEditBalance({
        status: currentMinutes >= 0 ? 'positive' : 'negative',
        hours: `${hh}:${mm}`,
        supervisor: userData.name, // Preenche com quem está logado
        manualAdjustments: emp.manualAdjustments || 0
    });
  };

  // --- SUB-COMPONENTES DE VISUALIZAÇÃO ---

  const KpiCard = ({ label, value, sub, color, icon: Icon }) => (
    <div style={{...styles.card, borderLeft: `4px solid ${color}`}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
        <div>
          <p style={{fontSize:'11px', fontWeight:'800', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</p>
          <h3 style={{fontSize:'28px', fontWeight:'900', color:'#1e293b', marginTop:'5px'}}>{value}</h3>
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
      
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.iconHeader}><Clock size={28} color="white"/></div>
        <div>
          <h1 style={styles.title}>Banco de Horas & POQ</h1>
          <p style={styles.subtitle}>Gestão de tempo e produtividade da equipe.</p>
        </div>
      </div>

      {/* DASHBOARD (KPIS) */}
      <div style={styles.grid4}>
        <KpiCard label="Colaboradores" value={stats.total} sub={`${stats.alertCount} com POQ Zerado`} color="#3b82f6" icon={User} />
        <KpiCard label="Saldo Global" value={formatMinutes(stats.globalBalance)} sub="Total Acumulado" color={stats.globalBalance >= 0 ? "#10b981" : "#ef4444"} icon={BarChart3} />
        <KpiCard label="Positivos" value={stats.positiveCount} color="#10b981" icon={ArrowUpCircle} />
        <KpiCard label="Negativos" value={stats.negativeCount} color="#ef4444" icon={ArrowDownCircle} />
      </div>

      {/* RANKINGS */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px', marginBottom:'30px'}}>
        
        {/* TOP POSITIVOS */}
        <div style={styles.rankingCard}>
           <h3 style={{...styles.cardTitle, color: '#059669'}}><Trophy size={18}/> Top Créditos</h3>
           <div style={styles.rankingList}>
             {stats.topPositives.map((att, i) => (
               <div key={att.id} style={styles.rankingItem}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <span style={{fontWeight:'bold', color:'#94a3b8', width:'15px'}}>{i+1}</span>
                   <span style={{fontWeight:'600', color:'#334155'}}>{att.name.split(' ')[0]}</span>
                 </div>
                 <span style={{fontWeight:'bold', color:'#059669'}}>{formatMinutes(att.balance)}</span>
               </div>
             ))}
             {stats.topPositives.length === 0 && <p style={styles.emptyText}>Sem saldos positivos.</p>}
           </div>
        </div>

        {/* TOP NEGATIVOS */}
        <div style={styles.rankingCard}>
           <h3 style={{...styles.cardTitle, color: '#ef4444'}}><AlertOctagon size={18}/> Top Débitos</h3>
           <div style={styles.rankingList}>
             {stats.topNegatives.map((att, i) => (
               <div key={att.id} style={styles.rankingItem}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <span style={{fontWeight:'bold', color:'#94a3b8', width:'15px'}}>{i+1}</span>
                   <span style={{fontWeight:'600', color:'#334155'}}>{att.name.split(' ')[0]}</span>
                 </div>
                 <span style={{fontWeight:'bold', color:'#ef4444'}}>{formatMinutes(att.balance)}</span>
               </div>
             ))}
             {stats.topNegatives.length === 0 && <p style={styles.emptyText}>Sem saldos negativos.</p>}
           </div>
        </div>

        {/* TOP AJUSTES (POQ) */}
        <div style={styles.rankingCard}>
           <h3 style={{...styles.cardTitle, color: '#d97706'}}><Activity size={18}/> Top Ajustes Manuais</h3>
           <div style={styles.rankingList}>
             {stats.topAdjustments.map((att, i) => (
               <div key={att.id} style={styles.rankingItem}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <span style={{fontWeight:'bold', color:'#94a3b8', width:'15px'}}>{i+1}</span>
                   <div>
                     <span style={{fontWeight:'600', color:'#334155', display:'block'}}>{att.name.split(' ')[0]}</span>
                     {att.manualAdjustments > 4 && <span style={{fontSize:'9px', background:'#fee2e2', color:'#ef4444', padding:'1px 4px', borderRadius:'4px', fontWeight:'bold'}}>POQ ZERADO</span>}
                   </div>
                 </div>
                 <span style={{fontWeight:'bold', color: att.manualAdjustments > 4 ? '#ef4444' : '#d97706'}}>{att.manualAdjustments}</span>
               </div>
             ))}
             {stats.topAdjustments.length === 0 && <p style={styles.emptyText}>Sem ajustes manuais.</p>}
           </div>
        </div>
      </div>

      {/* BARRA DE FERRAMENTAS */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
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

      {/* CONTEÚDO PRINCIPAL */}
      
      {/* MODO GRID */}
      {viewMode === 'grid' && (
        <div style={styles.gridCards}>
          {filteredAttendants.map(att => (
            <div key={att.id} style={styles.employeeCard} onClick={() => openDetails(att)}>
              <div style={styles.cardHeaderBanner}>
                <span style={{
                  ...styles.statusBadge, 
                  background: att.balance >= 0 ? '#ecfdf5' : '#fef2f2',
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
                   <span style={{fontSize:'10px', fontWeight:'bold', color:'#94a3b8', textTransform:'uppercase'}}>Saldo Atual</span>
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

      {/* MODO LISTA */}
      {viewMode === 'list' && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={{background:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
                <th style={styles.th}>Colaborador</th>
                <th style={styles.th}>Cidade</th>
                <th style={{...styles.th, textAlign:'center'}}>Ajustes</th>
                <th style={{...styles.th, textAlign:'right'}}>Saldo</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendants.map(att => (
                <tr key={att.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={styles.td}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      {att.photo ? <img src={att.photo} style={{width:32, height:32, borderRadius:'50%', objectFit:'cover'}} /> : <div style={{...styles.avatar, width:32, height:32, fontSize:12}}>{att.name.charAt(0)}</div>}
                      <span style={{fontWeight:'bold', color:'#334155'}}>{att.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{att.cityId}</td>
                  <td style={{...styles.td, textAlign:'center'}}>
                    <span style={{padding:'2px 6px', borderRadius:'4px', background: att.manualAdjustments > 4 ? '#fee2e2' : '#f1f5f9', color: att.manualAdjustments > 4 ? '#ef4444' : '#64748b', fontWeight:'bold', fontSize:'11px'}}>
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

      {/* MODAL DE GERENCIAMENTO (Atualização de Estado) */}
      {selectedEmployee && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                 <div style={{position:'relative'}}>
                    {selectedEmployee.photo ? (
                       <img src={selectedEmployee.photo} style={{width:60, height:60, borderRadius:'16px', objectFit:'cover'}} />
                    ) : (
                       <div style={{width:60, height:60, borderRadius:'16px', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'24px', color:'#64748b'}}>{selectedEmployee.name.charAt(0)}</div>
                    )}
                    <label htmlFor="photo-upload" style={styles.cameraBtn}>
                       <Camera size={14} color="white" />
                       <input id="photo-upload" type="file" style={{display:'none'}} onChange={(e) => processFile(e, 'edit')} />
                    </label>
                 </div>
                 <div>
                    <h3 style={{fontSize:'20px', fontWeight:'bold', color:'#1e293b'}}>{selectedEmployee.name}</h3>
                    <p style={{fontSize:'12px', color:'#64748b'}}>{selectedEmployee.cityId} • {selectedEmployee.email}</p>
                 </div>
              </div>
              <button onClick={() => {setSelectedEmployee(null); setNewPhoto(null);}} style={styles.closeBtn}><X size={24}/></button>
            </div>
            
            {/* EDIÇÃO DE PERFIL */}
            {isEditing ? (
               <div style={{marginBottom:'20px', padding:'15px', background:'#f8fafc', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                  <h4 style={{fontSize:'12px', fontWeight:'bold', marginBottom:'10px'}}>Editar Dados</h4>
                  <input value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})} style={{...styles.input, marginBottom:'10px'}} placeholder="Nome" />
                  <select value={editForm.city} onChange={e=>setEditForm({...editForm, city:e.target.value})} style={styles.select}>
                     <option value="">Selecione a Loja</option>
                     {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                     <button onClick={updateEmployee} style={{...styles.saveBtn, padding:'10px'}}>Salvar Dados</button>
                     <button onClick={() => setIsEditing(false)} style={{...styles.btnSecondary}}>Cancelar</button>
                  </div>
               </div>
            ) : (
               <button onClick={() => setIsEditing(true)} style={{fontSize:'11px', color:'#3b82f6', background:'none', border:'none', cursor:'pointer', marginBottom:'20px', fontWeight:'bold'}}>Editar Nome/Loja</button>
            )}

            {/* ATUALIZAR SALDO */}
            <div style={{background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0'}}>
              <h4 style={{fontSize:'12px', fontWeight:'bold', color:'#64748b', marginBottom:'15px', textTransform:'uppercase'}}>Atualizar Status Atual</h4>
              
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                <button type="button" onClick={() => setEditBalance({...editBalance, status: 'positive'})} style={{...styles.toggleBtn, background: editBalance.status === 'positive' ? '#ecfdf5' : 'white', color: editBalance.status === 'positive' ? '#10b981' : '#64748b', borderColor: editBalance.status === 'positive' ? '#10b981' : '#e2e8f0'}}>
                  <ArrowUpCircle size={16}/> Saldo Positivo
                </button>
                <button type="button" onClick={() => setEditBalance({...editBalance, status: 'negative'})} style={{...styles.toggleBtn, background: editBalance.status === 'negative' ? '#fef2f2' : 'white', color: editBalance.status === 'negative' ? '#ef4444' : '#64748b', borderColor: editBalance.status === 'negative' ? '#ef4444' : '#e2e8f0'}}>
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

              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 15px', background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', marginBottom:'15px'}}>
                 <span style={{fontSize:'13px', fontWeight:'bold', color:'#334155'}}>Ajustes Manuais (Mês)</span>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <button onClick={() => setEditBalance({...editBalance, manualAdjustments: Math.max(0, editBalance.manualAdjustments - 1)})} style={styles.circleBtn}>-</button>
                    <span style={{fontWeight:'bold', fontSize:'16px'}}>{editBalance.manualAdjustments}</span>
                    <button onClick={() => setEditBalance({...editBalance, manualAdjustments: editBalance.manualAdjustments + 1})} style={styles.circleBtn}>+</button>
                 </div>
              </div>
              
              <button onClick={saveBalance} style={styles.saveBtn}>Salvar Atualização</button>
            </div>

            {/* HISTÓRICO */}
            <div style={{marginTop:'30px', borderTop:'1px solid #f1f5f9', paddingTop:'20px'}}>
              <h4 style={{fontSize:'14px', fontWeight:'bold', color:'#334155', marginBottom:'10px', display:'flex', alignItems:'center', gap:'5px'}}>
                <History size={16}/> Histórico de Atualizações
              </h4>
              <div style={{maxHeight:'150px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px'}}>
                {selectedEmployee.history?.slice().reverse().map((h, i) => (
                  <div key={i} style={{fontSize:'12px', display:'flex', justifyContent:'space-between', padding:'10px', background:'#fff', border:'1px solid #f1f5f9', borderRadius:'8px'}}>
                    <div>
                      <span style={{fontWeight:'bold', color:'#334155'}}>Status atualizado por {h.supervisor}</span>
                      <div style={{fontSize:'10px', color:'#94a3b8'}}>{new Date(h.date).toLocaleString()} • Ajustes: {h.adjustmentsSnapshot || 0}</div>
                    </div>
                    <span style={{fontWeight:'bold', color: h.amount.includes('+') ? '#10b981' : '#ef4444'}}>
                      {h.amount}
                    </span>
                  </div>
                ))}
                {(!selectedEmployee.history || selectedEmployee.history.length === 0) && <p style={{fontSize:'12px', color:'#94a3b8', textAlign:'center'}}>Nenhum registro.</p>}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// --- ESTILOS ---
const styles = {
  container: { padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
  iconHeader: { width: '45px', height: '45px', borderRadius: '12px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  card: { background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' },

  toolbar: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, minWidth: '250px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px' },
  select: { padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#334155', outline: 'none', cursor: 'pointer', fontSize:'13px', fontWeight:'600' },
  
  viewToggle: { display: 'flex', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px' },
  viewBtn: { padding: '8px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px' },
  viewBtnActive: { padding: '8px', border: 'none', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', borderRadius: '8px' },

  rankingCard: { background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 5px rgba(0,0,0,0.01)' },
  rankingList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  rankingItem: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid #f8fafc' },
  emptyText: { textAlign: 'center', color: '#cbd5e1', fontSize: '12px', padding: '10px', fontStyle: 'italic' },
  cardTitle: { fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' },

  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' },
  employeeCard: { background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' },
  cardHeaderBanner: { height: '60px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display:'flex', justifyContent:'center', alignItems:'start', paddingTop:'10px' },
  cardAvatarWrapper: { width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', margin: '-40px auto 0', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardAvatarPlaceholder: { fontSize: '32px', fontWeight: 'bold', color: '#94a3b8' },
  
  statusBadge: { fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '20px' },
  cardName: { fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '0' },
  cardRole: { fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  cardBalance: { marginTop: '15px', padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' },
  alertPoq: { background: '#fef2f2', color: '#ef4444', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '5px' },

  tableCard: { background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  td: { padding: '15px', fontSize: '14px', color: '#334155' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' },
  actionBtn: { padding: '6px 12px', borderRadius: '8px', background: '#f1f5f9', color: '#334155', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, background: '#2563eb', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer' },

  toggleBtn: { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '5px', fontWeight: 'bold', fontSize: '13px' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', outline: 'none' },
  saveBtn: { padding: '14px', borderRadius: '12px', background: '#1e293b', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
  circleBtn: { width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 'bold', color: '#334155' },
  btnSecondary: { background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }
};
