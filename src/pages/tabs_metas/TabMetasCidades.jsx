import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { Save, Building2, ChevronDown, ChevronUp, Search, Target, MapPin, Users } from 'lucide-react';

export default function TabMetasCidades({ selectedMonth, isMaster, userData }) {
  const [clusters, setClusters] = useState([]);
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]); 
  const [products, setProducts] = useState([]);
  const [goals, setGoals] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClusters, setExpandedClusters] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snapClusters = await getDocs(collection(db, 'clusters'));
        const clustersData = snapClusters.docs.map(d => ({ id: d.id, ...d.data() }));
        clustersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setClusters(clustersData);
        
        const initialExpanded = {};
        clustersData.forEach(c => initialExpanded[c.id] = true);
        setExpandedClusters(initialExpanded);

        const snapCities = await getDocs(collection(db, 'cities'));
        const citiesData = snapCities.docs.map(d => ({ id: d.id, ...d.data() }));
        citiesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCities(citiesData);

        const snapChannels = await getDocs(collection(db, 'sales_channels'));
        const channelsData = snapChannels.docs.map(d => ({ id: d.id, ...d.data() }));
        channelsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setChannels(channelsData);

        const snapProducts = await getDocs(collection(db, 'product_categories'));
        let productsData = snapProducts.docs.map(d => ({ id: d.id, ...d.data() }));
        productsData = productsData.filter(p => p.temMeta !== false && p.temMeta !== "false");
        productsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setProducts(productsData);

        const docRef = doc(db, 'goals_cities', selectedMonth);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGoals(docSnap.data().data || {});
        } else {
          setGoals({});
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'goals_cities', selectedMonth), {
        data: goals,
        month: selectedMonth,
        updatedAt: new Date().toISOString(),
        updatedBy: userData?.name || 'Gestor'
      });
      alert('Metas detalhadas das Cidades guardadas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao guardar metas.');
    }
    setSaving(false);
  };

  const toggleCluster = (clusterId) => {
    setExpandedClusters(prev => ({ ...prev, [clusterId]: !prev[clusterId] }));
  };

  if (loading) return <p style={{color: 'var(--text-muted)'}}>A estruturar matriz de cidades e canais...</p>;

  return (
    <div className="animated-view">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)', flex: 1, maxWidth: '400px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" placeholder="Filtrar cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-main)' }}
          />
        </div>
        
        {isMaster && (
          <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
            <Save size={18} /> {saving ? 'A guardar...' : 'Salvar Distribuição Micro'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {clusters.map(cluster => {
          const clusterCities = cities.filter(c => c.clusterId === cluster.id && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
          if (clusterCities.length === 0) return null;

          const isExpanded = expandedClusters[cluster.id];

          const clusterTotals = products.map(prod => {
            let sum = 0;
            clusterCities.forEach(city => {
              channels.forEach(ch => {
                sum += (goals[city.id]?.[ch.id]?.[prod.id] || 0);
              });
            });
            return { id: prod.id, name: prod.name, sum };
          });
          const grandTotal = clusterTotals.reduce((acc, p) => acc + p.sum, 0);

          return (
            <div key={cluster.id} style={styles.clusterCard}>
              <div onClick={() => toggleCluster(cluster.id)} style={styles.clusterHeader}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                  <Building2 size={20} color="#8b5cf6" />
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>{cluster.name}</h3>
                  <span style={{ fontSize: '12px', background: 'var(--bg-app)', padding: '4px 8px', borderRadius: '8px', color: 'var(--text-muted)', marginRight: '10px' }}>
                    {clusterCities.length} cidades
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {clusterTotals.map(pt => (
                      <span key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        {pt.name}: <span style={{color: '#8b5cf6', fontSize: '13px'}}>{pt.sum}</span>
                      </span>
                    ))}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '900', background: '#f5f3ff', color: '#8b5cf6', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
                      <Target size={14} /> Global: {grandTotal}
                    </span>
                  </div>
                </div>

                <div style={{ marginLeft: '15px' }}>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
              </div>

              {isExpanded && (
                <div style={styles.citiesContainer}>
                  {clusterCities.map(city => {
                    
                    // Soma total desta cidade (Todos os canais e produtos)
                    let totalCity = 0;
                    channels.forEach(ch => {
                      products.forEach(p => {
                        totalCity += (goals[city.id]?.[ch.id]?.[p.id] || 0);
                      });
                    });

                    return (
                      <div key={city.id} style={styles.cityBlock}>
                        
                        {/* CABEÇALHO DA CIDADE */}
                        <div style={styles.cityHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={18} color="#10b981" />
                            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>{city.name}</h4>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '14px' }}>
                            Meta Total da Cidade: {totalCity}
                          </div>
                        </div>

                        {/* TABELA DE CANAIS DENTRO DA CIDADE */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={styles.th}>Distribuir por Canal</th>
                                {products.map(prod => (
                                  <th key={prod.id} style={{...styles.th, borderLeft: '1px solid var(--border)', textAlign: 'center'}}>
                                    {prod.name}
                                  </th>
                                ))}
                                <th style={{...styles.th, borderLeft: '2px solid var(--border)', textAlign: 'center', color: '#f59e0b'}}>
                                  Peso Global do Canal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {channels.map(channel => {
                                // Soma total apenas deste canal nesta cidade
                                const totalChannel = products.reduce((acc, prod) => acc + (goals[city.id]?.[channel.id]?.[prod.id] || 0), 0);
                                
                                // % que este Canal representa na Cidade inteira
                                const percentChannel = totalCity > 0 ? Math.round((totalChannel / totalCity) * 100) : 0;

                                return (
                                  <tr key={channel.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={styles.tdName}>
                                      <Users size={14} color="var(--text-muted)" style={{marginRight: '6px', marginBottom: '-2px'}} /> 
                                      {channel.name}
                                    </td>
                                    
                                    {products.map(prod => {
                                      const val = goals[city.id]?.[channel.id]?.[prod.id] || '';
                                      const numVal = Number(val) || 0;
                                      
                                      // Calcula o total apenas deste PRODUTO na cidade para saber a %
                                      const totalProdCity = channels.reduce((acc, ch) => acc + (goals[city.id]?.[ch.id]?.[prod.id] || 0), 0);
                                      const percentProd = totalProdCity > 0 ? Math.round((numVal / totalProdCity) * 100) : 0;

                                      return (
                                        <td key={prod.id} style={{ padding: '8px', borderLeft: '1px solid var(--border)', textAlign: 'center' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <input 
                                              type="number" min="0" disabled={!isMaster} value={val}
                                              onChange={e => handleGoalChange(city.id, channel.id, prod.id, e.target.value)}
                                              style={styles.inputNumber} placeholder="0"
                                            />
                                            {/* ETIQUETA COM PERCENTUAL DO PRODUTO */}
                                            {numVal > 0 && (
                                              <span style={{fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)'}}>
                                                {percentProd}% deste prod.
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                    
                                    <td style={{ padding: '8px', borderLeft: '2px solid var(--border)', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: '900', color: '#f59e0b', fontSize: '15px' }}>{totalChannel}</span>
                                        {/* ETIQUETA COM PERCENTUAL DO CANAL NA CIDADE */}
                                        {totalChannel > 0 && (
                                          <span style={{fontSize: '10px', fontWeight: 'bold', color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px'}}>
                                            {percentChannel}% da Cidade
                                          </span>
                                        )}
                                      </div>
                                    </td>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  saveBtn: { background: '#8b5cf6', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)' },
  
  clusterCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  clusterHeader: { background: 'var(--bg-panel)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--border)' },
  
  citiesContainer: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-app)' },
  cityBlock: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' },
  cityHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' },
  
  th: { padding: '12px 15px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' },
  tdName: { padding: '12px 15px', fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap' },
  inputNumber: { width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '14px', fontWeight: 'bold', outline: 'none', textAlign: 'center' }
};