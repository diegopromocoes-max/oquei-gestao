import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  BookOpen, Target, Eye, Heart, CheckCircle, Shield, 
  Users, MessageCircle, Clock, AlertTriangle, FileText, 
  MousePointerClick, Calendar, FileCheck, HelpCircle, XCircle, Info,
  UserX, Megaphone, Mail, AlertOctagon, Store, Wallet, DollarSign,
  Edit, Plus, Save, Trash2, X, Layout, TrendingUp, RefreshCw
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

// --- MAPA DE ÍCONES ---
const ICON_MAP = {
  BookOpen, Target, Eye, Heart, CheckCircle, Shield, Users, MessageCircle, 
  Clock, AlertTriangle, FileText, MousePointerClick, Calendar, FileCheck, 
  HelpCircle, XCircle, Info, UserX, Megaphone, Mail, AlertOctagon, Store, 
  Wallet, DollarSign, Layout, TrendingUp
};

// --- CONTEÚDO PADRÃO ---
const DEFAULT_CONTENT = {
  identidade: {
    id: 'identidade',
    title: "Missão e Cultura",
    icon: "Target",
    color: "#db2777",
    order: 1,
    items: [
      { 
        title: "A Missão do Cargo", 
        text: "Atuar como responsável pela performance da Oquei em sua cidade, garantindo resultado comercial, participação de mercado, fortalecimento da marca e excelência operacional das lojas. Liderar o crescimento sustentável da empresa no município, mobilizando equipes, eliminando falhas, criando estratégias locais e assegurando que a Oquei seja percebida como a melhor escolha pela população." 
      },
      { 
        title: "Visão Oquei", 
        text: "Ser a referência absoluta em qualidade de atendimento no interior de São Paulo." 
      },
      { 
        title: "Valores", 
        list: ["Compromisso com o Cliente", "Inovação Constante", "Transparência", "Excelência Operacional"] 
      }
    ]
  },
  comercial: {
    id: 'comercial',
    title: "Estratégia e Metas",
    icon: "TrendingUp",
    color: "#10b981",
    order: 2,
    items: [
      { 
        title: "Gestão Comercial", 
        list: [
          "Acompanhar diariamente indicadores em vendas, ticket médio, cancelamentos e evolução das metas.",
          "Conduzir reuniões de performance, elaborar planos de ação individuais por cidade e corrigir falhas.",
          "Incentivar cultura de vendas e reforçar foco no resultado em toda a equipe.",
          "Trabalhar junto ao setor de retenção para antecipar problemas e reduzir o churn."
        ] 
      },
      { 
        title: "Gestão Estratégica da Cidade", 
        list: [
          "Acompanhar indicadores da cidade: cancelamentos, churn, share, crescimento e penetração nos bairros.",
          "Desenvolver estratégias para elevar a participação da Oquei na cidade, ampliando a base de clientes.",
          "Criar planos de crescimento por bairro, ponto comercial e praça de atuação.",
          "Identificar oportunidades comerciais (parcerias, locais para ações de vendas, pontos de contato)."
        ] 
      }
    ]
  },
  marca: {
    id: 'marca',
    title: "Marca e Marketing",
    icon: "Megaphone",
    color: "#f59e0b",
    order: 3,
    items: [
      { 
        title: "Presença Local", 
        text: "Garantir que a Oquei seja bem vista e reconhecida na cidade, fortalecendo a presença da marca por meio de ações, comunicação clara e boa visibilidade local." 
      },
      { 
        title: "Ações Práticas", 
        list: [
          "Apoiar campanhas, eventos, ações sociais, reforçando a imagem de qualidade e proximidade.",
          "Reportar necessidades de marketing local e sugerir ações que aumentem visibilidade e conversão.",
          "Acompanhar a execução de materiais, identidade visual e presença nos PDVs."
        ] 
      }
    ]
  },
  operacional: {
    id: 'operacional',
    title: "Operação de Loja",
    icon: "Store",
    color: "#7c3aed",
    order: 4,
    items: [
      { 
        title: "Gestão Operacional Diária", 
        list: [
          "Monitorar performance operacional garantindo padrões de abertura, fechamento, caixa, estoque e organização.",
          "Realizar visitas periódicas às lojas para avaliar processos e corrigir falhas.",
          "Manter a disciplina operacional reduzindo retrabalhos e inconsistências.",
          "Zelar pelo patrimônio, documentos, sistemas e informações sigilosas da empresa."
        ] 
      },
      { 
        title: "Experiência do Cliente", 
        list: [
          "Garantir qualidade no atendimento e atuar ativamente na redução de reclamações.",
          "Analisar causas de insatisfação e implementar ações corretivas imediatas."
        ] 
      }
    ]
  },
  lideranca: {
    id: 'lideranca',
    title: "Equipe e Integração",
    icon: "Users",
    color: "#2563eb",
    order: 5,
    items: [
      { 
        title: "Gestão de Pessoas", 
        list: [
          "Organizar escalas, coberturas, férias e estrutura de equipes das unidades.",
          "Conduzir processos seletivos, admissões, desligamentos, treinamentos e feedbacks estruturados.",
          "Promover o desenvolvimento das equipes e reforçar boas práticas."
        ] 
      },
      { 
        title: "Integração entre Setores", 
        text: "Atuar como ponte entre as lojas e os setores internos (RH, DP, Marketing, Compras/Estoque, Comercial, Financeiro e TI), garantindo o entendimento das diretrizes e monitorando a execução." 
      }
    ]
  },
  ponto: {
    id: 'ponto',
    title: "RH & Ponto",
    icon: "Clock",
    color: "#ef4444",
    order: 6,
    items: [
      { 
        title: "Regra de Ouro: POQ (Sólides)", 
        text: "Se o colaborador tiver mais de 4 solicitações de correção manual no período, o POQ do mês seguinte será ZERADO.", 
        isAlert: true 
      },
      { 
        title: "Atestados (Prazo de 48h)", 
        text: "NÃO anexamos atestado no Sólides. O supervisor deve enviar por e-mail para o RH em até 48h da emissão.",
        isAlert: true
      },
      { 
        title: "Conferência de Ponto", 
        list: [
          "Período de apuração: Do dia 26 do mês anterior ao dia 25 do mês atual.",
          "Símbolo (m): Indica ajuste manual. Fique atento ao limite.",
          "O ponto correto deve ter apenas 4 batidas diárias.",
          "Folgas devem ser lançadas como 'Compensação Banco de Horas'."
        ] 
      }
    ]
  }
};

