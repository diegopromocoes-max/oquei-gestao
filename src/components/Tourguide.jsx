// ============================================================
//  TourGuide.jsx — Oquei Gestão
//  Sistema de tutorial interativo com:
//    - Modal de boas-vindas personalizado
//    - Spotlight com destaque visual por elemento
//    - Conteúdo dinâmico por perfil de usuário
//    - Persistência via localStorage (aparece só uma vez)
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowRight, ArrowLeft, X, Sparkles,
  CheckCircle2, ChevronRight, Play,
} from 'lucide-react';

// ─── Chave de persistência ────────────────────────────────────────────────────
const STORAGE_KEY = (role) => `oquei_tour_done_${role}`;

// ─── Paleta interna do tour ───────────────────────────────────────────────────
const BRAND   = '#2563EB';
const BRAND_L = 'rgba(37,99,235,0.12)';
const PURPLE  = '#7C3AED';
const SUCCESS = '#10B981';
const WHITE   = '#FFFFFF';
const OVERLAY = 'rgba(0,0,0,0.72)';

// ─── Animações CSS ────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes tg-fadeIn   { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes tg-slideUp  { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes tg-pulse    { 0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.55); } 60% { box-shadow: 0 0 0 10px rgba(37,99,235,0); } }
  @keyframes tg-shimmer  { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes tg-float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
  @keyframes tg-spin     { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes tg-progress { from { width:0%; } to { width:100%; } }
`;

// ─── Definição dos steps por perfil ─────────────────────────────────────────
const TOUR_STEPS = {
  growth_team: [
    {
      targetId:  'tour-visao-geral',
      menuId:    'visao_geral',
      icon:      '🏠',
      color:     BRAND,
      title:     'Visão Geral',
      desc:      'Sua central de comando. Aqui você tem um resumo dos KPIs mais importantes, suas tarefas do dia e atalhos rápidos para qualquer módulo.',
      tip:       'Sempre comece o dia por aqui.',
    },
    {
      targetId:  'tour-hub',
      menuId:    'hub',
      icon:      '⚡',
      color:     PURPLE,
      title:     'Hub de Crescimento',
      desc:      'O coração da operação. Planeje ações estratégicas no Kanban, gerencie reuniões com atas e acompanhe o Dashboard de Growth com ROI, CAC e Score da cidade.',
      tip:       'Use as atas de reunião para converter ideias em planos de ação com um clique.',
    },
    {
      targetId:  'tour-gestao-metas',
      menuId:    'gestao_metas',
      icon:      '🎯',
      color:     SUCCESS,
      title:     'Gestão de Metas',
      desc:      'Defina e acompanhe metas de vendas por cidade, canal e produto. O Simulador S&OP usa inteligência histórica para projetar cenários e gerar insights com IA.',
      tip:       'O insight da IA pode ser salvo e travado para consulta rápida.',
    },
    {
      targetId:  'tour-apuracao',
      menuId:    'apuracao_resultados',
      icon:      '📊',
      color:     '#F59E0B',
      title:     'Apuração de Resultados',
      desc:      'Lance os resultados reais do mês: vendas brutas, cancelamentos e base final. Esses dados alimentam automaticamente o histórico de todas as análises do sistema.',
      tip:       'Quanto mais preciso o lançamento, mais inteligentes ficam os insights.',
    },
    {
      targetId:  'tour-churn',
      menuId:    'laboratorio_churn',
      icon:      '🔬',
      color:     '#EF4444',
      title:     'Laboratório Churn',
      desc:      'Análise profunda de cancelamentos. Explore o Radar de risco, projeções de retenção, inteligência de padrões e estratégias de relacionamento por perfil de cliente.',
      tip:       'Use o Radar para identificar cidades em risco antes do fechamento.',
    },
    {
      targetId:  'tour-hub-oquei',
      menuId:    'hub_oquei',
      icon:      '📡',
      color:     '#0EA5E9',
      title:     'Hub Oquei / Radar',
      desc:      'Visão consolidada de toda a operação Oquei Telecom. Indicadores em tempo real, comparativos entre unidades e alertas automáticos de performance.',
      tip:       'Ideal para monitoramento em reuniões e apresentações.',
    },
  ],
};

// ─── Utilitários ──────────────────────────────────────────────────────────────
function getFirstName(userData) {
  const name = userData?.name || userData?.nome || userData?.displayName || '';
  return name.split(' ')[0] || 'bem-vindo';
}

function getRoleKey(role) {
  const r = String(role || '').toLowerCase().replace(/[\s_-]/g, '');
  if (r.includes('growth')) return 'growth_team';
  return r;
}

// ─── Componente: Modal de Boas-vindas ─────────────────────────────────────────
function WelcomeModal({ userData, onStart, onSkip }) {
  const name      = getFirstName(userData);
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: OVERLAY,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '28px',
        padding: '48px 52px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        animation: ready ? 'tg-fadeIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Gradiente decorativo no topo */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: `linear-gradient(90deg, ${BRAND}, ${PURPLE}, ${SUCCESS})`,
          backgroundSize: '200% auto',
          animation: 'tg-shimmer 2.5s linear infinite',
        }} />

        {/* Ícone flutuante */}
        <div style={{
          width: '80px', height: '80px',
          borderRadius: '24px',
          background: `linear-gradient(135deg, ${BRAND}, ${PURPLE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          fontSize: '36px',
          animation: 'tg-float 3s ease-in-out infinite',
          boxShadow: `0 12px 32px ${BRAND}40`,
        }}>
          🚀
        </div>

        <div style={{ fontSize: '13px', fontWeight: '800', color: BRAND, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Oquei Gestão
        </div>

        <h1 style={{
          fontSize: '28px', fontWeight: '900',
          color: 'var(--text-main)',
          margin: '0 0 12px',
          lineHeight: 1.25,
        }}>
          {greeting}, {name}! 👋
        </h1>

        <p style={{
          fontSize: '15px', color: 'var(--text-muted)',
          lineHeight: '1.7', margin: '0 0 36px',
        }}>
          Seja bem-vindo ao <strong style={{ color: 'var(--text-main)' }}>HUB Oquei</strong>.
          Preparamos um tour rápido para você conhecer os principais módulos do seu painel
          e tirar o máximo proveito do sistema.
        </p>

        {/* Stats do tour */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '32px',
          background: 'var(--bg-app)', borderRadius: '14px',
          padding: '16px 24px', marginBottom: '32px',
          border: '1px solid var(--border)',
        }}>
          {[
            { value: '6', label: 'módulos' },
            { value: '~2', label: 'minutos' },
            { value: '1×', label: 'só hoje' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)' }}>{value}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onStart}
            style={{
              background: `linear-gradient(135deg, ${BRAND}, ${PURPLE})`,
              color: WHITE, border: 'none',
              padding: '16px 32px', borderRadius: '14px',
              fontSize: '15px', fontWeight: '900',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: `0 8px 24px ${BRAND}40`,
              transition: 'all 0.2s',
              animation: 'tg-pulse 2s ease-in-out infinite',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 32px ${BRAND}55`; }}
            onMouseOut={e =>  { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = `0 8px 24px ${BRAND}40`; }}
          >
            <Play size={18} style={{ fill: WHITE }} /> Iniciar Tour
          </button>

          <button
            onClick={onSkip}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', padding: '13px 32px',
              borderRadius: '14px', fontSize: '14px', fontWeight: '700',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
            onMouseOut={e =>  e.currentTarget.style.background = 'transparent'}
          >
            Pular por agora
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Painel do Step ───────────────────────────────────────────────
function StepPanel({ step, stepIndex, totalSteps, onNext, onPrev, onClose, anchorRect }) {
  const panelRef       = useRef(null);
  const [pos, setPos]  = useState({ top: -9999, left: -9999, placement: 'right', visible: false });

  // ── Posicionamento dinâmico ──────────────────────────────────────────────
  // Avalia as 4 direções e escolhe a que tem mais espaço livre sem sobrepor o spotlight.
  // Re-executa sempre que anchorRect ou stepIndex mudam.
  useEffect(() => {
    const compute = () => {
      const panel = panelRef.current;
      if (!panel) return;

      const pw  = panel.offsetWidth  || 340;
      const ph  = panel.offsetHeight || 340;
      const vw  = window.innerWidth;
      const vh  = window.innerHeight;
      const GAP = 16; // espaço entre spotlight e painel
      const PAD = 12; // margem mínima das bordas da tela

      // Se não há anchorRect, centraliza na tela
      if (!anchorRect) {
        setPos({
          top:       Math.max(PAD, (vh - ph) / 2),
          left:      Math.max(PAD, (vw - pw) / 2),
          placement: 'center',
          visible:   true,
        });
        return;
      }

      const { top: aT, left: aL, right: aR, bottom: aB } = anchorRect;
      const aCX = (aL + aR) / 2;  // centro horizontal do alvo
      const aCY = (aT + aB) / 2;  // centro vertical do alvo

      // Espaço disponível em cada direção
      const spaceRight  = vw - aR - GAP;
      const spaceLeft   = aL - GAP;
      const spaceBottom = vh - aB - GAP;
      const spaceTop    = aT - GAP;

      // Candidatos ordenados por espaço disponível
      const candidates = [
        { placement: 'right',  space: spaceRight  },
        { placement: 'left',   space: spaceLeft   },
        { placement: 'bottom', space: spaceBottom },
        { placement: 'top',    space: spaceTop    },
      ].sort((a, b) => b.space - a.space);

      let chosen = candidates[0].placement;

      // Verificação extra: se a direção mais espaçosa não comporta o painel,
      // tentar a próxima que comporte
      for (const c of candidates) {
        const fits =
          (c.placement === 'right'  && spaceRight  >= pw + PAD) ||
          (c.placement === 'left'   && spaceLeft   >= pw + PAD) ||
          (c.placement === 'bottom' && spaceBottom >= ph + PAD) ||
          (c.placement === 'top'    && spaceTop    >= ph + PAD);
        if (fits) { chosen = c.placement; break; }
      }

      let top, left;

      if (chosen === 'right') {
        left = aR + GAP;
        // Centraliza verticalmente ao alvo, mas corrige para não sair da tela
        top  = Math.min(Math.max(aCY - ph / 2, PAD), vh - ph - PAD);
      }
      else if (chosen === 'left') {
        left = aL - pw - GAP;
        top  = Math.min(Math.max(aCY - ph / 2, PAD), vh - ph - PAD);
      }
      else if (chosen === 'bottom') {
        top  = aB + GAP;
        left = Math.min(Math.max(aCX - pw / 2, PAD), vw - pw - PAD);
      }
      else { // top
        top  = aT - ph - GAP;
        left = Math.min(Math.max(aCX - pw / 2, PAD), vw - pw - PAD);
      }

      // Garantia final: nunca sair da tela
      top  = Math.min(Math.max(top,  PAD), vh - ph - PAD);
      left = Math.min(Math.max(left, PAD), vw - pw - PAD);

      setPos({ top, left, placement: chosen, visible: true });
    };

    // Roda imediatamente e depois de um tick para pegar o tamanho real do painel
    compute();
    const t = setTimeout(compute, 60);
    return () => clearTimeout(t);
  }, [anchorRect, stepIndex]);

  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === totalSteps - 1;
  const pct     = Math.round(((stepIndex + 1) / totalSteps) * 100);

  // Seta indicadora — 4 direções + oculta quando centralizado
  const arrowStyle = pos.placement === 'center' ? { display: 'none' } : {
    position: 'absolute',
    width: '12px', height: '12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    transform: 'rotate(45deg)',
    ...(pos.placement === 'right'  && { left:   '-7px', top: '28px', borderRight:  'none', borderTop:    'none' }),
    ...(pos.placement === 'left'   && { right:  '-7px', top: '28px', borderLeft:   'none', borderBottom: 'none' }),
    ...(pos.placement === 'bottom' && { top:    '-7px', left: '28px', borderRight: 'none', borderBottom: 'none' }),
    ...(pos.placement === 'top'    && { bottom: '-7px', left: '28px', borderLeft:  'none', borderTop:    'none' }),
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top:  pos.top,
        left: pos.left,
        zIndex: 10001,
        width: '340px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
        animation: 'tg-slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1) forwards',
        overflow: 'hidden',
        // Transição suave ao mudar de posição entre steps
        transition: 'top 0.35s cubic-bezier(0.34,1.1,0.64,1), left 0.35s cubic-bezier(0.34,1.1,0.64,1), opacity 0.2s',
        opacity: pos.visible ? 1 : 0,
        pointerEvents: pos.visible ? 'auto' : 'none',
      }}
    >
      {/* Seta */}
      <div style={arrowStyle} />

      {/* Barra de progresso */}
      <div style={{ height: '3px', background: 'var(--border)' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${step.color}, ${PURPLE})`,
          borderRadius: '2px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '22px 24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0,
              background: `${step.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
              border: `1px solid ${step.color}30`,
            }}>
              {step.icon}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '900', color: step.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
                {stepIndex + 1} de {totalSteps}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.2 }}>
                {step.title}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', transition: 'color 0.15s' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'}
            onMouseOut={e =>  e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Descrição */}
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7', margin: '0 0 14px' }}>
          {step.desc}
        </p>

        {/* Dica */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          background: `${step.color}0d`,
          border: `1px solid ${step.color}25`,
          borderRadius: '10px', padding: '10px 12px',
          marginBottom: '20px',
        }}>
          <Sparkles size={13} color={step.color} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.5' }}>
            {step.tip}
          </span>
        </div>

        {/* Navegação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onPrev}
            disabled={isFirst}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: isFirst ? 'var(--border)' : 'var(--text-muted)',
              padding: '9px 16px', borderRadius: '10px',
              fontSize: '13px', fontWeight: '700',
              cursor: isFirst ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { if (!isFirst) e.currentTarget.style.background = 'var(--bg-app)'; }}
            onMouseOut={e =>  { e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowLeft size={14} /> Anterior
          </button>

          {/* Dots */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                width:  i === stepIndex ? '18px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === stepIndex ? step.color : 'var(--border)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          <button
            onClick={onNext}
            style={{
              background: isLast
                ? `linear-gradient(135deg, ${SUCCESS}, #059669)`
                : `linear-gradient(135deg, ${step.color}, ${PURPLE})`,
              color: WHITE, border: 'none',
              padding: '9px 18px', borderRadius: '10px',
              fontSize: '13px', fontWeight: '900',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: `0 4px 12px ${isLast ? SUCCESS : step.color}40`,
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${isLast ? SUCCESS : step.color}50`; }}
            onMouseOut={e =>  { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = `0 4px 12px ${isLast ? SUCCESS : step.color}40`; }}
          >
            {isLast ? (
              <><CheckCircle2 size={15} /> Concluir</>
            ) : (
              <>Próximo <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Overlay + Spotlight ─────────────────────────────────────────
function SpotlightOverlay({ rect, onClick }) {
  if (!rect) return (
    <div style={{ position: 'fixed', inset: 0, background: OVERLAY, zIndex: 9999 }} onClick={onClick} />
  );

  const pad = 8;
  const r   = {
    top:    rect.top    - pad,
    left:   rect.left   - pad,
    width:  rect.width  + pad * 2,
    height: rect.height + pad * 2,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Topo */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: r.top, background: OVERLAY }} />
      {/* Baixo */}
      <div style={{ position: 'absolute', top: r.top + r.height, left: 0, right: 0, bottom: 0, background: OVERLAY }} />
      {/* Esquerda */}
      <div style={{ position: 'absolute', top: r.top, left: 0, width: r.left, height: r.height, background: OVERLAY }} />
      {/* Direita */}
      <div style={{ position: 'absolute', top: r.top, left: r.left + r.width, right: 0, height: r.height, background: OVERLAY }} />
      {/* Borda animada no spotlight */}
      <div style={{
        position: 'absolute',
        top:  r.top,
        left: r.left,
        width:  r.width,
        height: r.height,
        borderRadius: '12px',
        boxShadow: `0 0 0 3px ${BRAND}, 0 0 0 6px ${BRAND_L}`,
        animation: 'tg-pulse 1.8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Componente principal: TourGuide ─────────────────────────────────────────
export function TourGuide({ userData, onNavigate, isVisible, onClose }) {
  const roleKey    = getRoleKey(userData?.role);
  const steps      = TOUR_STEPS[roleKey] || [];
  const storageKey = STORAGE_KEY(roleKey);

  const [phase,       setPhase]      = useState('welcome'); // 'welcome' | 'tour' | 'done'
  const [stepIndex,   setStepIndex]  = useState(0);
  const [anchorRect,  setAnchorRect] = useState(null);
  const rafRef = useRef(null);

  // Mede o elemento atual no DOM
  const measureTarget = useCallback((targetId) => {
    const el = document.querySelector(`[data-tour="${targetId}"]`);
    if (!el) { setAnchorRect(null); return; }
    const rect = el.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom });
  }, []);

  // Ao mudar de step, navega para o módulo e mede o elemento
  useEffect(() => {
    if (phase !== 'tour' || !steps.length) return;
    const step = steps[stepIndex];

    // Navega para o módulo do step
    if (onNavigate && step.menuId) {
      onNavigate(step.menuId);
    }

    // Aguarda renderização e mede
    const measure = () => {
      measureTarget(step.targetId);
      rafRef.current = requestAnimationFrame(measure);
    };
    const t = setTimeout(() => {
      measure();
    }, 350);

    return () => {
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stepIndex, phase, steps, onNavigate, measureTarget]);

  const handleStart = useCallback(() => {
    setPhase('tour');
    setStepIndex(0);
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setPhase('done');
    onClose?.();
  }, [storageKey, onClose]);

  const handleNext = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      localStorage.setItem(storageKey, 'true');
      setPhase('done');
      onClose?.();
    }
  }, [stepIndex, steps.length, storageKey, onClose]);

  const handlePrev = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }, [stepIndex]);

  const handleClose = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    localStorage.setItem(storageKey, 'true');
    setPhase('done');
    onClose?.();
  }, [storageKey, onClose]);

  if (!isVisible || phase === 'done' || !steps.length) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>

      {phase === 'welcome' && (
        <WelcomeModal
          userData={userData}
          onStart={handleStart}
          onSkip={handleSkip}
        />
      )}

      {phase === 'tour' && (
        <>
          <SpotlightOverlay rect={anchorRect} onClick={() => {}} />
          <StepPanel
            step={steps[stepIndex]}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            anchorRect={anchorRect}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={handleClose}
          />
        </>
      )}
    </>
  );
}

// ─── Hook utilitário ─────────────────────────────────────────────────────────
/**
 * Retorna true se o tour ainda não foi exibido para este perfil.
 * Use no componente pai para decidir se exibe o TourGuide.
 */
export function useShouldShowTour(role) {
  const key = STORAGE_KEY(getRoleKey(role));
  return !localStorage.getItem(key);
}

/**
 * Reseta o tour para que apareça novamente na próxima visita.
 * Use num botão "Ver tour novamente" nas configurações.
 */
export function resetTour(role) {
  localStorage.removeItem(STORAGE_KEY(getRoleKey(role)));
}