import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
BookOpen, Target, MessageCircle, Store, CheckCircle, AlertTriangle,
HelpCircle, Star, Zap, ShoppingBag
} from 'lucide-react';

const ICON_MAP = {
BookOpen, Target, MessageCircle, Store, CheckCircle, AlertTriangle,
HelpCircle, Star, Zap, ShoppingBag
};

const DEFAULT_CONTENT = {
vendas: {
id: 'vendas',
title: "Técnicas de Vendas",
icon: "Target",
color: "#2563eb",
order: 1,
items: [
{
title: "A Abordagem Perfeita",
text: "Sorria sempre. O cliente precisa sentir que é bem-vindo. Use o nome dele assim que descobrir. Exemplo: 'Bom dia, seja bem-vindo à Oquei Telecom! Meu nome é [Seu Nome], como posso ajudar?'"
},
{
title: "Sondagem de Necessidades",
list: [
"Quantas pessoas usam a internet na casa?",
"Vocês jogam online, assistem muito streaming ou trabalham de casa?",
"Como é o sinal do Wi-Fi nos fundos da casa?"
]
},
{
title: "Gatilhos Mentais",
text: "Use escassez ('Essa condição de instalação grátis é válida apenas para os contratos fechados hoje') e prova social ('Muitos vizinhos seus aqui no bairro já mudaram para a Oquei por causa da estabilidade')."
}
]
},
objecoes: {
id: 'objecoes',
title: "Quebra de Objeções",
icon: "MessageCircle",
color: "#ea580c",
order: 2,
items: [
{
title: "A concorrência é mais barata",
text: "Entendo que o preço é importante. Mas o senhor já calculou a dor de cabeça de ficar sem internet no meio de um filme ou trabalho? A Oquei entrega estabilidade real e suporte rápido aqui mesmo na cidade. O barato pode sair muito caro.",
isAlert: true
},
{
title: "Vou pensar e te falo",
text: "Claro! Mas o que exatamente o senhor precisa pensar? Ficou alguma dúvida sobre o plano ou o valor? Se fecharmos agora, consigo agendar sua instalação com prioridade."
},
{
title: "Estou preso na fidelidade de outra operadora",
text: "Muitos clientes nossos também estavam. Que mês acaba a sua? Dependendo do valor da multa, a diferença de qualidade e o que o senhor ganha com os nossos serviços compensam a troca imediata."
}
]
},
rotina: {
id: 'rotina',
title: "Rotina da Loja",
icon: "Store",
color: "#10b981",
order: 3,
items: [
{
title: "Abertura da Loja",
list: [
"Chegar com 15 minutos de antecedência.",
"Ligar as luzes, ar condicionado e totens de atendimento.",
"Verificar a limpeza e organização do balcão e cadeiras.",
"Bater o ponto no sistema Sólides exatamente no horário."
]
},
{
title: "Fechamento da Loja",
list: [
"Fazer a conferência e fechamento do caixa (Desencaixe).",
"Organizar os papéis, contratos e a mesa de atendimento.",
"Desligar equipamentos e ar condicionado.",
"Trancar as portas e ativar o alarme antes de sair."
]
},
{
title: "Padrão de Vestimenta",
text: "O uniforme deve estar sempre limpo e passado. Cabelos alinhados e aparência profissional são fundamentais para transmitir confiança aos nossos clientes."
}
]
}
};

export default function ManualAtendente({ userData }) {
const [content, setContent] = useState(null);
const [activeTab, setActiveTab] = useState('');
const [loading, setLoading] = useState(true);

useEffect(() => {
const fetchManual = async () => {
try {
const docRef = doc(db, "settings", "manual_atendente");
const docSnap = await getDoc(docRef);

    if (docSnap.exists() && Object.keys(docSnap.data()).length > 0) {
      const data = docSnap.data();
      const mergedData = { ...DEFAULT_CONTENT, ...data };
      setContent(mergedData);
      
      const sortedTabs = Object.values(mergedData).sort((a,b) => a.order - b.order);
      setActiveTab(sortedTabs[0]?.id || 'vendas');
    } else {
      await setDoc(docRef, DEFAULT_CONTENT);
      setContent(DEFAULT_CONTENT);
      setActiveTab('vendas');
    }
  } catch (err) { 
    setContent(DEFAULT_CONTENT);
    setActiveTab('vendas');
  }
  setLoading(false);
};
fetchManual();


}, []);

if (loading) return <div style={{padding:40, textAlign:'center', color: '#64748b'}}>A carregar manual de vendas...</div>;
if (!content) return null;

const tabs = Object.values(content).sort((a, b) => a.order - b.order);
const currentSection = content[activeTab];

const renderIcon = (iconName, size, color) => {
const IconComp = ICON_MAP[iconName] || BookOpen;
return <IconComp size={size} color={color} />;
};

return (
<div style={styles.container}>
<div style={styles.header}>
<div style={styles.iconHeader}>
<BookOpen size={28} color="white"/>
</div>
<div>
<h1 style={styles.title}>Manual do Consultor</h1>
<p style={styles.subtitle}>Scripts de vendas, quebra de objeções e rotinas.</p>
</div>
</div>

  <div style={styles.tabsContainer}>
    {tabs.map(tab => (
      <button 
        key={tab.id} 
        onClick={() => setActiveTab(tab.id)} 
        style={activeTab === tab.id ? {...styles.tabActive, color: tab.color, borderColor: tab.color} : styles.tab}
      >
        {renderIcon(tab.icon, 18, activeTab === tab.id ? tab.color : '#94a3b8')} 
        {tab.title}
      </button>
    ))}
  </div>

  {currentSection && (
    <div style={styles.contentArea}>
      <div style={styles.grid2}>
        {currentSection.items.map((item, index) => (
          <div key={index} style={{
            ...styles.card, 
            borderLeft: item.isAlert ? '4px solid #ef4444' : '1px solid #e2e8f0',
            background: item.isAlert ? '#fff1f2' : 'white'
          }}>
            <div style={styles.cardHeaderIcon}>
                {item.isAlert && <AlertTriangle size={20} color="#ef4444" />}
                {item.title}
            </div>
            {item.text && <p style={{...styles.text, color: item.isAlert ? '#7f1d1d' : '#475569'}}>{item.text}</p>}
            {item.list && (
              <ul style={styles.list}>
                {item.list.map((li, i) => (
                  <li key={i} style={styles.listItem}>
                    <CheckCircle size={14} color={currentSection.color} style={{flexShrink:0, marginTop:3}}/> 
                    {li}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )}
</div>


);
}

const styles = {
container: { animation: 'fadeIn 0.4s ease-out' },
header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)' },
title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },

tabsContainer: { display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px', marginBottom: '30px', overflowX: 'auto' },
tab: { padding: '12px 20px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid transparent', transition: '0.2s', whiteSpace: 'nowrap' },
tabActive: { padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid', transition: '0.2s', whiteSpace: 'nowrap' },

contentArea: { minHeight: '400px' },
grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' },
card: { background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },

cardHeaderIcon: { fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' },
text: { fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' },
list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
listItem: { display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: '#475569', lineHeight: '1.4' }
};