export default function ManualSupervisor({ userData }) {
  const [content, setContent] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estados de Edição
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  
  // Verificação robusta de permissão
  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (userData?.role === 'coordinator') {
        setIsCoordinator(true);
      } else if (auth.currentUser) {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists() && userSnap.data().role === 'coordinator') {
          setIsCoordinator(true);
        }
      }
    };
    checkRole();
  }, [userData]);

  // --- CARREGAMENTO ---
  useEffect(() => {
    const fetchManual = async () => {
      try {
        const docRef = doc(db, "settings", "manual_supervisor");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && Object.keys(docSnap.data()).length > 0) {
          const data = docSnap.data();
          const mergedData = { ...DEFAULT_CONTENT, ...data };
          setContent(mergedData);
          
          const sortedTabs = Object.values(mergedData).sort((a,b) => a.order - b.order);
          setActiveTab(sortedTabs[0]?.id || 'identidade');
        } else {
          await setDoc(docRef, DEFAULT_CONTENT);
          setContent(DEFAULT_CONTENT);
          setActiveTab('identidade');
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchManual();
  }, []);

  // --- FUNÇÕES DE EDIÇÃO ---
  const handleSave = async () => {
    try {
      await setDoc(doc(db, "settings", "manual_supervisor"), editData);
      setContent(editData);
      setIsEditing(false);
      alert("Manual atualizado com sucesso!");
    } catch (err) { alert("Erro ao salvar: " + err.message); }
  };

  const startEditing = () => {
    setEditData(JSON.parse(JSON.stringify(content))); 
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditData(null);
    setIsEditing(false);
  };

  const restoreDefault = () => {
    if (window.confirm("ATENÇÃO: Isso apagará todas as suas edições manuais e restaurará o manual para a versão oficial (DC). Deseja continuar?")) {
      setEditData(JSON.parse(JSON.stringify(DEFAULT_CONTENT)));
      alert("Padrão oficial restaurado! Clique em 'Salvar' para aplicar ao banco de dados.");
    }
  };

  const updateCardField = (tabId, index, field, value) => {
    const newData = { ...editData };
    newData[tabId].items[index][field] = value;
    setEditData(newData);
  };

  const addCard = (tabId) => {
    const newData = { ...editData };
    newData[tabId].items.push({ title: "Novo Título", text: "Insira o conteúdo aqui..." });
    setEditData(newData);
  };

  const removeCard = (tabId, index) => {
    if(!window.confirm("Remover este item?")) return;
    const newData = { ...editData };
    newData[tabId].items.splice(index, 1);
    setEditData(newData);
  };

  const addListItem = (tabId, cardIndex) => {
    const newData = { ...editData };
    if (!newData[tabId].items[cardIndex].list) newData[tabId].items[cardIndex].list = [];
    newData[tabId].items[cardIndex].list.push("Novo item");
    setEditData(newData);
  };

  const updateListItem = (tabId, cardIndex, listIndex, value) => {
    const newData = { ...editData };
    newData[tabId].items[cardIndex].list[listIndex] = value;
    setEditData(newData);
  };

  const removeListItem = (tabId, cardIndex, listIndex) => {
    const newData = { ...editData };
    newData[tabId].items[cardIndex].list.splice(listIndex, 1);
    setEditData(newData);
  };

  const createNewTab = () => {
    if (!newTabName) return;
    const id = newTabName.toLowerCase().replace(/\s+/g, '_');
    const newData = { ...editData };
    newData[id] = {
      id: id,
      title: newTabName,
      icon: "BookOpen",
      color: "#3b82f6", // Cor dinâmica default
      order: Object.keys(newData).length + 1,
      items: []
    };
    setEditData(newData);
    setActiveTab(id);
    setShowNewTabModal(false);
    setNewTabName('');
  };

  if (loading) return <div style={{padding:40, textAlign:'center', color: 'var(--text-muted)'}}>A carregar Manual...</div>;
  if (!content) return null;

  const displayData = isEditing ? editData : content;
  const tabs = Object.values(displayData).sort((a, b) => a.order - b.order);
  const currentSection = displayData[activeTab];

  const renderIcon = (iconName, size, color) => {
    const IconComp = ICON_MAP[iconName] || BookOpen;
    return <IconComp size={size} color={color} />;
  };

  return (
    <div style={global.container}>
      <div style={global.header}>
        <div style={{...global.iconHeader, background: isEditing ? '#f59e0b' : '#2563eb'}}>
          {isEditing ? <Edit size={24} color="white"/> : <BookOpen size={24} color="white"/>}
        </div>
        <div>
          <h1 style={global.title}>Manual do Supervisor {isEditing && "(Edição)"}</h1>
          <p style={global.subtitle}>Diretrizes, responsabilidades e procedimentos baseados na DC.</p>
        </div>
        
        {isCoordinator && (
          <div style={{marginLeft: 'auto', display:'flex', gap:'10px', flexWrap: 'wrap'}}>
            {!isEditing ? (
              <button onClick={startEditing} style={local.btnAction}>
                <Edit size={16} /> Editar Manual
              </button>
            ) : (
              <>
                <button onClick={restoreDefault} style={local.btnRestore} title="Restaurar versão original da DC">
                  <RefreshCw size={16} /> Padrão
                </button>
                <button onClick={cancelEditing} style={global.btnSecondary}>Cancelar</button>
                <button onClick={handleSave} style={{...global.btnPrimary, width: 'auto'}}><Save size={16} /> Salvar</button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={local.tabsContainer}>
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            style={activeTab === tab.id ? {...local.tabActive, color: tab.color, borderColor: tab.color} : local.tab}
          >
            {renderIcon(tab.icon, 18, activeTab === tab.id ? tab.color : 'var(--text-muted)')} 
            {isEditing ? (
               <input 
                 value={tab.title} 
                 onChange={(e) => {
                    const newData = {...editData};
                    newData[tab.id].title = e.target.value;
                    setEditData(newData);
                 }}
                 style={local.inputTab}
               />
            ) : tab.title}
          </button>
        ))}
        {isEditing && (
          <button onClick={() => setShowNewTabModal(true)} style={local.btnAddTab}>
            <Plus size={16} /> Nova Aba
          </button>
        )}
      </div>

      {currentSection && (
        <div style={{ minHeight: '400px', animation: 'fadeIn 0.4s' }}>
          <div style={local.grid2}>
            {currentSection.items.map((item, index) => (
              <div key={index} style={{
                ...global.card, 
                borderLeft: item.isAlert ? '4px solid #ef4444' : '1px solid var(--border)',
                background: item.isAlert ? 'var(--bg-danger-light)' : 'var(--bg-card)'
              }}>
                
                {isEditing ? (
                   <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', gap: '10px'}}>
                        <input 
                          value={item.title} 
                          onChange={(e) => updateCardField(activeTab, index, 'title', e.target.value)}
                          style={{...global.input, padding: '8px', fontSize: '15px', fontWeight: 'bold'}}
                          placeholder="Título"
                        />
                        <button onClick={() => removeCard(activeTab, index)} style={global.iconBtn}><Trash2 size={16} color="#ef4444"/></button>
                      </div>
                      
                      <textarea 
                        value={item.text || ''} 
                        onChange={(e) => updateCardField(activeTab, index, 'text', e.target.value)}
                        style={{...global.textarea, minHeight: '80px', padding: '8px', fontSize: '13px'}}
                        placeholder="Texto descritivo..."
                      />

                      <label style={{fontSize:'12px', display:'flex', alignItems:'center', gap:'5px', color: 'var(--text-main)', fontWeight: 'bold'}}>
                        <input type="checkbox" checked={item.isAlert} onChange={(e) => updateCardField(activeTab, index, 'isAlert', e.target.checked)}/> 
                        Destacar como Alerta
                      </label>

                      {(item.list || []).map((li, liIndex) => (
                         <div key={liIndex} style={{display:'flex', gap:'5px', alignItems:'center'}}>
                            <div style={{width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', flexShrink:0}} />
                            <input 
                              value={li}
                              onChange={(e) => updateListItem(activeTab, index, liIndex, e.target.value)}
                              style={{...global.input, padding: '6px', fontSize: '13px'}}
                            />
                            <button onClick={() => removeListItem(activeTab, index, liIndex)} style={{background:'none', border:'none', cursor:'pointer'}}><X size={12} color="#ef4444"/></button>
                         </div>
                      ))}
                      <button onClick={() => addListItem(activeTab, index)} style={local.btnAddList}>+ Item Lista</button>
                   </div>
                ) : (
                   <>
                      <div style={local.cardHeaderIcon}>
                         {item.isAlert && <AlertTriangle size={20} color="#ef4444" />}
                         {item.title}
                      </div>
                      {item.text && <p style={{...local.text, color: item.isAlert ? '#ef4444' : 'var(--text-muted)'}}>{item.text}</p>}
                      {item.list && (
                        <ul style={local.list}>
                          {item.list.map((li, i) => (
                            <li key={i} style={local.listItem}>
                              <CheckCircle size={14} color={currentSection.color} style={{flexShrink:0, marginTop:3}}/> 
                              {li}
                            </li>
                          ))}
                        </ul>
                      )}
                   </>
                )}
              </div>
            ))}
            {isEditing && (
              <button onClick={() => addCard(activeTab)} style={local.cardAdd}>
                <Plus size={32} color="var(--border)" />
                <span>Adicionar Card</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE NOVA ABA */}
      {showNewTabModal && (
        <div style={global.modalOverlay}>
           <div style={{...global.modalBox, maxWidth: '400px'}}>
              <div style={global.modalHeader}>
                <h3 style={global.modalTitle}>Nova Categoria</h3>
                <button onClick={() => setShowNewTabModal(false)} style={global.closeBtn}><X size={20}/></button>
              </div>
              <input 
                value={newTabName} 
                onChange={e => setNewTabName(e.target.value)} 
                style={global.input} 
                placeholder="Ex: Novos Processos" 
                autoFocus 
              />
              <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                 <button onClick={() => setShowNewTabModal(false)} style={global.btnSecondary}>Cancelar</button>
                 <button onClick={createNewTab} style={global.btnPrimary}>Criar Aba</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// Estilos específicos do editor/manual
const local = {
  tabsContainer: { display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '1px', marginBottom: '30px', overflowX: 'auto', scrollbarWidth: 'none' },
  tab: { padding: '12px 20px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid transparent', transition: '0.2s', whiteSpace: 'nowrap' },
  tabActive: { padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid', transition: '0.2s', whiteSpace: 'nowrap' },
  
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' },
  cardAdd: { background: 'var(--bg-panel)', padding: '25px', borderRadius: '16px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', minHeight: '150px', transition: '0.2s' },
  
  cardHeaderIcon: { fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' },
  text: { fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' },
  list: { listStyle: 'none', padding: 0, margin: '15px 0 0 0', display: 'flex', flexDirection: 'column', gap: '12px' },
  listItem: { display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' },
  
  btnAction: { background: 'var(--bg-primary-light)', color: 'var(--text-brand)', border: '1px solid var(--text-brand)', padding: '10px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' },
  btnRestore: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' },
  btnAddTab: { background: 'var(--bg-panel)', color: 'var(--text-muted)', border: '1px dashed var(--border)', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' },

  inputTab: { border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', width: '120px', outline: 'none' },
  btnAddList: { background: 'none', border: 'none', color: 'var(--text-brand)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', textAlign: 'left' }
};