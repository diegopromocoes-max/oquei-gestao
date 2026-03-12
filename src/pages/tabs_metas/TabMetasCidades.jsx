import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Save, Building2, ChevronDown, ChevronUp, Search, MapPin, Layers, History } from 'lucide-react';

import { getClusters, getCidades, getCanaisVenda, getProdutosComMeta, getMetasCidades, salvarMetasCidades } from '../../services/metas';
import { Card } from '../../components/ui';

export default function TabMetasCidades({ selectedMonth, isMaster, userData }) {
  const [clusters, setClusters] = useState([]);
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]); 
  const [products, setProducts] = useState([]);
  const [goals, setGoals] = useState({});
  const [historicalAverages, setHistoricalAverages] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClusters, setExpandedClusters] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clustData, citsData, chanData, prodData, goalsData] = await Promise.all([
          getClusters(), getCidades(), getCanaisVenda(), getProdutosComMeta(), getMetasCidades(selectedMonth)
        ]);

        setClusters(clustData);
        setCities(citsData);
        setChannels(chanData);
        setProducts(prodData);
        setGoals(goalsData);

        // ─── LÓGICA DE HISTÓRICO RECUPERADA (BASEADA NO SEU CÓDIGO) ───
        const historyMap = {};
        const now = new Date(`${selectedMonth}-01T12:00:00`);
        
        // Puxamos os resultados consolidados (city_results)
        const resultsSnap = await getDocs(query(collection(db, "city_results")));
        
        resultsSnap.docs.forEach(docSnap => {
          const d = docSnap.data();
          const month = d.month || docSnap.id.substring(0, 7);
          
          // Verifica se o mês do documento está entre os últimos 3 meses em relação ao selecionado
          const docDate = new Date(`${month}-01T12:00:00`);
          const diffMonths = (now.getFullYear() - docDate.getFullYear()) * 12 + (now.getMonth() - docDate.getMonth());

          if (diffMonths > 0 && diffMonths <= 3) {
            const cId = d.cityId;
            const vendas = d.results || d.vendas; // Aceita ambos os formatos

            if (cId && vendas) {
              Object.entries(vendas).forEach(([chId, prods]) => {
                Object.entries(prods).forEach(([pId, val]) => {
                  if (!historyMap[cId]) historyMap[cId] = {};
                  if (!historyMap[cId][chId]) historyMap[cId][chId] = {};
                  if (!historyMap[cId][chId][pId]) historyMap[cId][chId][pId] = 0;
                  
                  historyMap[cId][chId][pId] += Number(val || 0);
                });
              });
            }
          }
        });

        // Calcula a média final (Total / 3)
        const averages = {};
        Object.keys(historyMap).forEach(c => {
          averages[c] = {};
          Object.keys(historyMap[c]).forEach(ch => {
            averages[c][ch] = {};
            Object.keys(historyMap[c][ch]).forEach(p => {
              averages[c][ch][p] = (historyMap[c][ch][p] / 3).toFixed(1);
            });
          });
        });

        setHistoricalAverages(averages);

        // Expande clusters
        const initialExpanded = {};
        clustData.forEach(c => initialExpanded[c.id] = true);
        setExpandedClusters(initialExpanded);

      } catch (error) {
        console.error("Erro no carregamento:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth]);

  const handleGoalChange = (cityId, channelId, productId, value) => {
    setGoals(prev => ({
      ...prev,
      [cityId]: {
        ...(prev[cityId] || {}),
        [channelId]: {
          ...(prev[cityId]?.[channelId] || {}),
          [productId]: Number(value)
        }
      }
    }));
  };

  const handleSave = async (cityName) => {
    setSaving(true);
    try {
      await salvarMetasCidades(selectedMonth, goals, userData);
      if (window.showToast) window.showToast(`Metas de ${cityName} guardadas!`, 'success');
    } catch (error) {
      if (window.showToast) window.showToast('Erro ao salvar.', 'error');
    }
    setSaving(false);
  };

  const filteredCities = cities.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ padding: '12px 20px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', border: '1px solid var(--border)', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', flex: 1 }}>
          <Building2 size={18} />
          <span><b>Sugestão Inteligente:</b> O ícone <History size={14} style={{display:'inline', marginBottom:'-2px'}}/> mostra a média real da Apuração dos últimos 3 meses.</span>
        </div>

        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input 
            type="text" placeholder="Filtrar cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' }}
          />
        </div>
      </div>

      {clusters.map(cluster => {
        const clusterCities = filteredCities.filter(c => c.clusterId === cluster.id);
        if (clusterCities.length === 0) return null;
        const isExpanded = expandedClusters[cluster.id];

        return (
          <Card key={cluster.id} style={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
            <div 
              onClick={() => setExpandedClusters(prev => ({ ...prev, [cluster.id]: !isExpanded }))}
              style={{ background: 'var(--bg-panel)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={18} color="#7c3aed" />
                <span style={{ fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase' }}>{cluster.name}</span>
              </div>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {isExpanded && (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px', background: 'var(--bg-app)' }}>
                {clusterCities.map(city => (
                  <div key={city.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="var(--text-muted)" /> {city.name}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Produto</th>
                            {channels.map(ch => <th key={ch.id} style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{ch.name}</th>)}
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: '#7c3aed', textTransform: 'uppercase' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(prod => {
                            const totalRow = channels.reduce((acc, ch) => acc + (goals[city.id]?.[ch.id]?.[prod.id] || 0), 0);
                            return (
                              <tr key={prod.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '15px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{prod.name}</td>
                                {channels.map(ch => {
                                  const val = goals[city.id]?.[ch.id]?.[prod.id] || 0;
                                  const pct = totalRow > 0 ? Math.round((val / totalRow) * 100) : 0;
                                  const avg = historicalAverages[city.id]?.[ch.id]?.[prod.id] || '0.0';
                                  
                                  return (
                                    <td key={ch.id} style={{ padding: '10px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <input 
                                          type="number" value={val || ''}
                                          onChange={e => handleGoalChange(city.id, ch.id, prod.id, e.target.value)}
                                          style={{ width: '65px', padding: '8px', borderRadius: '8px', border: val > 0 ? '2px solid #7c3aed' : '1px solid var(--border)', textAlign: 'center', fontWeight: 'bold', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '65px', fontSize: '10px' }}>
                                          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><History size={8}/>{avg}</span>
                                          <span style={{ color: pct > 0 ? '#7c3aed' : 'var(--text-muted)', fontWeight: 'bold' }}>{pct}%</span>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td style={{ textAlign: 'center', fontWeight: '900', color: '#7c3aed', fontSize: '15px' }}>{totalRow}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* BOTÃO SALVAR INDIVIDUAL - CORRIGIDO */}
                    <div style={{ padding: '12px', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleSave(city.name)}
                        style={{ background: '#7c3aed', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px rgba(124, 58, 237, 0.2)' }}
                      >
                        <Save size={14} color="#ffffff" /> Salvar {city.name}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}