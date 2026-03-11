import React, { useState, useEffect } from 'react';
import { Save, Building2, ChevronDown, ChevronUp, Search, MapPin, Layers } from 'lucide-react';

// ✅ IMPORTAÇÃO DO SERVICES
import { getClusters, getCidades, getCanaisVenda, getProdutosComMeta, getMetasCidades, salvarMetasCidades } from '../../services/metas';

// ✅ IMPORTAÇÃO DO DESIGN SYSTEM
import { Btn, Card } from '../../components/ui';

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
        const [clustData, citsData, chanData, prodData, goalsData] = await Promise.all([
          getClusters(),
          getCidades(),
          getCanaisVenda(),
          getProdutosComMeta(),
          getMetasCidades(selectedMonth)
        ]);

        setClusters(clustData);
        setCities(citsData);
        setChannels(chanData);
        setProducts(prodData);
        setGoals(goalsData);

        // Expande todos os clusters por padrão
        const initialExpanded = {};
        clustData.forEach(c => initialExpanded[c.id] = true);
        setExpandedClusters(initialExpanded);

      } catch (error) {
        console.error("Erro ao buscar dados Cidades:", error);
        if (window.showToast) window.showToast('Erro ao carregar dados.', 'error');
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
      await salvarMetasCidades(selectedMonth, goals, userData);
      if (window.showToast) window.showToast('Metas por Cidades guardadas!', 'success');
    } catch (error) {
      console.error(error);
      if (window.showToast) window.showToast('Erro ao guardar metas.', 'error');
    }
    setSaving(false);
  };

  const toggleCluster = (clusterId) => {
    setExpandedClusters(prev => ({ ...prev, [clusterId]: !prev[clusterId] }));
  };

  // Filtra as cidades baseadas na busca
  const filteredCities = cities.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>A carregar matriz micro-regional...</div>;

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Cabeçalho de Ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* Caixa de Info */}
        <div style={{ padding: '12px 20px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', flex: 1 }}>
          <Building2 size={18} />
          <span><b>Distribuição Micro:</b> Divida a meta de cada produto por Cidade e Canal.</span>
        </div>

        {/* Busca */}
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input 
            type="text" 
            placeholder="Buscar cidade..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '10px 10px 10px 35px', borderRadius: '10px', 
              border: '1px solid var(--border)', background: 'var(--bg-app)', 
              color: 'var(--text-main)', outline: 'none', fontSize: '13px' 
            }}
          />
        </div>

        {isMaster && (
          <Btn onClick={handleSave} loading={saving} variant="primary" style={{ background: 'var(--purple)' }}>
            <Save size={18} /> Salvar Metas (Cidades)
          </Btn>
        )}
      </div>

      {/* Verificação de Estado Vazio */}
      {filteredCities.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <MapPin size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
          <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Nenhuma cidade encontrada</h4>
        </Card>
      ) : (
        /* Renderização por Clusters */
        clusters.map(cluster => {
          const clusterCities = filteredCities.filter(c => c.clusterId === cluster.id);
          if (clusterCities.length === 0) return null;

          const isExpanded = expandedClusters[cluster.id];

          return (
            <Card key={cluster.id} style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header do Cluster */}
              <div 
                onClick={() => toggleCluster(cluster.id)}
                style={{ 
                  background: 'var(--bg-panel)', padding: '15px 20px', display: 'flex', 
                  justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', 
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={18} color="var(--purple)" />
                  <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '15px', textTransform: 'uppercase' }}>
                    Regional: {cluster.name}
                  </span>
                  <span style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--purple)', padding: '2px 8px', borderRadius: '50px', fontSize: '11px', fontWeight: 'bold' }}>
                    {clusterCities.length} cidades
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={18} color="var(--text-muted)"/> : <ChevronDown size={18} color="var(--text-muted)"/>}
              </div>

              {/* Corpo do Cluster (Cidades) */}
              {isExpanded && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-app)' }}>
                  {clusterCities.map(city => (
                    
                    <div key={city.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
                        <MapPin size={16} color="var(--text-muted)" />
                        <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{city.name}</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>Produto</th>
                              {channels.map(ch => (
                                <th key={ch.id} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                  {ch.name}
                                </th>
                              ))}
                              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '900', color: 'var(--purple)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map(prod => {
                              const totalRow = channels.reduce((acc, ch) => acc + (goals[city.id]?.[ch.id]?.[prod.id] || 0), 0);
                              return (
                                <tr key={prod.id}>
                                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', borderBottom: '1px solid var(--border)' }}>{prod.name}</td>
                                  
                                  {channels.map(ch => (
                                    <td key={ch.id} style={{ padding: '8px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                      <input 
                                        type="number" min="0" disabled={!isMaster}
                                        value={goals[city.id]?.[ch.id]?.[prod.id] || ''}
                                        onChange={e => handleGoalChange(city.id, ch.id, prod.id, e.target.value)}
                                        style={{
                                          width: '60px', padding: '8px', borderRadius: '6px', 
                                          border: '1px solid var(--border)', background: 'var(--bg-app)', 
                                          color: 'var(--text-main)', textAlign: 'center', outline: 'none', fontWeight: 'bold'
                                        }}
                                        placeholder="0"
                                      />
                                    </td>
                                  ))}

                                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '900', color: 'var(--purple)', borderBottom: '1px solid var(--border)', fontSize: '15px' }}>
                                    {totalRow}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}