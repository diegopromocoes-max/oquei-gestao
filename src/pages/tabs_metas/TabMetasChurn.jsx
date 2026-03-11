import React, { useState, useEffect, useMemo } from 'react';
import { Save, TrendingDown, Search, Target, Activity, MapPin } from 'lucide-react';

// ✅ IMPORTAÇÃO DO SERVICES (100% isolado do Firebase)
import { getCidades, getMetasCidades, getMetasChurn, salvarMetasChurn } from '../../services/metas';

// ✅ IMPORTAÇÃO DO DESIGN SYSTEM
import { Btn, Card, DataTable, KpiCard } from '../../components/ui';

export default function TabMetasChurn({ selectedMonth, isMaster, userData }) {
  const [cities, setCities] = useState([]);
  const [salesGoals, setSalesGoals] = useState({}); // Trazido da Aba 2
  const [churnGoals, setChurnGoals] = useState({});
  const [globalChurn, setGlobalChurn] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [citiesData, citiesGoals, churnData] = await Promise.all([
          getCidades(),
          getMetasCidades(selectedMonth), // Puxa as metas brutas (Aba 2)
          getMetasChurn(selectedMonth)    // Puxa as metas de churn desta aba
        ]);

        setCities(citiesData);
        setSalesGoals(citiesGoals);
        setChurnGoals(churnData.churnGoals || {});
        setGlobalChurn(churnData.globalChurn || 0);

      } catch (error) {
        console.error("Erro ao buscar dados Churn:", error);
        if (window.showToast) window.showToast('Erro ao carregar dados do Churn.', 'error');
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
      if (window.showToast) window.showToast('Metas de Churn guardadas com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      if (window.showToast) window.showToast('Erro ao guardar metas de Churn.', 'error');
    }
    setSaving(false);
  };

  const filteredCities = cities.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  // Lógica para somar todas as metas de vendas brutas (produtos x canais) de uma cidade específica
  const getCityTotalSales = (cityId) => {
    let total = 0;
    const cityData = salesGoals[cityId];
    if (!cityData) return 0;
    Object.values(cityData).forEach(channel => {
      Object.values(channel).forEach(val => {
        total += Number(val || 0);
      });
    });
    return total;
  };

  // Cálculos de Resumo (KPIs)
  const totalGlobalSales = cities.reduce((acc, city) => acc + getCityTotalSales(city.id), 0);
  const totalGlobalChurnCities = cities.reduce((acc, city) => acc + (churnGoals[city.id] || 0), 0);
  const netAddsCities = totalGlobalSales - totalGlobalChurnCities;
  const netAddsGlobal = totalGlobalSales - globalChurn;

  // Montagem blindada da tabela usando useMemo
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Cidade',
      render: (val) => <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{val}</span>
    },
    {
      key: 'vendas',
      label: 'Meta Vendas (Brutas)',
      render: (_, row) => {
        const total = getCityTotalSales(row.id);
        return <span style={{ fontWeight: '800', color: 'var(--text-brand)' }}>{total}</span>;
      }
    },
    {
      key: 'churn',
      label: 'Meta Churn (Saídas)',
      render: (_, row) => (
        <input
          type="number" min="0" disabled={!isMaster}
          value={churnGoals[row.id] || ''}
          onChange={e => handleChurnChange(row.id, e.target.value)}
          style={{
            width: '80px', padding: '8px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--bg-app)',
            color: 'var(--danger)', fontSize: '14px', fontWeight: 'bold',
            outline: 'none', textAlign: 'center'
          }}
          placeholder="0"
        />
      )
    },
    {
      key: 'net',
      label: 'Saldo Líquido (Net Adds)',
      render: (_, row) => {
        const vendas = getCityTotalSales(row.id);
        const churn = churnGoals[row.id] || 0;
        const net = vendas - churn;
        const color = net >= 0 ? 'var(--success)' : 'var(--danger)';
        return <span style={{ fontWeight: '900', color, fontSize: '15px' }}>{net > 0 ? `+${net}` : net}</span>;
      }
    }
  ], [salesGoals, churnGoals, isMaster]);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>A preparar laboratório de Churn...</div>;

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Cabeçalho de Ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', flex: 1 }}>
          <TrendingDown size={18} />
          <span><b>Laboratório Churn:</b> Defina a expectativa de cancelamentos para prever o crescimento real (Net Adds).</span>
        </div>

        {isMaster && (
          <Btn onClick={handleSave} loading={saving} variant="danger" style={{ background: 'var(--danger)' }}>
            <Save size={18} /> Salvar Metas (Churn)
          </Btn>
        )}
      </div>

      {/* Resumo Global usando KpiCards padronizados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
         <KpiCard label="Vendas Brutas (Total)" valor={totalGlobalSales} icon={<Target size={20} color="var(--text-brand)" />} accent="var(--text-brand)" />
         <KpiCard label="Churn Estimado (Soma)" valor={totalGlobalChurnCities} icon={<TrendingDown size={20} color="var(--danger)" />} accent="var(--danger)" />
         <KpiCard label="Net Adds (Projeção)" valor={netAddsCities > 0 ? `+${netAddsCities}` : netAddsCities} icon={<Activity size={20} color={netAddsCities >= 0 ? "var(--success)" : "var(--danger)"} />} accent={netAddsCities >= 0 ? "var(--success)" : "var(--danger)"} />
      </div>

      {/* Tabela de Cidades encapsulada no Card */}
      <Card title="Distribuição de Churn por Cidade">
        
        {/* Barra de Busca e Churn Global Corporativo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '15px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-app)', padding: '10px 15px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
             <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', display: 'block' }}>CHURN EMPRESA (GLOBAL)</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sobrepõe a soma das cidades</span>
             </div>
             <input
                type="number" min="0" disabled={!isMaster}
                value={globalChurn || ''}
                onChange={e => setGlobalChurn(Number(e.target.value))}
                style={{
                  width: '80px', padding: '8px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'var(--bg-panel)',
                  color: 'var(--danger)', fontSize: '16px', fontWeight: '900',
                  outline: 'none', textAlign: 'center'
                }}
                placeholder="0"
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