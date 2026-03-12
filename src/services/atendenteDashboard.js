import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

/**
 * 1. Escuta as Vendas/Leads do Atendente Logado
 * Retorna as estatísticas do mês atual em tempo real.
 */
export const listenAtendenteStats = (uid, monthPrefix, callback) => {
  const q = query(collection(db, "leads"), where("attendantId", "==", uid));
  
  return onSnapshot(q, (snap) => {
    const allDocs = snap.docs.map(d => d.data());
    
    // Filtra apenas os leads criados no mês atual
    const monthDocs = allDocs.filter(l => l.date && l.date.startsWith(monthPrefix));
    
    // Considera como "venda fechada" apenas os status Contratado ou Instalado
    const sales = monthDocs.filter(l => ['Contratado', 'Instalado'].includes(l.status));
    
    // Calcula os totais com blindagem extra (procurando pelo nome da categoria ou leadType)
    const stats = {
      totalLeads: monthDocs.length,
      totalSales: sales.length,
      planos: sales.filter(l => l.categoryName?.toLowerCase().includes('plano') || l.leadType === 'Plano Novo').length,
      migracoes: sales.filter(l => l.categoryName?.toLowerCase().includes('migra') || l.leadType === 'Migração').length,
      svas: sales.filter(l => l.categoryName?.toLowerCase().includes('sva') || l.leadType === 'SVA').length
    };

    callback(stats, null);
  }, (error) => {
    console.error("Erro ao buscar estatísticas do atendente: ", error);
    callback(null, error);
  });
};

/**
 * 2. Escuta os Avisos (Mural do Marketing/RH)
 * Retorna as 5 mensagens mais recentes direcionadas à loja ou a toda a rede.
 */
export const listenMessages = (cityId, uid, callback) => {
  const q = query(collection(db, "messages"));
  
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Filtra mensagens globais, da loja do atendente ou mensagens diretas para ele
      .filter(m => m.to === 'all' || m.to === cityId || m.to === uid)
      // Ordena da mais recente para a mais antiga
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      // Pega apenas as 5 últimas para não poluir o painel
      .slice(0, 5); 
      
    callback(msgs);
  }, (error) => {
    console.error("Erro ao buscar mensagens do mural: ", error);
  });
};

/**
 * 3. Escuta a Escala e Lojas Fechadas da Rede
 * Retorna todas as ausências e um array específico de lojas que estão sem cobertura (fechadas).
 */
export const listenNetworkAbsences = (callback) => {
  const q = query(collection(db, "absences"));
  
  return onSnapshot(q, (snap) => {
    const today = new Date().toISOString().split('T')[0];
    const closedStores = [];
    const allAbsences = [];
    
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      allAbsences.push({ id: docSnap.id, ...data });
      
      // Verifica se há alguma loja fechada de hoje em diante no mapa de cobertura
      if (data.coverageMap) {
        Object.entries(data.coverageMap).forEach(([date, coverageType]) => {
          if (date >= today && coverageType === 'loja_fechada') {
            closedStores.push({ 
              store: data.storeId || data.storeName || 'Desconhecida', 
              date 
            });
          }
        });
      }
    });
    
    // Ordena os alertas de lojas fechadas por data (as mais próximas primeiro)
    closedStores.sort((a, b) => a.date.localeCompare(b.date));
    
    callback({ closedStores, allAbsences });
  }, (error) => {
    console.error("Erro ao buscar escala e ausências: ", error);
  });
};