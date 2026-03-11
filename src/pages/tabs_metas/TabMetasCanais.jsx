import { useState, useEffect, useMemo } from 'react';
import { Save, Layers, Activity, Users } from 'lucide-react';

// ✅ DADOS VÊM DO SERVICE (Regra de Ouro)
import { getCanaisVenda, getProdutosComMeta, getMetasCanais, salvarMetasCanais } from '../../services/metas';

// ✅ COMPONENTES DO DESIGN SYSTEM
import { Btn, Card, DataTable } from '../../components/ui';

export default function TabMetasCanais({ selectedMonth, isMaster, userData }) {
  const [channels, setChannels] = useState([]);
  const [products, setProducts] = useState([]);
  const [goals, setGoals] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [canaisData, produtosData, metasData] = await Promise.all([
          getCanaisVenda(),
          getProdutosComMeta(),
          getMetasCanais(selectedMonth)
        ]);
        setChannels(canaisData);
        setProducts(produtosData);
        setGoals(metasData);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        if (window.showToast) window.showToast('Erro ao carregar os dados.', 'error');
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedMonth]);

  const handleGoalChange = (channelId, productId, value) => {
    setGoals(prev => ({
      ...prev,
      [channelId]: {
        ...(prev[channelId] || {}),
        [productId]: Number(value)
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await salvarMetasCanais(selectedMonth, goals, userData);
      if (window.showToast) {
        window.showToast('Metas Globais guardadas com sucesso!', 'success');
      }
    } catch (error) {
      console.error(error);
      if (window.showToast) window.showToast('Erro ao guardar metas.', 'error');
    }
    setSaving(false);
  };

  // ─── LÓGICA BLINDADA DA TABELA ───────────────────────────────────────
  const columns = useMemo(() => {
    const cols = [
      {
        key: 'name',
        label: 'Canal de Venda',
        render: (val, row) => (
          <span style={{ 
            fontWeight: row.isSummary ? '900' : '800', 
            color: row.isSummary ? 'var(--text-muted)' : 'var(--text-main)',
            textTransform: row.isSummary ? 'uppercase' : 'none'
          }}>
            {val}
          </span>
        )
      }
    ];

    products.forEach(prod => {
      cols.push({
        key: prod.id,
        label: `Meta: ${prod.name}`,
        render: (_, row) => {
          if (row.isSummary) {
            const totalProduct = channels.reduce((acc, ch) => acc + (goals[ch.id]?.[prod.id] || 0), 0);
            return <span style={{ fontWeight: '900', color: 'var(--success)' }}>{totalProduct}</span>;
          }
          return (
            <input 
              type="number" min="0" disabled={!isMaster}
              value={goals[row.id]?.[prod.id] || ''}
              onChange={e => handleGoalChange(row.id, prod.id, e.target.value)}
              style={{
                width: '80px', padding: '10px', borderRadius: '8px', 
                border: '1px solid var(--border)', background: 'var(--bg-app)', 
                color: 'var(--text-main)', fontSize: '15px', fontWeight: 'bold', 
                outline: 'none', textAlign: 'center'
              }}
              placeholder="0"
            />
          );
        }
      });
    });

    cols.push({
      key: 'total',
      label: 'Total (Canal)',
      render: (_, row) => {
        if (row.isSummary) {
          const grandTotal = channels.reduce((accCh, ch) => accCh + products.reduce((accPr, p) => accPr + (goals[ch.id]?.[p.id] || 0), 0), 0);
          return (
            <span style={{ color: 'var(--warning)', fontWeight: '900', fontSize: '16px' }}>
              {grandTotal}
            </span>
          );
        }
        const totalChannel = products.reduce((acc, prod) => acc + (goals[row.id]?.[prod.id] || 0), 0);
        return <span style={{ fontWeight: '900', color: 'var(--warning)' }}>{totalChannel}</span>;
      }
    });

    return cols;
  }, [products, channels, goals, isMaster]);

  // Linha resumo ("Total Global") adicionada ao fim dos dados reais
  const tableData = useMemo(() => {
    if (channels.length === 0) return [];
    return [...channels, { id: 'summary', name: 'Total Global (Empresa)', isSummary: true }];
  }, [channels]);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>A estruturar matriz de canais...</div>;

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* Caixa de Informação com estilos baseados em CSS vars */}
        <div style={{ padding: '12px 20px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-brand)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', flex: 1 }}>
          <Activity size={18} />
          <span><b>Visão Global:</b> Defina a meta matriz de cada Canal de Venda gerido no banco de dados.</span>
        </div>
        
        {isMaster && (
          <Btn onClick={handleSave} loading={saving} variant="primary">
            <Save size={18} /> Salvar Metas Globais
          </Btn>
        )}
      </div>

      <Card>
        {channels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Nenhum Canal Registado</h4>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Layers size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Nenhum Produto com Meta</h4>
          </div>
        ) : (
          <DataTable columns={columns} data={tableData} loading={loading} />
        )}
      </Card>
    </div>
  );
}