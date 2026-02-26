import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, getDocs, where } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import { 
  DollarSign, MapPin, Calendar, Users, Star, UploadCloud, 
  Save, CheckCircle, FileText, Megaphone, Paperclip, History, Download, Plus
} from 'lucide-react';

export default function PatrocinioSupervisor({ userData }) {
  const [activeTab, setActiveTab] = useState('nova');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [cities, setCities] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  
  // Estado do Formulário
  const [form, setForm] = useState({
    eventName: '',
    city: '',
    location: '',
    dateTime: '',
    organizer: '',
    contact: '',
    targetAudience: '',
    expectedAudience: '',
    supportRequested: '',
    isExchange: false, // Permuta
    observations: '',
    priority: 0 // 1 a 5
  });

  const isCoordinator = userData?.role === 'coordinator';

  // --- CARREGAMENTO ---
  useEffect(() => {
    fetchCities();
    fetchHistory();
  }, [userData]);

  const fetchCities = async () => {
    try {
      const q = query(collection(db, "cities")); 
      const snap = await getDocs(q);
      setCities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    try {
      let q;
      if (isCoordinator) {
        // Coordenador vê todos os pedidos
        q = query(collection(db, "sponsorships"));
      } else if (auth?.currentUser) {
        // Supervisor vê os próprios
        q = query(collection(db, "sponsorships"), where("supervisorId", "==", auth.currentUser.uid));
      } else {
        return;
      }
      
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryList(list);
    } catch (err) { console.error(err); }
  };

  // --- GERADOR DE PDF PREMIUM (CORES E LOGO OQUEI) ---
  const generatePDF = async (data) => {
    const doc = new jsPDF();
    
    // 1. Função para carregar a imagem da logo e converter em Base64 para o PDF
    const loadLogo = () => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null); 
        img.src = "[https://lh6.googleusercontent.com/proxy/OQmnkD6TxExvN5uvw-zWOpJHZ6qW-J6aJaUPlJX4Y06C_IRXAN3CooFhuzMisQmGCpNS9aQkpjPNcH2YOZs-CeiOuVKjlDO6oqSsDIFrSS2hGse8ug](https://lh6.googleusercontent.com/proxy/OQmnkD6TxExvN5uvw-zWOpJHZ6qW-J6aJaUPlJX4Y06C_IRXAN3CooFhuzMisQmGCpNS9aQkpjPNcH2YOZs-CeiOuVKjlDO6oqSsDIFrSS2hGse8ug)";
      });
    };

    const logoBase64 = await loadLogo();

    // 2. Cores da Marca Oquei
    const blueOquei = [37, 99, 235]; // #2563eb
    const orangeOquei = [245, 158, 11]; // #f59e0b

    // 3. Cabeçalho Principal (Fundo Azul)
    doc.setFillColor(...blueOquei);
    doc.rect(0, 0, 210, 35, 'F');

    // Insere Logo ou Texto de Fallback
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 35, 15);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("OQUEI TELECOM", 14, 22);
    }

    // Título do Documento
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("SOLICITAÇÃO DE PATROCÍNIO", 195, 22, null, null, "right");

    // 4. Informações Base
    doc.setTextColor(100, 116, 139); // Text Light
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    let y = 45;
    const emitDate = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString();
    
    doc.text(`Data da Solicitação: ${emitDate}`, 14, y);
    doc.text(`Solicitante: ${data.supervisorName || 'Usuário'}`, 120, y);
    doc.setDrawColor(226, 232, 240); // Linha divisória
    doc.line(14, y + 3, 195, y + 3);
    y += 15;

    // Função auxiliar para desenhar o título das seções
    const drawSectionTitle = (title, posY) => {
      doc.setFillColor(...orangeOquei);
      doc.rect(14, posY - 5, 3, 6, 'F'); 
      doc.setTextColor(30, 41, 59); 
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, 20, posY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
    };

    // --- SEÇÃO 1 ---
    drawSectionTitle("DADOS DO EVENTO", y);
    y += 8;
    doc.text(`Nome do Evento: ${data.eventName}`, 14, y); y += 6;
    doc.text(`Cidade / Regional: ${data.city}`, 14, y); y += 6;
    doc.text(`Local Específico: ${data.location}`, 14, y); y += 6;
    const formattedDate = data.dateTime ? new Date(data.dateTime).toLocaleString('pt-BR') : 'Não informada';
    doc.text(`Data e Horário: ${formattedDate}`, 14, y); y += 15;

    // --- SEÇÃO 2 ---
    drawSectionTitle("ORGANIZAÇÃO E PÚBLICO", y);
    y += 8;
    doc.text(`Organizador Responsável: ${data.organizer}`, 14, y); y += 6;
    doc.text(`Contato: ${data.contact}`, 14, y); y += 6;
    doc.text(`Público Alvo: ${data.targetAudience || 'Não informado'}`, 14, y); y += 6;
    doc.text(`Expectativa de Público: ${data.expectedAudience || 'Não informado'} pessoas`, 14, y); y += 15;

    // --- SEÇÃO 3 ---
    drawSectionTitle("DETALHES DA SOLICITAÇÃO (NEGOCIAÇÃO)", y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Apoio Solicitado pela Organização:", 14, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    const splitSupport = doc.splitTextToSize(data.supportRequested, 180);
    doc.text(splitSupport, 14, y);
    y += (splitSupport.length * 5) + 5;

    doc.setFont("helvetica", "bold");
    doc.text(`Fornecimento em Permuta (Internet): ${data.isExchange ? 'SIM' : 'NÃO'}`, 14, y);
    doc.setFont("helvetica", "normal");
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Observações / Justificativa do Supervisor:", 14, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    const splitObs = doc.splitTextToSize(data.observations || 'Nenhuma observação adicional.', 180);
    doc.text(splitObs, 14, y);
    y += (splitObs.length * 5) + 5;

    // Caixa de Prioridade
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 181, 12, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...orangeOquei);
    doc.text(`GRAU DE PRIORIDADE ESTRATÉGICA: ${data.priority} de 5`, 18, y + 8);
    y += 25;

    // --- RODAPÉ ---
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("* Documento gerado pelo Portal Interno Oquei Telecom.", 14, 280);
    doc.text("* Sujeito à análise e aprovação formal da Diretoria de Marketing.", 14, 284);

    doc.save(`Patrocinio_Oquei_${data.eventName.replace(/\s+/g, '_')}.pdf`);
  };

  // --- HANDLERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.priority === 0) return alert("Por favor, defina o nível de prioridade.");
    
    setLoading(true);
    try {
      const requestData = {
        ...form,
        supervisorId: auth.currentUser?.uid || 'user-id',
        supervisorName: userData?.name || 'Supervisor',
        clusterId: userData?.clusterId || 'Geral',
        status: 'Pendente', 
        createdAt: serverTimestamp(),
        fileName: fileName || 'Sem anexo'
      };

      await addDoc(collection(db, "sponsorships"), requestData);

      // Geração do PDF chamando a função Async
      await generatePDF({
          ...requestData,
          createdAt: { seconds: Math.floor(Date.now() / 1000) } 
      });

      alert("✅ Solicitação de Patrocínio enviada para o Marketing e PDF gerado!");
      
      // Resetar formulário
      setForm({
        eventName: '', city: '', location: '', dateTime: '', organizer: '', contact: '',
        targetAudience: '', expectedAudience: '', supportRequested: '', isExchange: false,
        observations: '', priority: 0
      });
      setFileName(null);
      
      // Atualizar lista e mudar aba
      fetchHistory();
      setActiveTab('historico');
      
    } catch (err) {
      alert("Erro ao enviar: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div style={styles.iconHeader}><Megaphone size={28} color="white"/></div>
        <div>
          <h1 style={styles.title}>Solicitação de Patrocínio</h1>
          <p style={styles.subtitle}>Envie propostas de eventos e parcerias para o Marketing.</p>
        </div>
      </div>

      {/* ABAS */}
      <div style={styles.navTabs}>
        <button onClick={() => setActiveTab('nova')} style={activeTab === 'nova' ? styles.navTabActive : styles.navTab}>
          <Plus size={16} /> Nova Solicitação
        </button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? styles.navTabActive : styles.navTab}>
          <History size={16} /> Histórico de Envios
        </button>
      </div>

      <div style={styles.content}>
        
        {/* ABA: NOVA SOLICITAÇÃO */}
        {activeTab === 'nova' && (
          <form onSubmit={handleSubmit} style={{...styles.formGrid, animation: 'fadeIn 0.3s'}}>
            
            {/* BLOCO 1: DADOS DO EVENTO */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>1. Dados do Evento</h3>
              
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Nome do Evento</label>
                  <input style={styles.input} placeholder="Ex: Festa do Peão de Bady" value={form.eventName} onChange={e => setForm({...form, eventName: e.target.value})} required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Cidade</label>
                  <select style={styles.input} value={form.city} onChange={e => setForm({...form, city: e.target.value})} required>
                    <option value="">Selecione a Cidade...</option>
                    {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Local Específico</label>
                  <div style={styles.inputIconWrapper}>
                    <MapPin size={18} color="#94a3b8" />
                    <input style={styles.inputIcon} placeholder="Ex: Recinto de Exposições" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required />
                  </div>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Data e Horário</label>
                  <div style={styles.inputIconWrapper}>
                    <Calendar size={18} color="#94a3b8" />
                    <input type="datetime-local" style={styles.inputIcon} value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} required />
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCO 2: ORGANIZAÇÃO E PÚBLICO */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>2. Organização e Público</h3>
              
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Organizador Responsável</label>
                  <input style={styles.input} placeholder="Nome da empresa ou pessoa" value={form.organizer} onChange={e => setForm({...form, organizer: e.target.value})} required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Contato (Tel/Email)</label>
                  <input style={styles.input} placeholder="(00) 00000-0000" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} required />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Público Alvo</label>
                  <input style={styles.input} placeholder="Ex: Jovens, Famílias, Empresários" value={form.targetAudience} onChange={e => setForm({...form, targetAudience: e.target.value})} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Expectativa de Público</label>
                  <div style={styles.inputIconWrapper}>
                    <Users size={18} color="#94a3b8" />
                    <input type="number" style={styles.inputIcon} placeholder="Qtd. Pessoas" value={form.expectedAudience} onChange={e => setForm({...form, expectedAudience: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCO 3: NEGOCIAÇÃO */}
            <div style={{...styles.section, borderLeft: '4px solid #f59e0b', background: '#fffbeb'}}>
              <h3 style={{...styles.sectionTitle, color: '#b45309'}}>3. Detalhes da Solicitação</h3>
              
              <div style={styles.field}>
                <label style={styles.label}>Apoio Solicitado (Descreva o que precisamos fornecer)</label>
                <textarea style={{...styles.input, height: '80px', background:'white'}} placeholder="Ex: R$ 2.000,00 em dinheiro + 2 Tendas + 50 brindes..." value={form.supportRequested} onChange={e => setForm({...form, supportRequested: e.target.value})} required />
              </div>

              <div style={{marginTop: '15px', marginBottom: '15px'}}>
                <label style={{display:'flex', alignItems:'center', gap:'12px', padding:'15px', background:'white', borderRadius:'12px', cursor:'pointer', border:'1px solid #fcd34d'}}>
                  <input type="checkbox" checked={form.isExchange} onChange={e => setForm({...form, isExchange: e.target.checked})} style={{transform:'scale(1.5)', accentColor: '#f59e0b'}} />
                  <div>
                    <span style={{fontWeight:'700', color:'#92400e', fontSize: '15px'}}>Fornecimento em Permuta?</span>
                    <p style={{fontSize: '12px', color: '#b45309', margin: 0}}>Marque se forneceremos link de internet como parte do pagamento.</p>
                  </div>
                </label>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Observações do Supervisor</label>
                <textarea style={{...styles.input, height: '80px', background:'white'}} placeholder="Sua análise sobre o retorno de marca..." value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} />
              </div>

              <div style={{marginTop: '20px'}}>
                <label style={{...styles.label, marginBottom: '10px', display: 'block'}}>Nível de Prioridade / Importância</label>
                <div style={{display:'flex', gap:'10px'}}>
                  {[1,2,3,4,5].map(star => (
                    <Star 
                      key={star} size={32} 
                      fill={star <= form.priority ? "#f59e0b" : "none"} 
                      color={star <= form.priority ? "#f59e0b" : "#cbd5e1"} 
                      style={{cursor:'pointer', transition: '0.2s'}}
                      onClick={() => setForm({...form, priority: star})}
                    />
                  ))}
                </div>
                <p style={{fontSize: '12px', color: '#64748b', marginTop: '5px'}}>
                  {form.priority === 5 ? "Extrema Importância (Estratégico)" : form.priority === 1 ? "Baixa Prioridade" : "Selecione o nível"}
                </p>
              </div>
            </div>

            {/* UPLOAD */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Anexos</h3>
              <label htmlFor="file-upload" style={styles.uploadBox}>
                <input id="file-upload" type="file" style={{display: 'none'}} onChange={handleFileChange} />
                <Paperclip size={32} color="#94a3b8" />
                <span style={{fontSize: '14px', color: '#64748b', fontWeight: '600', marginTop: '10px'}}>
                  {fileName ? `Arquivo: ${fileName}` : "Clique para anexar PDF, Artes ou Layouts"}
                </span>
                <span style={{fontSize: '11px', color: '#cbd5e1', marginTop: '5px'}}>Formatos: PDF, JPG, PNG</span>
              </label>
            </div>

            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Processando...' : 'Enviar Solicitação e Baixar Relatório PDF'}
            </button>
          </form>
        )}

        {/* ABA: HISTÓRICO */}
        {activeTab === 'historico' && (
           <div style={{animation: 'fadeIn 0.3s'}}>
              <h2 style={{fontSize:'20px', fontWeight:'bold', color:'#1e293b', marginBottom:'20px'}}>Meus Pedidos de Patrocínio</h2>
              <div style={styles.tableCard}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Evento</th>
                      <th style={styles.th}>Cidade</th>
                      <th style={styles.th}>Status</th>
                      <th style={{...styles.th, textAlign:'right'}}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.length === 0 ? (
                      <tr><td colSpan="5" style={{padding:'40px', textAlign:'center', color:'#94a3b8'}}>Nenhuma solicitação enviada.</td></tr>
                    ) : (
                      historyList.map(req => (
                        <tr key={req.id} style={styles.tableRow}>
                          <td style={styles.td}>
                             {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}
                          </td>
                          <td style={{...styles.td, fontWeight:'bold', color:'#334155'}}>{req.eventName}</td>
                          <td style={styles.td}>{req.city}</td>
                          <td style={styles.td}>
                             <span style={{
                               padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                               background: req.status === 'Aprovado' ? '#ecfdf5' : req.status === 'Recusado' ? '#fef2f2' : '#fffbeb',
                               color: req.status === 'Aprovado' ? '#10b981' : req.status === 'Recusado' ? '#ef4444' : '#d97706'
                             }}>
                               {req.status}
                             </span>
                          </td>
                          <td style={{...styles.td, textAlign:'right'}}>
                             <button onClick={() => generatePDF(req)} style={styles.btnDownload}>
                               <Download size={14} /> PDF
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        )}

      </div>
    </div>
  );
}

// --- ESTILOS INLINE (PREMIUM) ---
const styles = {
  container: { padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },
  
  navTabs: { display: 'flex', gap: '5px', background: '#f1f5f9', padding: '6px', borderRadius: '14px', marginBottom: '30px', width: 'fit-content' },
  navTab: { padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center', transition: '0.2s' },
  navTabActive: { padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'white', color: '#1e293b', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' },

  content: { background: 'white', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  
  formGrid: { display: 'flex', flexDirection: 'column', gap: '30px' },
  section: { padding: '25px', border: '1px solid #f1f5f9', borderRadius: '20px', background: '#fcfdfe' },
  sectionTitle: { fontSize: '15px', fontWeight: '800', color: '#334155', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' },
  
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '700', color: '#475569' },
  
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#1e293b', width: '100%', boxSizing: 'border-box', transition: 'border 0.2s', backgroundColor: 'white' },
  inputIconWrapper: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '12px', background: 'white' },
  inputIcon: { flex: 1, border: 'none', padding: '14px 0', outline: 'none', fontSize: '15px' },
  
  uploadBox: { border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', transition: '0.2s' },
  
  btnPrimary: { padding: '18px', borderRadius: '16px', background: '#2563eb', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '16px', marginTop: '10px', width: '100%', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.2)', transition: 'transform 0.2s' },

  // Tabelas
  tableCard: { backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  tableHeaderRow: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '16px 20px', fontWeight: '800', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' },
  tableRow: { borderBottom: '1px solid #f1f5f9', transition: '0.2s' },
  td: { padding: '16px 20px', verticalAlign: 'middle', color: '#475569' },
  btnDownload: { background: '#eff6ff', color: '#2563eb', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }
};
