// ============================================================
//  AnaliseResultados.jsx — Oquei Insights
//  Cruzamento: dados operacionais × pesquisa de campo
//  Vulnerabilidade de concorrentes, gatilhos, market share
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Target, TrendingUp, TrendingDown, Users, Shield, Zap,
  AlertTriangle, CheckCircle, RefreshCw, Lightbulb, Settings,
  X, Save, BarChart3, MapPin, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { Card, Btn, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';

// ── Constantes do questionário de Mirassolândia ──────────────
// Mapeia intenção → label de resposta na pesquisa
const Q = {
  PROVEDOR:       'Qual empresa fornece sua internet atualmente?',
  NPS:            'De 0 a 10, o quanto você recomendaria sua operadora atual para um vizinho?',
  VELOCIDADE:     'Você sente que a velocidade que você paga é a que realmente chega na sua casa?',
  PROBLEMAS:      'Quais os principais problemas que acontecem com a sua intenet atual?',
  MELHOR:         'Na sua opinião, qual é o melhor provedor que atende Mirassolândia hoje?',
  HOME_OFFICE:    'Alguém na residência utiliza a internet para trabalhar ou estudar (Home Office)?',
  USUARIOS:       'Quantas pessoas utilizam a internet simultaneamente na sua casa?',
  PRIORIDADE:     'O que mais pesa para você na hora de escolher ou manter sua internet?',
  CONHECE_OQUEI:  'Você já conhecia a Oquei Telecom antes desta entrevista?',
  MOTIVO_NAO:     'Qual o principal motivo para você ainda não ser cliente Oquei?',
  GATILHO:        'O que te faria trocar de operadora de internet hoje?',
};

const OQUEI = 'Oquei Telecom';
const CONCORRENTES_ORDEM = ['N4 telecom','Claro','Vivo','LazerNet','Starlink'];

// ── Helpers ───────────────────────────────────────────────────
const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0;
const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

function getQId(questions, label) {
  return questions.find(q => q.label?.trim() === label?.trim())?.id;
}

function getAns(r, qId) {
  return qId ? r.answers?.[qId] : undefined;
}

// ── Score de vulnerabilidade (0-10) por entrevistado ─────────
function calcVulnerabilidade(r, qIds) {
  let score = 0, max = 0;

  const nps = Number(getAns(r, qIds.nps));
  if (!isNaN(nps)) {
    max += 3;
    if (nps <= 3) score += 3;
    else if (nps <= 6) score += 2;
    else if (nps <= 7) score += 1;
  }

  const vel = getAns(r, qIds.velocidade);
  max += 2;
  if (vel === 'Não') score += 2;

  const probs = getAns(r, qIds.problemas);
  const probsArr = Array.isArray(probs) ? probs : [];
  const probsRelevantes = probsArr.filter(p => p !== 'Nenhum problema');
  max += 3;
  score += Math.min(probsRelevantes.length, 3);

  const melhor = getAns(r, qIds.melhor);
  const provedor = getAns(r, qIds.provedor);
  max += 1;
  if (melhor && provedor && melhor !== provedor) score += 1;

  const motivo = getAns(r, qIds.motivoNao);
  max += 2;
  if (motivo === 'Nunca recebi uma oferta') score += 2;
  else if (motivo === 'Não confia na estabilidade da Oquei') score += 0;
  else if (motivo === 'Preço') score += 1;

  return max > 0 ? Math.round((score / max) * 10) : 0;
}

// ── Gráfico de barras horizontal ──────────────────────────────
function HBar({ label, value, max, color, right, sublabel, highlight }) {
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: highlight ? '900' : '700', color: highlight ? color : 'var(--text-main)' }}>{label}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {sublabel && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sublabel}</span>}
          <span style={{ fontSize: '13px', fontWeight: '900', color }}>{right || value}</span>
        </div>
      </div>
      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: '20px', transition: 'width 0.7s ease' }}/>
      </div>
    </div>
  );
}

