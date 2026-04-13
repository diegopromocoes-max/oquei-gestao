import React, { useEffect, useRef, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { Activity, CheckCircle2, Info, MapPin, PartyPopper, Trophy, TrendingUp, User, X } from 'lucide-react';

import { db } from '../firebase';
import { normalizeRole } from '../lib/roleUtils';
import { colors } from './ui';

function formatStoreLabel(action = {}) {
  const source = action.cityName || action.storeName || action.cityId || action.storeId || '';
  if (!source) return 'Loja nao informada';

  return String(source)
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function parseDateValue(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLastUpdate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return 'Sem horario';

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RadarLive({ isOpen, onClose, userData }) {
  const [recentActions, setRecentActions] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const isFirstLoad = useRef(true);

  const fireConfetti = (isMeta = false) => {
    if (!isOpen) return;
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      confetti({
        particleCount: isMeta ? 100 : 40,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    }, 250);
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const role = normalizeRole(userData?.role);
    const constraints = [orderBy('createdAt', 'desc'), limit(10)];
    if (role === 'attendant' && userData?.uid) {
      constraints.unshift(where('attendantId', '==', userData.uid));
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'leads'), ...constraints),
      (snapshot) => {
        const docs = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

        if (!isFirstLoad.current && docs.length > 0) {
          const latestAction = docs[0];
          const isNewSale = latestAction.status === 'Contratado' || latestAction.status === 'Instalado';
          if (isNewSale) {
            fireConfetti(latestAction.isMetaBatida);
            setCelebration({
              name: latestAction.attendantName?.split(' ')[0],
              city: formatStoreLabel(latestAction),
              product: latestAction.productName,
              isMeta: latestAction.isMetaBatida,
            });
            window.setTimeout(() => setCelebration(null), 5000);
          }
        }

        setRecentActions(docs);
        isFirstLoad.current = false;
      },
      (error) => {
        console.warn('RadarLive indisponivel para este perfil:', error);
        setRecentActions([]);
      },
    );

    return () => unsubscribe();
  }, [isOpen, userData?.role, userData?.uid]);

  return (
    <>
      {celebration && isOpen && (
        <div style={local.celebrationOverlay}>
          <div style={celebration.isMeta ? local.metaCard : local.saleCard}>
            {celebration.isMeta ? <Trophy size={40} color="#fbbf24" /> : <PartyPopper size={40} color={colors.primary} />}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>
                {celebration.isMeta ? 'META BATIDA' : 'NOVA VENDA'}
              </h4>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontWeight: 600 }}>
                {celebration.name} em {celebration.city}
                <br />
                {celebration.product}
              </p>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <aside style={local.radarAside}>
          <div style={local.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={local.pulseCircle} />
              <h3 style={local.title}>
                RADAR <span style={{ color: 'var(--text-brand)' }}>LIVE</span>
              </h3>
            </div>
            <button onClick={onClose} style={local.closeBtn}><X size={18} /></button>
          </div>

          <div style={local.content} className="hide-scrollbar">
            <div style={local.kpiBox}>
              <TrendingUp size={16} color={colors.success} />
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Ultimas atividades</span>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentActions.map((action) => (
                <div key={action.id} style={local.itemCard}>
                  <div style={{ fontSize: '10px', color: 'var(--text-brand)', fontWeight: 'bold', marginBottom: '4px' }}>
                    {String(action.status || '').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {action.customerName || 'Lead sem nome'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'grid', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={12} />
                      <span>{formatStoreLabel(action)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={12} />
                      <span>{action.attendantName || 'Atendente nao informado'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={12} />
                      <span>{action.productName || 'Produto nao informado'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={12} />
                      <span>Ultima atualizacao: {formatLastUpdate(action.lastUpdate || action.updatedAt || action.createdAt)}</span>
                    </div>
                  </div>
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
  title: { fontSize: '13px', fontWeight: 900, letterSpacing: '1px' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: '20px' },
  kpiBox: { background: 'var(--bg-app)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border)' },
  itemCard: { padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' },
  pulseCircle: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.success, boxShadow: '0 0 8px #10b981' },
  celebrationOverlay: { position: 'absolute', top: '80px', right: '20px', width: '260px', zIndex: 2000, pointerEvents: 'none' },
  saleCard: {
    background: 'var(--bg-panel)',
    color: 'var(--text-main)',
    padding: '20px',
    borderRadius: '20px',
    border: '2px solid var(--text-brand)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  metaCard: {
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    color: '#ffffff',
    padding: '20px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)',
    animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};
