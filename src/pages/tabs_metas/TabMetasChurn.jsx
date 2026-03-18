import React, { useState, useEffect, useMemo } from 'react';
import { Save, TrendingDown, Search, Target, Activity, MapPin, History, Loader2, ArrowRight } from 'lucide-react';

// ✅ IMPORTAÇÃO DO SERVICES
import { getCidades, getMetasCidades, getMetasChurn, salvarMetasChurn } from '../../services/metas';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// ✅ IMPORTAÇÃO DO DESIGN SYSTEM
import { Btn, Card, DataTable, KpiCard } from '../../components/ui';

export default function TabMetasChurn({ selectedMonth, isMaster, userData }) {
  const [cities, setCities] = useState([]);
  const [salesGoals, setSalesGoals] = useState({}); 
  const [churnGoals, setChurnGoals] = useState({});
  const [averages, setAverages] = useState({}); 
  const [globalChurn, setGlobalChurn] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 Permissão: Coordenador ou Master
  const roleNorm = String(userData?.role || '').toLowerCase().replace(/[\s_-]/g, '');
  const isGrowth = ['growthteam','growth_team','equipegrowth'].includes(roleNorm);
  const canEdit  = isMaster || isGrowth; // growth_team tem edição colaborativa

  const getPrevMonths = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    return [1, 2, 3].map(offset => {
      const d = new Date(year, month - 1 - offset, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [citiesData, citiesGoals, churnData] = await Promise.all([
          getCidades(),
          getMetasCidades(selectedMonth),
          getMetasChurn(selectedMonth)
        ]);

        setCities(citiesData);
        setSalesGoals(citiesGoals);
        setChurnGoals(churnData.churnGoals || {});
        setGlobalChurn(churnData.globalChurn || 0);

        const prevMonths = getPrevMonths(selectedMonth);
        const avgMap = {};
        const resultsSnap = await getDocs(collection(db, 'city_results'));
        const allResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        citiesData.forEach(city => {
          let historySales = [];
          let historyChurn = [];

          prevMonths.forEach(mId => {
            const doc = allResults.find(r => r.id === `${mId}_${city.id}`);
            let monthSales = 0;
            if (doc?.vendas) {
              Object.values(doc.vendas).forEach(channel => {
                Object.values(channel).forEach(val => { monthSales += Number(val || 0); });
              });
            }
            historySales.push(monthSales);
            historyChurn.push(Number(doc?.cancelamentos || 0));
          });

          const avgSales = historySales.reduce((a, b) => a + b, 0) / 3;
          const avgChurn = historyChurn.reduce((a, b) => a + b, 0) / 3;

          avgMap[city.id] = {
            sales: avgSales > 0 ? avgSales.toFixed(1) : 0,
            churn: avgChurn > 0 ? avgChurn.toFixed(1) : 0
          };
        });
        setAverages(avgMap);

      } catch (error) {
        console.error("Erro ao carregar médias Churn:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth]);

  const handleChurnChange = (cityId, value) => {
    setChurnGoals(prev => ({ ...prev, [cityId]: Number(value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await salvarMetasChurn(selectedMonth, churnGoals, globalChurn, userData);
      if (window.showToast) window.showToast('Metas de Churn salvas com sucesso!', 'success');
    } catch (error) {
      if (window.showToast) window.showToast('Erro ao gravar metas.', 'error');
    }
    setSaving(false);
  };

  const getCityTotalSales = (cityId) => {
    let total = 0;
    const cityData = salesGoals[cityId];
    if (!cityData) return 0;
    Object.values(cityData).forEach(channel => {
      Object.values(channel).forEach(val => { total += Number(val || 0); });
    });
    return total;
  };

  const filteredCities = useMemo(() => {
    return cities.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [cities, searchTerm]);

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Cidade',
      render: (val) => <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{val}</span>
    },
    {
      key: 'vendas',
      label: 'Performance Vendas',
      render: (_, row) => {
        const total = getCityTotalSales(row.id);
        const avg = averages[row.id]?.sales || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>MÉDIA 3M</div>
               <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', background: 'var(--bg-panel)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border)', minWidth: '60px' }}>
                 {avg}
               </div>
            </div>
            <ArrowRight size={16} color="var(--border)" style={{ marginTop: '12px' }} />
            <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-brand)', marginBottom: '4px' }}>META ATUAL</div>
               <div style={{ fontWeight: '900', color: 'var(--text-brand)', fontSize: '16px', padding: '6px 0' }}>{total}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'churn',
      label: 'Definição de Churn',
      render: (_, row) => {
        const avg = averages[row.id]?.churn || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>MÉDIA 3M</div>
               <div style={{ fontSize: '14px', fontWeight: '900', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.1)', minWidth: '60px' }}>
                 {avg}
               </div>
            </div>
            <ArrowRight size={16} color="var(--border)" style={{ marginTop: '12px' }} />
            <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: '10px', fontWeight: '900', color: '#ef4444', marginBottom: '4px' }}>NOVA META</div>
               <input
                 type="number" min="0" disabled={!canEdit}
                 value={churnGoals[row.id] || ''}
                 onChange={e => handleChurnChange(row.id, e.target.value)}
                 style={{
                   width: '85px', padding: '10px', borderRadius: '10px',
                   border: '2px solid #ef4444', background: 'var(--bg-app)',
                   color: '#ef4444', fontSize: '16px', fontWeight: '900',
                   outline: 'none', textAlign: 'center'
                 }}
                 placeholder="0"
               />
            </div>
          </div>
        );
      }
    },
    {
      key: 'net',
      label: 'Saldo Líquido (Net Adds)',
      render: (_, row) => {
        const vendas = getCityTotalSales(row.id);
        const churn = churnGoals[row.id] || 0;
        const net = vendas - churn;
        const color = net >= 0 ? 'var(--success)' : 'var(--danger)';
        return <span style={{ fontWeight: '900', color, fontSize: '18px' }}>{net > 0 ? `+${net}` : net}</span>;
      }
    }
  ], [salesGoals, churnGoals, averages, canEdit]);

  const totalGlobalSales = cities.reduce((acc, city) => acc + getCityTotalSales(city.id), 0);
  const totalGlobalChurnCities = cities.reduce((acc, city) => acc + (churnGoals[city.id] || 0), 0);
  const netAddsCities = totalGlobalSales - totalGlobalChurnCities;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Sincronizando run-rate histórico...</div>;

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid var(--border)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', flex: 1 }}>
          <History size={18} />
          <span><b>Inteligência de Churn:</b> Compare as saídas reais dos últimos 3 meses com a nova projeção.</span>
        </div>

        {/* 🚀 BOTÃO COM COR FIXA PARA ALTO CONTRASTE */}
        {canEdit && (
          <button 
            onClick={handleSave} 
            disabled={saving} 
            style={{ 
              background: '#dc2626', // Vermelho Sólido (Red 600)
              color: '#ffffff',      // Texto Branco Puro
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '12px', 
              fontSize: '14px', 
              fontWeight: '900', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
              transition: 'all 0.2s'
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
            {saving ? 'Gravando...' : 'Salvar Metas (Churn)'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
         <KpiCard label="Vendas Brutas (Total)" valor={totalGlobalSales} icon={<Target size={20} color="var(--text-brand)" />} accent="var(--text-brand)" />
         <KpiCard label="Churn Estimado (Soma)" valor={totalGlobalChurnCities} icon={<TrendingDown size={20} color="#ef4444" />} accent="#ef4444" />
         <KpiCard label="Net Adds (Projeção)" valor={netAddsCities > 0 ? `+${netAddsCities}` : netAddsCities} icon={<Activity size={20} color={netAddsCities >= 0 ? "var(--success)" : "#ef4444"} />} accent={netAddsCities >= 0 ? "var(--success)" : "#ef4444"} />
      </div>

      <Card title="Distribuição de Churn por Cidade">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text" placeholder="Buscar cidade..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-app)', padding: '10px 20px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
             <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', display: 'block' }}>CHURN EMPRESA (GLOBAL)</span>
             </div>
             <input
                type="number" min="0" disabled={!canEdit}
                value={globalChurn || ''}
                onChange={e => setGlobalChurn(Number(e.target.value))}
                style={{ width: '90px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: '#ef4444', fontSize: '18px', fontWeight: '900', outline: 'none', textAlign: 'center' }}
              />
          </div>
        </div>

        {filteredCities.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '40px' }}>
             <MapPin size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
             <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Nenhuma cidade encontrada</h4>
           </div>
        ) : (
           <DataTable columns={columns} data={filteredCities} loading={loading} />
        )}
      </Card>
    </div>
  );
}