// ── Medidor de vulnerabilidade ────────────────────────────────
function VulnMeter({ score, n }) {
  const color = score >= 7 ? colors.success : score >= 5 ? colors.warning : score >= 3 ? colors.info : colors.danger;
  const label = score >= 7 ? 'MUITO VULNERÁVEL' : score >= 5 ? 'VULNERÁVEL' : score >= 3 ? 'MODERADO' : 'BLINDADO';
  const icon  = score >= 7 ? '🔓' : score >= 5 ? '🔑' : score >= 3 ? '🔒' : '🛡️';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="9"/>
          <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={`${(score/10)*175.9} 175.9`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
        </div>
      </div>
      <div style={{ fontSize: '20px', fontWeight: '900', color, lineHeight: 1 }}>{score}<span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/10</span></div>
      <div style={{ fontSize: '9px', fontWeight: '900', color, letterSpacing: '0.08em', textAlign: 'center' }}>{label}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{n} entrev.</div>
    </div>
  );
}

// ── Pill de badge ─────────────────────────────────────────────
function Pill({ label, color, size = 'sm' }) {
  const p = size === 'sm' ? '2px 9px' : '4px 12px';
  const fs = size === 'sm' ? '11px' : '12px';
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}40`, color, borderRadius: '20px', padding: p, fontSize: fs, fontWeight: '800' }}>
      {label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function AnaliseResultados({ userData }) {
  const [surveys,       setSurveys]       = useState([]);
  const [responses,     setResponses]     = useState([]);
  const [cities,        setCities]        = useState([]);
  const [cityResults,   setCityResults]   = useState([]);
  const [monthlyBases,  setMonthlyBases]  = useState([]);
  const [loading,       setLoading]       = useState(true);

  const [selSurvey,  setSelSurvey]  = useState('all');
  const [selCity,    setSelCity]    = useState('all');
  const [selMonth,   setSelMonth]   = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [aiInsights,  setAiInsights]  = useState('');
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState('');

  // ── Dados operacionais + pesquisa ─────────────────────────────
  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db,'surveys'), snap => setSurveys(
        snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.status==='active'||s.status==='finished')
      )),
      onSnapshot(collection(db,'survey_responses'), snap => {
        setResponses(snap.docs.map(d=>({id:d.id,...d.data()})));
        setLoading(false);
      }),
      onSnapshot(collection(db,'cities'), snap => setCities(snap.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,'city_results'), snap => setCityResults(snap.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(collection(db,'monthly_bases'),where('month','==',selMonth)), snap => {
        setMonthlyBases(snap.docs.map(d=>d.data()));
      }),
    ];
    return () => unsubs.forEach(u=>u());
  }, [selMonth]);

  // ── Filtros ───────────────────────────────────────────────────
  const respostas = useMemo(() => {
    let list = responses.filter(r => r.auditStatus==='aceita' || !r.auditStatus);
    if (selSurvey !== 'all') list = list.filter(r => r.surveyId === selSurvey);
    return list;
  }, [responses, selSurvey]);

  const survey = useMemo(() => surveys.find(s=>s.id===selSurvey), [surveys, selSurvey]);
  const questions = survey?.questions || [];

  // ── IDs das perguntas relevantes ─────────────────────────────
  const qIds = useMemo(() => ({
    provedor:   getQId(questions, Q.PROVEDOR),
    nps:        getQId(questions, Q.NPS),
    velocidade: getQId(questions, Q.VELOCIDADE),
    problemas:  getQId(questions, Q.PROBLEMAS),
    melhor:     getQId(questions, Q.MELHOR),
    homeOffice: getQId(questions, Q.HOME_OFFICE),
    usuarios:   getQId(questions, Q.USUARIOS),
    prioridade: getQId(questions, Q.PRIORIDADE),
    conheceOquei: getQId(questions, Q.CONHECE_OQUEI),
    motivoNao:  getQId(questions, Q.MOTIVO_NAO),
    gatilho:    getQId(questions, Q.GATILHO),
  }), [questions]);

  // ── Dados operacionais da cidade selecionada ──────────────────
  const opData = useMemo(() => {
    const city = selCity !== 'all' ? cities.find(c=>c.id===selCity) : null;
    const mb = selCity !== 'all' ? monthlyBases.find(b=>b.cityId===selCity) : null;
    const result = selCity !== 'all'
      ? cityResults.find(r => r.cityId===selCity && r.month===selMonth) ||
        cityResults.find(r => r.id===`${selMonth}_${selCity}`)
      : null;

    const baseStart  = Number(mb?.baseStart  ?? city?.baseStart  ?? 0);
    const baseEnd    = Number(mb?.baseEnd    ?? city?.baseEnd    ?? 0);
    const potencial  = Number(city?.potencial ?? 0);

    let vendas = 0, cancelamentos = 0;
    if (result?.vendas) {
      Object.values(result.vendas).forEach(canal => {
        Object.values(canal).forEach(v => { vendas += Number(v||0); });
      });
    }
    cancelamentos = Number(result?.cancelamentos || 0);
    const netAdds    = vendas - cancelamentos;
    const penetracao = potencial > 0 ? pct(baseEnd||baseStart, potencial) : 0;
    const churnRate  = baseStart > 0 ? ((cancelamentos/baseStart)*100).toFixed(1) : '—';

    return { baseStart, baseEnd: baseEnd||baseStart, potencial, vendas, cancelamentos, netAdds, penetracao, churnRate };
  }, [selCity, cities, monthlyBases, cityResults, selMonth]);

  // ── Análise de mercado da pesquisa ────────────────────────────
  const market = useMemo(() => {
    if (!respostas.length || !qIds.provedor) return null;

    // Distribuição por provedor
    const dist = {};
    respostas.forEach(r => {
      const p = getAns(r, qIds.provedor) || 'Outro';
      dist[p] = (dist[p]||0) + 1;
    });

    // Por cada provedor concorrente: score de vulnerabilidade + gatilhos
    const provedores = Object.entries(dist)
      .filter(([p]) => p !== OQUEI)
      .map(([nome, n]) => {
        const clientes = respostas.filter(r => getAns(r, qIds.provedor) === nome);
        const scores = clientes.map(r => calcVulnerabilidade(r, qIds));
        const scoreMedio = Math.round(avg(scores));

        // NPS médio dos clientes deste provedor
        const npss = clientes.map(r=>Number(getAns(r,qIds.nps))).filter(n=>!isNaN(n));
        const npsMedio = npss.length ? avg(npss).toFixed(1) : null;
        const promotores  = npss.filter(n=>n>=9).length;
        const detratores  = npss.filter(n=>n<=6).length;
        const npsScore    = npss.length ? Math.round(((promotores-detratores)/npss.length)*100) : null;

        // Velocidade insatisfeita
        const semVelocidade = clientes.filter(r=>getAns(r,qIds.velocidade)==='Não').length;

        // Problemas mais citados
        const probCount = {};
        clientes.forEach(r => {
          const ps = getAns(r, qIds.problemas);
          (Array.isArray(ps)?ps:[ps]).filter(Boolean).filter(p=>p!=='Nenhum problema').forEach(p=>{
            probCount[p] = (probCount[p]||0)+1;
          });
        });
        const problemasTop = Object.entries(probCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);

        // Gatilhos de troca
        const gatCount = {};
        clientes.forEach(r => {
          const g = getAns(r, qIds.gatilho);
          if (g) gatCount[g] = (gatCount[g]||0)+1;
        });
        const gatilhosTop = Object.entries(gatCount).sort((a,b)=>b[1]-a[1]).slice(0,3);

        // Motivos de não ser Oquei
        const motivoCount = {};
        clientes.forEach(r => {
          const m = getAns(r, qIds.motivoNao);
          if (m) motivoCount[m] = (motivoCount[m]||0)+1;
        });
        const motivosTop = Object.entries(motivoCount).sort((a,b)=>b[1]-a[1]).slice(0,3);

        // Conhece Oquei?
        const conhece = clientes.filter(r=>getAns(r,qIds.conheceOquei)==='Sim').length;

        return {
          nome, n, scoreVulnerabilidade: scoreMedio, npsMedio, npsScore,
          pctSemVelocidade: pct(semVelocidade, n),
          problemasTop, gatilhosTop, motivosTop,
          pctConhece: pct(conhece, n),
          scores,
        };
      })
      .sort((a,b) => b.scoreVulnerabilidade - a.scoreVulnerabilidade);

    // Market share
    const total = respostas.length;
    const marketShare = Object.entries(dist).map(([nome, n]) => ({ nome, n, pct: pct(n, total) }))
      .sort((a,b) => b.n - a.n);

    // Awareness Oquei geral
    const conheceOquei = respostas.filter(r=>getAns(r,qIds.conheceOquei)==='Sim').length;

    // Prioridades do mercado
    const priorCount = {};
    respostas.filter(r=>getAns(r,qIds.provedor)!==OQUEI).forEach(r=>{
      const p = getAns(r, qIds.prioridade);
      if (p) priorCount[p] = (priorCount[p]||0)+1;
    });
    const prioridades = Object.entries(priorCount).sort((a,b)=>b[1]-a[1]);

    // Home office
    const homeOffice = respostas.filter(r=>getAns(r,qIds.homeOffice)==='Sim').length;

    // Leads quentes totais (score ≥ 7, não Oquei)
    const leadsQuentes = respostas
      .filter(r => getAns(r,qIds.provedor) !== OQUEI && getAns(r,qIds.provedor))
      .filter(r => calcVulnerabilidade(r, qIds) >= 7)
      .length;

    return { dist, provedores, marketShare, total, conheceOquei, prioridades, homeOffice, leadsQuentes };
  }, [respostas, qIds]);

  // ── IA: análise estratégica ───────────────────────────────────
  const runAi = async () => {
    const key = import.meta.env?.VITE_GEMINI_API_KEY||'';
    if (!key) { setAiError('VITE_GEMINI_API_KEY não configurada'); return; }
    if (!market) { setAiError('Selecione uma pesquisa com dados.'); return; }
    setAiLoading(true); setAiError(''); setAiInsights('');

    const resumoProvedores = market.provedores.map(p =>
      `${p.nome}: ${p.n} clientes | Vulnerabilidade ${p.scoreVulnerabilidade}/10 | NPS ${p.npsScore??'N/A'} | Sem velocidade ${p.pctSemVelocidade}% | Problemas: ${p.problemasTop.join(', ')} | Gatilhos: ${p.gatilhosTop.map(([k,v])=>k).join(', ')}`
    ).join('\n');

    const prompt = `Você é consultor especialista em expansão de provedores de internet no interior do Brasil.

