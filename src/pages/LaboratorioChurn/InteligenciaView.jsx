// --- COMPONENTE: INTELIGÊNCIA S&OP (VISIBILIDADE TOTAL GARANTIDA) ---
const InteligenciaView = ({ processedData }) => {
  const [simCityId, setSimCityId] = useState('');
  const [simGrowthPerc, setSimGrowthPerc] = useState(2.0); 
  const [simChurnPerc, setSimChurnPerc] = useState(1.5); 

  // Sincroniza a cidade selecionada
  useEffect(() => {
    if (processedData.length > 0 && !simCityId) {
      setSimCityId(processedData[0].id);
    }
  }, [processedData, simCityId]);

  const selectedCityData = processedData.find(c => c.id === simCityId);

  // 1. CÁLCULOS BASE (Com proteção total contra valores nulos)
  const baseClientes = selectedCityData?.currentBase || 1000;
  const hAvgGrowth = parseFloat(selectedCityData?.histAvgGrowth) || 1.5;
  const hAvgChurn = parseFloat(selectedCityData?.histAvgChurn) || 1.2;

  const tNetAdds = Math.ceil(baseClientes * (simGrowthPerc / 100));
  const pChurnVol = Math.ceil(baseClientes * (simChurnPerc / 100));
  const rGrossAdds = tNetAdds + pChurnVol;

  // 2. SLA DE CANAIS (Garante que os números apareçam sempre)
  const hist = selectedCityData?.channels || { loja: 0, pap: 0, central: 0, b2b: 0 };
  const hTotal = (hist.loja || 0) + (hist.pap || 0) + (hist.central || 0) + (hist.b2b || 0);
  
  let dLoja, dPap, dCentral, dB2b;
  if (hTotal > 0) {
    dLoja = Math.round(rGrossAdds * (hist.loja / hTotal));
    dPap = Math.round(rGrossAdds * (hist.pap / hTotal));
    dCentral = Math.round(rGrossAdds * (hist.central / hTotal));
    dB2b = Math.max(0, rGrossAdds - (dLoja + dPap + dCentral)); 
  } else {
    dLoja = Math.round(rGrossAdds * 0.4);
    dPap = Math.round(rGrossAdds * 0.3);
    dCentral = Math.round(rGrossAdds * 0.2);
    dB2b = Math.max(0, rGrossAdds - (dLoja + dPap + dCentral));
  }

  // 3. DEFINIÇÃO DIRETA DOS INSIGHTS (Sem funções externas para evitar falhas)
  let gInsight = { title: "Meta Alinhada", message: "Crescimento sustentável.", color: "#10b981", icon: CheckCircle };
  if (simGrowthPerc <= 0) {
    gInsight = { title: "Risco de Retração", message: "O planejamento resultará em perda de clientes.", color: "#ef4444", icon: TrendingDown };
  } else if (simGrowthPerc > hAvgGrowth * 2) {
    gInsight = { title: "Meta Irrealista", message: `Exigir ${simGrowthPerc}% é o dobro da média da unidade (${hAvgGrowth}%).`, color: "#ef4444", icon: AlertOctagon };
  } else if (simGrowthPerc > hAvgGrowth * 1.3) {
    gInsight = { title: "Meta Agressiva", message: "Desafio acima da média. Requer reforço comercial.", color: "#f59e0b", icon: Target };
  }

  return (
    <div style={{ animation: 'slideUp 0.5s ease-out forwards' }}>
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        {/* LADO ESQUERDO: CONTROLES */}
        <div style={{ ...global.card, flex: 1, minWidth: '320px' }}>
          <h3 style={local.secTitle}><Sliders size={18} color={colors.primary}/> Configurar Simulação</h3>
          
          <div style={global.field}>
            <label style={global.label}>Cidade para Análise</label>
            <select style={global.select} value={simCityId} onChange={e => setSimCityId(e.target.value)}>
              {processedData.map(c => <option key={c.id} value={c.id}>{c.city}</option>)}
            </select>
          </div>

          <div style={{...global.field, marginTop: '20px'}}>
            <label style={global.label}>Meta Crescimento Líquido: <strong style={{color: colors.primary}}>{simGrowthPerc}%</strong></label>
            <input type="range" min="-2" max="10" step="0.1" value={simGrowthPerc} onChange={e => setSimGrowthPerc(parseFloat(e.target.value))} style={local.rangeInput} />
          </div>

          <div style={{...global.field, marginTop: '20px'}}>
            <label style={global.label}>Teto de Churn Máximo: <strong style={{color: '#ef4444'}}>{simChurnPerc}%</strong></label>
            <input type="range" min="0" max="5" step="0.1" value={simChurnPerc} onChange={e => setSimChurnPerc(parseFloat(e.target.value))} style={local.rangeInput} />
          </div>

          <div style={{marginTop: 30, padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px dashed var(--border)'}}>
            <p style={{margin:0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6'}}>
              Base: <strong>{baseClientes}</strong> clientes.<br/>
              Objetivo: <strong>+{tNetAdds}</strong> líquidos.<br/>
              Gross Necessário: <strong>{rGrossAdds}</strong> vendas.
            </p>
          </div>
        </div>

        {/* LADO DIREITO: RESULTADOS E INSIGHTS (Sempre visível) */}
        <div style={{ flex: 1.5, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SLA BOXES */}
          <div style={global.card}>
            <h4 style={{...local.secTitle, marginBottom: '20px'}}>SLA DE VENDAS POR CANAL</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={local.slaBox}><Store size={18} color="#10b981" /> <div><span>Loja</span><strong>{dLoja}</strong></div></div>
              <div style={local.slaBox}><MapPin size={18} color="#f59e0b" /> <div><span>PAP</span><strong>{dPap}</strong></div></div>
              <div style={local.slaBox}><Headset size={18} color="#2563eb" /> <div><span>Central</span><strong>{dCentral}</strong></div></div>
              <div style={local.slaBox}><Briefcase size={18} color="#8b5cf6" /> <div><span>B2B</span><strong>{dB2b}</strong></div></div>
            </div>
          </div>

          {/* CARD DE INSIGHT (O QUE NÃO ESTAVA APARECENDO) */}
          <div style={{
            padding: '20px', 
            borderRadius: '16px', 
            display: 'flex', 
            gap: '15px', 
            alignItems: 'center', 
            background: `${gInsight.color}10`, 
            borderLeft: `5px solid ${gInsight.color}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{ color: gInsight.color }}><gInsight.icon size={24} /></div>
            <div>
              <h4 style={{ margin: 0, color: gInsight.color, fontSize: '15px', fontWeight: '900' }}>{gInsight.title}</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{gInsight.message}</p>
            </div>
          </div>

          {/* DICA DE ESTRATÉGIA */}
          <div style={{ padding: '15px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', gap: '10px' }}>
            <Info size={18} color="#2563eb" />
            <p style={{ margin: 0, fontSize: '12px', color: '#1e40af' }}>
              <strong>Dica S&OP:</strong> Mantenha a meta de crescimento dentro de 30% da média histórica para garantir a saúde da equipe técnica.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};