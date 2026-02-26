import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { 
  MapPin, Truck, Clock, CheckCircle, 
  Info, Megaphone, Phone, Trash2, Plus, X, Calendar, User
} from 'lucide-react';

export default function JapaSupervisor({ userData }) {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  
  // Estado para controlar a posição da van (animação)
  const [vanPosition, setVanPosition] = useState(0);
  
  // Estado do Formulário
  const [form, setForm] = useState({
    title: '', date: '', time: '09:00', city: userData?.cityId || '',
    location: '', description: '', type: 'Panfletagem'
  });

  // Cronograma Fevereiro 2026 (Mockado conforme solicitado)
  const MOCK_SCHEDULE = [
    { id: 1, date: '2026-02-02', city: 'Novo Horizonte / Cedral', location: 'NH Manhã / Cedral Tarde', activity: 'Ação Comercial', time: 'Integral' },
    { id: 2, date: '2026-02-06', city: 'Borborema', location: 'Porta da Loja', activity: 'Ação Porta de Loja', time: 'Comercial' },
    { id: 3, date: '2026-02-07', city: 'Borborema', location: 'Centro', activity: 'Inauguração 19H', time: '19:00' },
    { id: 4, date: '2026-02-08', city: 'Borborema', location: 'Centro', activity: 'Festa São João', time: '09:00' },
    { id: 5, date: '2026-02-13', city: 'Bady Bassitt', location: 'Centro', activity: 'Ação Comercial', time: 'Integral' },
    { id: 6, date: '2026-02-14', city: 'Borborema', location: 'Loja Oficial', activity: 'Inauguração da Loja', time: 'Integral' },
    { id: 7, date: '2026-02-16', city: 'Sales', location: 'Praça', activity: 'Ação de Vendas', time: 'Integral' },
    { id: 8, date: '2026-02-20', city: 'Nova Granada', location: 'Centro', activity: 'Ação Comercial', time: 'Integral' },
    { id: 9, date: '2026-02-21', city: 'Urupês', location: 'Centro', activity: 'Ação Comercial', time: 'Integral' },
    { id: 10, date: '2026-02-25', city: 'São José do Rio Preto', location: 'Rota da Moda', activity: 'Evento Empresas (Fechado)', time: 'Integral' },
    { id: 11, date: '2026-02-26', city: 'Potirendaba', location: 'Centro', activity: 'Ação Comercial', time: 'Integral' },
    { id: 12, date: '2026-02-27', city: 'Neves Paulista', location: 'Centro', activity: 'Ação Comercial', time: 'Integral' },
  ];

  // --- CARREGAMENTO ---
  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "marketing_actions")); 
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      let finalData = [];
      if (list.length === 0) {
        finalData = MOCK_SCHEDULE;
      } else {
        finalData = list.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      
      setActions(finalData);
      
      // Calcular posição da Van (Onde ela deve parar)
      const today = new Date().toISOString().split('T')[0];
      const todayIndex = finalData.findIndex(a => a.date >= today);
      
      // Se achou evento futuro/hoje, para nele. Se não, vai pro final.
      const targetIndex = todayIndex !== -1 ? todayIndex : finalData.length - 1;
      
      // Pequeno delay para a animação acontecer
      setTimeout(() => {
        setVanPosition(targetIndex * 120); // 120px é a altura estimada de cada card no mapa
      }, 500);

    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const getStatus = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return 'past';
    if (dateStr === today) return 'today';
    return 'future';
  };

  // --- HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "marketing_actions"), {
        ...form,
        requesterId: auth.currentUser.uid,
        requesterName: userData.name,
        clusterId: userData.clusterId,
        status: 'Pendente',
        createdAt: serverTimestamp()
      });
      alert("Solicitação enviada para o Japa!");
      setShowModal(false);
      setForm({ ...form, title: '', location: '', description: '' });
      fetchActions();
    } catch (err) { alert("Erro: " + err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Cancelar esta solicitação?")) {
      await deleteDoc(doc(db, "marketing_actions", id));
      fetchActions();
    }
  };

  return (
    <div style={styles.container}>
      
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div style={styles.iconHeader}><Truck size={32} color="white"/></div>
        <div>
          <h1 style={styles.title}>Rota do Japa</h1>
          <p style={styles.subtitle}>Acompanhe onde a Van da Oquei está passando!</p>
        </div>
      </div>

      {/* AVISO IMPORTANTE */}
      <div style={styles.noticeBox}>
        <div style={styles.noticeIcon}><Info size={24} color="#1e40af"/></div>
        <div>
          <h3 style={styles.noticeTitle}>Alterações de Rota</h3>
          <p style={styles.noticeText}>
            Para alterar datas ou incluir sua cidade na rota, fale com a <strong>Raine (Marketing)</strong>.
          </p>
        </div>
      </div>

      <div style={styles.content}>
        
        {/* BARRA DE COMANDOS */}
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'20px'}}>
           <button onClick={() => setShowModal(true)} style={styles.fabBtn}>
             <Plus size={18} style={{marginRight:'8px'}} /> Solicitar Ação
           </button>
        </div>

        {/* MAPA / ROADMAP */}
        <div style={styles.mapContainer}>
          
          {/* ESTRADA (LINHA CENTRAL) */}
          <div style={styles.roadLine}></div>

          {/* VAN ANIMADA */}
          <div style={{...styles.vanActor, transform: `translateY(${vanPosition}px)`}}>
            <div style={styles.vanPulse}></div>
            <div style={styles.vanBody}><Truck size={20} color="white" /></div>
            <div style={styles.vanLabel}>Japa Aqui</div>
          </div>

          {/* PARADAS (EVENTOS) */}
          <div style={styles.stopsContainer}>
            {actions.map((item, index) => {
              const status = getStatus(item.date);
              const dateObj = new Date(item.date + 'T12:00:00');

              return (
                <div key={item.id} style={styles.stopRow}>
                  
                  {/* DATA (ESQUERDA) */}
                  <div style={styles.dateSide}>
                    <span style={{...styles.dayNum, color: status === 'past' ? '#94a3b8' : '#1e3a8a'}}>
                      {dateObj.getDate()}
                    </span>
                    <span style={styles.monthName}>
                      {dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                    </span>
                  </div>

                  {/* ALFINETE (CENTRO) */}
                  <div style={styles.pinWrapper}>
                     <div style={{
                       ...styles.pinDot, 
                       background: status === 'past' ? '#cbd5e1' : status === 'today' ? '#2563eb' : 'white',
                       border: status === 'future' ? '4px solid #2563eb' : 'none'
                     }}>
                       {status === 'past' && <CheckCircle size={12} color="white"/>}
                     </div>
                  </div>

                  {/* CARD DA CIDADE (DIREITA) */}
                  <div style={{
                    ...styles.cityCard,
                    opacity: status === 'past' ? 0.6 : 1,
                    borderColor: status === 'today' ? '#2563eb' : '#e2e8f0',
                    boxShadow: status === 'today' ? '0 4px 12px rgba(37,99,235,0.15)' : 'none'
                  }}>
                    <h3 style={styles.cityName}>
                      <MapPin size={16} style={{marginRight:'5px', color:'#ef4444'}}/>
                      {item.city}
                    </h3>
                    <p style={styles.activityText}>{item.activity}</p>
                    <div style={styles.metaRow}>
                      <span><Clock size={12}/> {item.time}</span>
                      <span>•</span>
                      <span>{item.location}</span>
                    </div>
                    
                    {item.requesterId === auth.currentUser?.uid && (
                      <button onClick={() => handleDelete(item.id)} style={styles.deleteLink}>Cancelar</button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* MODAL DE SOLICITAÇÃO */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{fontSize:'20px', fontWeight:'bold', color:'#1e293b'}}>Chamar o Japa</h3>
              <button onClick={() => setShowModal(false)} style={styles.btnClose}><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div><label style={styles.label}>O que vamos fazer?</label><input style={styles.input} placeholder="Ex: Panfletagem na Praça" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}><div><label style={styles.label}>Tipo de Ação</label><select style={styles.input} value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Panfletagem</option><option>Carro de Som</option><option>Porta de Loja</option><option>Evento na Cidade</option><option>Inauguração</option></select></div><div><label style={styles.label}>Data Sugerida</label><input type="date" style={styles.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div></div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}><div><label style={styles.label}>Cidade</label><input style={styles.input} value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Cidade da ação" required /></div><div><label style={styles.label}>Horário Início</label><input type="time" style={styles.input} value={form.time} onChange={e => setForm({...form, time: e.target.value})} required /></div></div>
              <div><label style={styles.label}>Local Específico</label><input style={styles.input} placeholder="Ex: Em frente ao Banco Bradesco" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required /></div>
              <div><label style={styles.label}>Detalhes / Observações</label><textarea style={{...styles.input, height:'80px', resize:'none'}} placeholder="Descreva a estratégia ou necessidade..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <button type="submit" style={styles.btnSubmit} disabled={loading}>{loading ? 'Enviando...' : 'Enviar Pedido'}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// --- ESTILOS INLINE (PREMIUM) ---
const styles = {
  container: { padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  iconHeader: { width: '60px', height: '60px', borderRadius: '16px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },

  noticeBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '20px', marginBottom: '40px', display: 'flex', gap: '20px', alignItems: 'center' },
  noticeIcon: { background: '#dbeafe', padding: '12px', borderRadius: '50%' },
  noticeTitle: { fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px', marginTop: 0 },
  noticeText: { fontSize: '14px', color: '#1e40af', lineHeight: '1.5', margin: 0 },

  content: { position: 'relative' },
  
  // ROADMAP
  mapContainer: { position: 'relative', marginTop: '20px' },
  roadLine: { position: 'absolute', left: '70px', top: '20px', bottom: '20px', width: '4px', background: '#e2e8f0', borderRadius: '2px', zIndex: 0 },
  
  // VAN ANIMATION
  vanActor: { position: 'absolute', left: '52px', top: '0', zIndex: 10, transition: 'transform 1s cubic-bezier(0.25, 1, 0.5, 1)', display:'flex', alignItems:'center' },
  vanBody: { width: '40px', height: '40px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', position:'relative', zIndex:2 },
  vanPulse: { position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #2563eb', animation: 'ping 1.5s infinite', zIndex:1 },
  vanLabel: { position: 'absolute', left: '50px', background: '#2563eb', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', whiteSpace:'nowrap' },

  stopsContainer: { display: 'flex', flexDirection: 'column', gap: '0px' },
  stopRow: { display: 'flex', alignItems: 'stretch', minHeight: '120px' },
  
  dateSide: { width: '50px', textAlign: 'right', paddingTop: '20px', paddingRight: '20px' },
  dayNum: { display: 'block', fontSize: '20px', fontWeight: '900', lineHeight: 1 },
  monthName: { fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' },

  pinWrapper: { width: '40px', display: 'flex', justifyContent: 'center', paddingTop: '24px', position: 'relative' },
  pinDot: { width: '16px', height: '16px', borderRadius: '50%', background: 'white', border: '4px solid #e2e8f0', zIndex: 1, display:'flex', alignItems:'center', justifyContent:'center' },
  
  cityCard: { flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '20px', marginLeft: '20px', position: 'relative' },
  cityName: { fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0', display:'flex', alignItems:'center' },
  activityText: { fontSize: '14px', color: '#334155', fontWeight: '500' },
  metaRow: { display: 'flex', gap: '8px', fontSize: '12px', color: '#64748b', marginTop: '10px', alignItems: 'center' },
  deleteLink: { position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' },

  fabBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' },

  // MODAL
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  btnClose: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '5px', display: 'block' },
  input: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', color: '#1e293b', boxSizing: 'border-box' },
  btnSubmit: { padding: '16px', borderRadius: '14px', background: '#ea580c', color: 'white', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginTop: '10px' }
};

// Estilos globais
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
`;
document.head.appendChild(styleSheet);