DADOS OPERACIONAIS — ${selMonth}:
- Base ativa: ${opData.baseEnd} clientes
- Penetração: ${opData.penetracao}% dos HPs
- Vendas no mês: ${opData.vendas}
- Cancelamentos: ${opData.cancelamentos}
- Net Adds: ${opData.netAdds > 0 ? '+' : ''}${opData.netAdds}
- Churn: ${opData.churnRate}%

PESQUISA DE CAMPO (${market.total} entrevistados):
- Oquei tem ${market.dist[OQUEI]||0} clientes na amostra (${pct(market.dist[OQUEI]||0, market.total)}%)
- Leads quentes identificados: ${market.leadsQuentes} (score ≥ 7/10)
- Awareness da Oquei: ${pct(market.conheceOquei, market.total)}%
- Home Office na cidade: ${pct(market.homeOffice, market.total)}%
- Prioridade #1 do mercado: ${market.prioridades[0]?.[0]||'N/A'}

VULNERABILIDADE POR CONCORRENTE:
${resumoProvedores}

Com base nesses dados, forneça:

**1. DIAGNÓSTICO DE CRESCIMENTO**
Por que a Oquei não está crescendo mais rápido? Seja cirúrgico com os dados.

**2. RANKING DE ATAQUE — qual concorrente atacar primeiro e por quê**
Priorize por vulnerabilidade + volume de clientes na amostra.

