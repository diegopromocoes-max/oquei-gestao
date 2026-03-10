import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { X, MapPin, TrendingUp, Trophy, PartyPopper, Zap, BellRing } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RadarLive({ isOpen, onClose, userData }) {
  const [recentActions, setRecentActions] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const isFirstLoad = useRef(true);

  // Função de Confetes (Só dispara se o Radar estiver aberto)
  const fireConfetti = (isMeta = false) => {
    if (!isOpen) return; // Trava de segurança: só faz festa se estiver vendo o radar
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      confetti({ particleCount: isMeta ? 100 : 40, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
    }, 250);
  };

  useEffect(() => {
    // O "Ouvido" do Firebase agora nunca dorme!
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (!isFirstLoad.current && docs.length > 0) {
        const latestAction = docs[0];
        const isNewSale = latestAction.status === 'Contratado' || latestAction.status === 'Instalado';

        if (isNewSale) {
          if (isOpen) {
            // --- EFEITO COMPLETO (RADAR ABERTO) ---
            fireConfetti(latestAction.isMetaBatida);
            setCelebration({
              name: latestAction.attendantName?.split(' ')[0],
              city: latestAction.cityId,
              product: latestAction.productName,
              isMeta: latestAction.isMetaBatida
            });
            setTimeout(() => setCelebration(null), 5000);
          } else {
            // --- NOTIFICAÇÃO DISCRETA (RADAR FECHADO) ---
            // Usamos o window.showToast que você já tem no LayoutGlobal
            window.showToast(
              `${latestAction.attendantName?.split(' ')[0]} acabou de vender em ${latestAction.cityId}! 🚀`, 
              latestAction.isMetaBatida ? 'success' : 'info'
            );
          }
        }
      }
      setRecentActions(docs);
      isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, [isOpen]); // Recarrega a lógica quando abre/fecha para garantir o contexto

  return (
    <>
      {/* 1. CELEBRAÇÃO GRANDE (SÓ APARECE SE ABERTO) */}
      {celebration && isOpen && (
        <div style={local.celebrationOverlay}>
          <div style={celebration.isMeta ? local.metaCard : local.saleCard}>
            {celebration.isMeta ? <Trophy size={40} color="#fbbf24" /> : <PartyPopper size={40} color="#2563eb" />}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>
                {celebration.isMeta ? '🏆 META BATIDA!' : '🚀 NOVA VENDA!'}
              </h4>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontWeight: '600' }}>
                {celebration.name} em {celebration.city} <br/> {celebration.product}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. A BARRA LATERAL (SÓ RENDERIZA SE isOpen FOR TRUE) */}
      {isOpen && (
        <aside style={local.radarAside}>
          <div style={local.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={local.pulseCircle} />
              <h3 style={local.title}>RADAR <span style={{ color: 'var(--text-brand)' }}>LIVE</span></h3>
            </div>
            <button onClick={onClose} style={local.closeBtn}><X size={18} /></button>
          </div>
          
          <div style={local.content} className="hide-scrollbar">
            <div style={local.kpiBox}>
              <TrendingUp size={16} color="#10b981" />
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Últimas Atividades</span>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentActions.map((action) => (
                <div key={action.id} style={local.itemCard}>
                   <div style={{fontSize: '10px', color: 'var(--text-brand)', fontWeight: 'bold', marginBottom: '4px'}}>
                    {action.status?.toUpperCase()}
                   </div>
                   <div style={{fontSize: '13px', fontWeight: 'bold'}}>{action.customerName}</div>
                   <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px'}}>{action.cityId} • {action.productName}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      <style>{`
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}

const local = {
  radarAside: { width: '300px', backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', animation: 'fadeInRight 0.3s ease' },
  header: { padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '13px', fontWeight: '900', letterSpacing: '1px' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: '20px' },
  kpiBox: { background: 'var(--bg-app)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border)' },
  itemCard: { padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' },
  pulseCircle: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' },
  
  celebrationOverlay: {
    position: 'absolute', top: '80px', right: '20px', width: '260px', zIndex: 2000, pointerEvents: 'none'
  },
  saleCard: {
    background: 'var(--bg-panel)', color: 'var(--text-main)', padding: '20px', borderRadius: '20px',
    border: '2px solid var(--text-brand)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)', animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  metaCard: {
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: 'white', 
    padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)', animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }
};