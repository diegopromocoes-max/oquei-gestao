import React, { useState, useEffect } from 'react';
import { Save, Building2, ChevronDown, ChevronUp, Search, MapPin, Layers, Loader2, History, PieChart } from 'lucide-react';

// ✅ SERVIÇOS E FIREBASE
import { getClusters, getCidades, getCanaisVenda, getProdutosComMeta, getMetasCidades, salvarMetasCidades } from '../../services/metas';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// ✅ DESIGN SYSTEM
import { Btn, Card } from '../../components/ui';

export default function TabMetasCidades({ selectedMonth, isMaster, userData }) {
  const [clusters, setClusters] = useState([]);
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]); 
  const [products, setProducts] = useState([]);
  const [goals, setGoals] = useState({});
  const [averages, setAverages] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [savingCities, setSavingCities] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClusters, setExpandedClusters] = useState({});

  const roleNorm = String(userData?.role || '').toLowerCase().replace(/[\s_-]/g, '');
  const isGrowth = ['growthteam','growth_team','equipegrowth'].includes(roleNorm);
  const canEdit  = isMaster || isGrowth; // growth_team tem edição colaborativa

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

        // Lógica de Médias Históricas (3 meses)
        const getPrevMonths = (monthStr) => {
          const [year, month] = monthStr.split('-').map(Number);
          return [1, 2, 3].map(offset => {
            const d = new Date(year, month - 1 - offset, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          });
        };

        const prevMonths = getPrevMonths(selectedMonth);
        const avgMap = {};
        const resultsSnap = await getDocs(collection(db, 'city_results'));
        const allResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        citsData.forEach(city => {
          avgMap[city.id] = {};
          chanData.forEach(chan => {
            avgMap[city.id][chan.id] = {};
            prodData.forEach(prod => {
              const history = prevMonths.map(mId => {
                const doc = allResults.find(r => r.id === `${mId}_${city.id}`);
                const vendasData = doc?.vendas || {};
                const canalKey = Object.keys(vendasData).find(key => key === chan.id || key.toLowerCase() === chan.name.toLowerCase());
                return Number(vendasData[canalKey]?.[prod.id] || 0);
              });
              const sum = history.reduce((a, b) => a + b, 0);
              avgMap[city.id][chan.id][prod.id] = sum > 0 ? (sum / 3).toFixed(1) : 0;
            });
          });
        });
        
        setAverages(avgMap);
        const initialExpanded = {};
        clustData.forEach(c => initialExpanded[c.id] = true);
        setExpandedClusters(initialExpanded);

      } catch (error) { console.error(error); }
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

  const handleSaveCity = async (cityId, cityName) => {
    const cityData = goals[cityId];
    if (!cityData) return;
    setSavingCities(prev => ({ ...prev, [cityId]: true }));
    try {
      await salvarMetasCidades(selectedMonth, { [cityId]: cityData }, userData);
      if (window.showToast) window.showToast(`Metas de ${cityName} salvas!`, 'success');
    } catch (error) { if (window.showToast) window.showToast(`Erro ao salvar.`, 'error'); }
    setSavingCities(prev => ({ ...prev, [cityId]: false }));
  };

  const filteredCities = cities.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Sincronizando Mix de Canais...</div>;

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ padding: '12px 20px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', flex: 1 }}>
          <PieChart size={18} />
          <span><b>Mix de Canais:</b> O percentual sob o nome do canal indica a representatividade dele no total da cidade.</span>
        </div>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input type="text" placeholder="Buscar cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }} />
        </div>
      </div>

      {clusters.map(cluster => {
        const clusterCities = filteredCities.filter(c => c.clusterId === cluster.id);
        if (clusterCities.length === 0) return null;
        const isExpanded = expandedClusters[cluster.id];

        return (
          <Card key={cluster.id} style={{ padding: 0, overflow: 'hidden', marginBottom: '10px' }}>
            <div onClick={() => setExpandedClusters(prev => ({ ...prev, [cluster.id]: !isExpanded }))} style={{ background: 'var(--bg-panel)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={18} color="var(--purple)" />
                <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '15px', textTransform: 'uppercase' }}>{cluster.name}</span>
              </div>
              {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
            </div>

            {isExpanded && (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-app)' }}>
                {clusterCities.map(city => {
                  
                  // 🚀 CÁLCULO DINÂMICO DO MIX DE CANAIS PARA ESTA CIDADE
                  const cityGoals = goals[city.id] || {};
                  let totalGeralCidade = 0;
                  const totaisPorCanal = {};

                  channels.forEach(ch => {
                    let totalCanal = 0;
                    products.forEach(prod => {
                      totalCanal += Number(cityGoals[ch.id]?.[prod.id] || 0);
                    });
                    totaisPorCanal[ch.id] = totalCanal;
                    totalGeralCidade += totalCanal;
                  });

                  return (
                    <div key={city.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{city.name}</span>
                        {canEdit && (
                          <button onClick={() => handleSaveCity(city.id, city.name)} disabled={savingCities[city.id]} style={{ background: '#6d28d9', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {savingCities[city.id] ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {savingCities[city.id] ? 'Gravando...' : 'Salvar Unidade'}
                          </button>
                        )}
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                              <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900' }}>PRODUTO</th>
                              {channels.map(ch => {
                                // Cálculo da porcentagem do canal
                                const percentMix = totalGeralCidade > 0 ? ((totaisPorCanal[ch.id] / totalGeralCidade) * 100).toFixed(1) : 0;
                                return (
                                  <th key={ch.id} style={{ padding: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase' }}>{ch.name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--purple)', fontWeight: 'bold', marginTop: '2px' }}>{percentMix}% do mix</div>
                                  </th>
                                );
                              })}
                              <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--purple)', fontWeight: '900' }}>TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map(prod => {
                              const totalRow = channels.reduce((acc, ch) => acc + (goals[city.id]?.[ch.id]?.[prod.id] || 0), 0);
                              return (
                                <tr key={prod.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{prod.name}</td>
                                  {channels.map(ch => {
                                    const avgValue = averages[city.id]?.[ch.id]?.[prod.id] || 0;
                                    return (
                                      <td key={ch.id} style={{ padding: '12px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                          <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>MÉD: {avgValue}</span>
                                          <input type="number" min="0" disabled={!canEdit} value={goals[city.id]?.[ch.id]?.[prod.id] || ''} onChange={e => handleGoalChange(city.id, ch.id, prod.id, e.target.value)} style={{ width: '55px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '900', color: 'var(--purple)', fontSize: '15px' }}>{totalRow}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}