**3. SCRIPT DE ABORDAGEM por concorrente vulnerável**
Para cada provedor no top 2, dê 2-3 argumentos específicos baseados nos dados.

**4. AÇÕES PARA OS PRÓXIMOS 7 DIAS**
Máximo 5 ações concretas e executáveis.

Seja direto e use os números. Escreva em português.`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.35, maxOutputTokens:2500} })
      });
      if (!res.ok) { const e=await res.json().catch(()=>{}); setAiError(e?.error?.message||res.status); setAiLoading(false); return; }
      const data = await res.json();
      setAiInsights(data?.candidates?.[0]?.content?.parts?.[0]?.text||'');
    } catch(e) { setAiError(e.message); }
    setAiLoading(false);
  };

  // ── Render Markdown ───────────────────────────────────────────
  const renderMd = (text) => text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    if (/^\*\*\d/.test(line)||/^##/.test(line)) {
      const clean = line.replace(/^#+\s*/,'').replace(/\*\*/g,'');
      return <div key={i} style={{fontWeight:'900',fontSize:'13px',color:colors.primary,marginTop:'14px',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{clean}</div>;
    }
    if (/^[-•]/.test(line)) return <div key={i} style={{display:'flex',gap:'8px',marginBottom:'5px',fontSize:'13px',paddingLeft:'8px'}}><span style={{color:colors.primary,flexShrink:0}}>→</span><span dangerouslySetInnerHTML={{__html:line.replace(/^[-•]\s*/,'').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>')}}/></div>;
    if (!line.trim()) return <div key={i} style={{height:'6px'}}/>;
    return <div key={i} style={{fontSize:'13px',color:'var(--text-main)',lineHeight:1.65,marginBottom:'3px'}} dangerouslySetInnerHTML={{__html:bold}}/>;
  });

  const inp = { padding:'8px 12px', borderRadius:'9px', border:'1px solid var(--border)', outline:'none', fontSize:'13px', color:'var(--text-main)', background:'var(--bg-app)', fontFamily:'inherit', cursor:'pointer' };

  // ── Cores por provedor ────────────────────────────────────────
  const provColor = (nome) => {
    const map = { 'N4 telecom': '#8b5cf6', 'Claro': '#ef4444', 'Vivo': '#a855f7', 'LazerNet': '#f59e0b', 'Starlink': '#0ea5e9', 'Outro': '#64748b' };
    return map[nome] || colors.neutral;
  };

  const totalHPs = opData.potencial;
  const hasOpData = opData.baseEnd > 0 || opData.potencial > 0;

  return (
    <div style={{ ...global.container }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ background:'linear-gradient(135deg,var(--bg-card),var(--bg-panel))', border:'1px solid var(--border)', borderRadius:'20px', padding:'22px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'14px', boxShadow:'var(--shadow-sm)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'13px', background:`linear-gradient(135deg,${colors.primary},${colors.purple})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 6px 18px ${colors.primary}44` }}>
            <BarChart3 size={22} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:'20px', fontWeight:'900', color:'var(--text-main)' }}>Análise dos Resultados</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>
              Operação × Pesquisa de campo · {respostas.length} entrevistas
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
          <select style={inp} value={selSurvey} onChange={e=>setSelSurvey(e.target.value)}>
            <option value="all">Todas as pesquisas</option>
            {surveys.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <select style={inp} value={selCity} onChange={e=>setSelCity(e.target.value)}>
            <option value="all">Todas as cidades</option>
            {cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="month" style={inp} value={selMonth} onChange={e=>setSelMonth(e.target.value)}/>
        </div>
      </div>

      {/* ── BARRA DE ALERTA se poucos dados ── */}
      {!loading && respostas.length < 10 && (
        <div style={{ background:`${colors.warning}12`, border:`1px solid ${colors.warning}30`, borderRadius:'12px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', color:colors.warning, fontWeight:'700' }}>
          <AlertTriangle size={16}/> Poucos dados ({respostas.length} entrevistas). Para análise confiável recomenda-se pelo menos 30 entrevistas aceitas.
        </div>
      )}

      {/* ── KPIs OPERACIONAIS ── */}
      {hasOpData && (
        <div>
          <div style={{ fontSize:'12px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>⚙️ Operação — {selMonth}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'12px' }}>
            {[
              { label:'Base Ativa',      value: opData.baseEnd.toLocaleString('pt-BR'),   color: colors.primary, sub: `de ${opData.potencial.toLocaleString('pt-BR')} HPs` },
              { label:'Penetração',      value: `${opData.penetracao}%`,                  color: colors.info,    sub: 'dos HPs ativos'   },
              { label:'Vendas no Mês',   value: `+${opData.vendas}`,                      color: colors.success, sub: 'novos clientes'   },
              { label:'Cancelamentos',   value: `-${opData.cancelamentos}`,               color: colors.danger,  sub: `churn ${opData.churnRate}%` },
              { label:'Net Adds',        value: `${opData.netAdds>=0?'+':''}${opData.netAdds}`, color: opData.netAdds>=0?colors.success:colors.danger, sub: 'saldo do mês' },
            ].map(k=>(
              <div key={k.label} style={{ background:'var(--bg-card)', border:`1px solid var(--border)`, borderLeft:`4px solid ${k.color}`, borderRadius:'12px', padding:'14px 16px', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontSize:'10px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
                <div style={{ fontSize:'22px', fontWeight:'900', color:k.color, lineHeight:1.1, marginTop:'4px' }}>{k.value}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!market ? (
        <Card>
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
            <BarChart3 size={36} style={{ opacity:0.2, marginBottom:'12px' }}/>
            <div style={{ fontWeight:'800', marginBottom:'4px' }}>Selecione uma pesquisa com dados</div>
            <div style={{ fontSize:'13px' }}>Escolha a pesquisa no filtro acima. As entrevistas precisam estar aceitas na Auditoria.</div>
          </div>
        </Card>
      ) : (
        <>
          {/* ── MARKET SHARE ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <Card title="Market Share na Amostra" subtitle={`${market.total} entrevistados`}>
              {market.marketShare.map(({ nome, n, pct: p }) => (
                <HBar key={nome} label={nome} value={n} max={market.marketShare[0].n}
                  color={nome===OQUEI ? colors.primary : provColor(nome)}
                  right={`${p}%`} sublabel={`${n} respostas`}
                  highlight={nome===OQUEI}/>
              ))}
            </Card>

            <Card title="Inteligência de Mercado" subtitle="Perfil da demanda">
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {[
                  { icon:'💡', label:'Conhecem a Oquei', value:`${pct(market.conheceOquei, market.total)}%`, sub:`${market.conheceOquei} de ${market.total}`, color: pct(market.conheceOquei,market.total)<50?colors.warning:colors.success },
                  { icon:'🏠', label:'Home Office na cidade', value:`${pct(market.homeOffice, market.total)}%`, sub:'internet crítica para o trabalho', color:colors.primary },
                  { icon:'🔥', label:'Leads quentes (score ≥7)', value:market.leadsQuentes, sub:'clientes da concorrência prontos para trocar', color:colors.danger },
                  { icon:'🎯', label:'Prioridade #1 do mercado', value:market.prioridades[0]?.[0]||'—', sub:`${market.prioridades[0]?.[1]||0} menções`, color:colors.purple },
                ].map(k=>(
                  <div key={k.label} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'10px' }}>
                    <span style={{ fontSize:'20px' }}>{k.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:'700' }}>{k.label}</div>
                      <div style={{ fontSize:'15px', fontWeight:'900', color:k.color }}>{k.value}</div>
                    </div>
                    <div style={{ fontSize:'10px', color:'var(--text-muted)', textAlign:'right', maxWidth:'100px' }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── VULNERABILIDADE POR CONCORRENTE ── */}
          <div>
            <div style={{ fontSize:'12px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>
              🎯 Vulnerabilidade dos Concorrentes — quem está mais exposto à Oquei
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {market.provedores.filter(p=>p.n>0).map((p, idx) => {
                const expanded = expandedProvider === p.nome;
                const cor = provColor(p.nome);
                const barraVuln = p.scoreVulnerabilidade;
                return (
                  <div key={p.nome} style={{ background:'var(--bg-card)', border:`1px solid ${barraVuln>=7?colors.success:barraVuln>=5?colors.warning:'var(--border)'}`, borderRadius:'14px', overflow:'hidden', boxShadow:'var(--shadow-sm)', transition:'all 0.2s' }}>
                    {/* Linha principal */}
                    <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:'16px', cursor:'pointer' }}
                      onClick={()=>setExpandedProvider(expanded?null:p.nome)}>
                      {/* Rank */}
                      <div style={{ width:'28px', height:'28px', borderRadius:'8px', background: idx===0?`${colors.success}20`:idx===1?`${colors.warning}15`:'var(--bg-app)', color:idx===0?colors.success:idx===1?colors.warning:'var(--text-muted)', fontSize:'14px', fontWeight:'900', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':`#${idx+1}`}
                      </div>

                      {/* Nome + pills */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                          <span style={{ fontWeight:'900', fontSize:'15px', color:'var(--text-main)' }}>{p.nome}</span>
                          <Pill label={`${p.n} clientes na amostra`} color={cor}/>
                          {p.npsScore !== null && <Pill label={`NPS ${p.npsScore}`} color={p.npsScore<0?colors.danger:p.npsScore<30?colors.warning:colors.success}/>}
                          {p.pctSemVelocidade > 40 && <Pill label={`${p.pctSemVelocidade}% sem velocidade`} color={colors.danger}/>}
                        </div>
                        {/* Barra de vulnerabilidade */}
                        <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ flex:1, height:'6px', background:'var(--border)', borderRadius:'10px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${barraVuln*10}%`, background: barraVuln>=7?colors.success:barraVuln>=5?colors.warning:colors.danger, borderRadius:'10px', transition:'width 0.8s ease' }}/>
                          </div>
                          <span style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', flexShrink:0 }}>Vulnerabilidade</span>
                        </div>
                      </div>

                      {/* Medidor */}
                      <VulnMeter score={p.scoreVulnerabilidade} n={p.n}/>

                      <div style={{ color:'var(--text-muted)' }}>{expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</div>
                    </div>

                    {/* Detalhe expandido */}
                    {expanded && (
                      <div style={{ borderTop:'1px solid var(--border)', padding:'16px 20px', background:'var(--bg-app)', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
                        <div>
                          <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'8px' }}>🔧 Problemas relatados</div>
                          {p.problemasTop.length ? p.problemasTop.map(pr=>(
                            <div key={pr} style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px', fontSize:'12px' }}>
                              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:colors.danger, flexShrink:0 }}/>
                              {pr}
                            </div>
                          )) : <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Nenhum problema citado</div>}
                        </div>
                        <div>
                          <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'8px' }}>⚡ O que faria trocar</div>
                          {p.gatilhosTop.map(([g, n])=>(
                            <div key={g} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px', fontSize:'12px' }}>
                              <span>{g}</span>
                              <span style={{ fontWeight:'800', color:colors.success }}>{pct(n, p.n)}%</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'8px' }}>🚧 Barreira para Oquei</div>
                          {p.motivosTop.map(([m, n])=>(
                            <div key={m} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px', fontSize:'12px' }}>
                              <span>{m}</span>
                              <span style={{ fontWeight:'800', color:colors.warning }}>{pct(n, p.n)}%</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'8px' }}>📣 Awareness Oquei</div>
                          <div style={{ fontSize:'24px', fontWeight:'900', color: p.pctConhece<50?colors.warning:colors.success }}>
                            {p.pctConhece}%
                          </div>
                          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>já conheciam a Oquei</div>
                          {p.pctConhece < 50 && (
                            <div style={{ marginTop:'8px', fontSize:'11px', color:colors.warning, fontWeight:'700' }}>
                              ⚠ Mais da metade nunca ouviu falar da Oquei — oportunidade de apresentação.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── PRIORIDADES DO MERCADO ── */}
          <Card title="O que o mercado prioriza" subtitle="Clientes da concorrência — o que pesa na escolha">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'20px' }}>
              <div>
                {market.prioridades.map(([label, n]) => (
                  <HBar key={label} label={label} value={n} max={market.prioridades[0][1]}
                    color={colors.primary} right={`${pct(n, respostas.filter(r=>getAns(r,qIds.provedor)!==OQUEI).length)}%`}/>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'4px' }}>💡 O que isso significa</div>
                {market.prioridades.slice(0,3).map(([label]) => {
                  const msgs = {
                    'Velocidade da Conexão': 'Destaque suas velocidades disponíveis logo na abordagem.',
                    'Estabilidade (não cair)': 'Fale sobre SLA e uptime. Leve depoimentos de clientes satisfeitos.',
                    'Atendimento humano/rápido': 'Mencione que a Oquei tem atendimento local e técnico próprio.',
                    'Preço da mensalidade': 'Prepare uma oferta de entrada competitiva ou desconto nos primeiros meses.',
                    'Wi-fi potente': 'Ofereça solução de Wi-fi mesh ou roteador de qualidade no plano.',
                    'Ter loja física na cidade': 'Reforce a presença física da Oquei na cidade.',
                  };
                  return msgs[label] ? (
                    <div key={label} style={{ display:'flex', gap:'8px', fontSize:'12px', padding:'8px 10px', background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'8px' }}>
                      <span style={{ color:colors.primary, flexShrink:0 }}>→</span>
                      <div><span style={{ fontWeight:'800' }}>{label}:</span> {msgs[label]}</div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </Card>

          {/* ── ANÁLISE ESTRATÉGICA IA ── */}
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:`linear-gradient(135deg,${colors.warning},${colors.danger})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Lightbulb size={18} color="#fff"/>
                </div>
                <div>
                  <div style={{ fontWeight:'900', fontSize:'15px', color:'var(--text-main)' }}>Análise Estratégica — IA</div>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Diagnóstico, ranking de ataque e scripts de abordagem</div>
                </div>
              </div>
              <button onClick={runAi} disabled={aiLoading}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 18px', borderRadius:'11px', border:'none', background:`linear-gradient(135deg,${colors.warning},${colors.danger})`, color:'#fff', fontWeight:'900', fontSize:'13px', cursor:aiLoading?'not-allowed':'pointer', opacity:aiLoading?0.7:1, boxShadow:`0 4px 14px ${colors.warning}44` }}>
                {aiLoading?<><Zap size={14} style={{animation:'spin 0.8s linear infinite'}}/> Analisando...</>:<><Zap size={14}/> {aiInsights?'Reanalisar':'Gerar Análise'}</>}
              </button>
            </div>

            {aiError && <div style={{ background:`${colors.danger}10`, border:`1px solid ${colors.danger}30`, borderRadius:'10px', padding:'12px', marginBottom:'14px', fontSize:'13px', color:colors.danger, fontWeight:'700' }}>{aiError}</div>}

            {!aiInsights && !aiLoading && (
              <div style={{ textAlign:'center', padding:'36px 20px', color:'var(--text-muted)', border:'2px dashed var(--border)', borderRadius:'12px' }}>
                <Lightbulb size={28} style={{ opacity:0.2, marginBottom:'10px' }}/>
                <div style={{ fontWeight:'800', marginBottom:'4px' }}>Análise ainda não gerada</div>
                <div style={{ fontSize:'13px' }}>Clique em "Gerar Análise" para diagnóstico, ranking de ataque e scripts de abordagem por concorrente.</div>
              </div>
            )}

            {aiInsights && (
              <div style={{ background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px', lineHeight:1.6 }}>
                {renderMd(aiInsights)}
              </div>
            )}
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </Card>
        </>
      )}
    </div>
  );
}