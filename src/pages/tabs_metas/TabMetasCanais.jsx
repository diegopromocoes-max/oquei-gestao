import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { Save, Layers, Activity, Users } from 'lucide-react';

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
        const snapChannels = await getDocs(collection(db, 'sales_channels'));
        const channelsData = snapChannels.docs.map(d => ({ id: d.id, ...d.data() }));
        channelsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setChannels(channelsData);

        const snapProducts = await getDocs(collection(db, 'product_categories'));
        let productsData = snapProducts.docs.map(d => ({ id: d.id, ...d.data() }));
        productsData = productsData.filter(p => p.temMeta !== false && p.temMeta !== "false");
        productsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setProducts(productsData);

        const docRef = doc(db, 'goals_channels', selectedMonth);
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
      await setDoc(doc(db, 'goals_channels', selectedMonth), {
        data: goals,
        month: selectedMonth,
        updatedAt: new Date().toISOString(),
        updatedBy: userData?.name || 'Gestor'
      });
      alert('Metas Globais dos Canais guardadas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao guardar metas.');
    }
    setSaving(false);
  };

  if (loading) return <p style={{color: 'var(--text-muted)'}}>A estruturar matriz de canais...</p>;

  // Cálculo do Total Global (Soma de todos os canais e todos os produtos)
  const grandTotal = channels.reduce((accCh, ch) => {
    return accCh + products.reduce((accPr, prod) => accPr + (goals[ch.id]?.[prod.id] || 0), 0);
  }, 0);

  return (
    <div className="animated-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ padding: '12px 20px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', flex: 1 }}>
          <Activity size={18} />
          <span><b>Visão Global:</b> Defina a meta matriz de cada Canal de Venda gerido no banco de dados.</span>
        </div>
        
        {isMaster && (
          <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
            <Save size={18} /> {saving ? 'A guardar...' : 'Salvar Metas Globais'}
          </button>
        )}
      </div>

      <div style={styles.card}>
        {channels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Nenhum Canal de Venda Cadastrado</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
              Para as linhas aparecerem aqui, você precisa criar os canais na coleção <b>sales_channels</b> no banco de dados.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Layers size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Nenhum Produto com Meta Encontrado</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
              Crie categorias e marque "Gera Meta" no painel de Produtos.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={styles.th}>Canal de Venda</th>
                  {products.map(prod => (
                    <th key={prod.id} style={{...styles.th, borderLeft: '1px solid var(--border)', textAlign: 'center'}}>
                      Meta: {prod.name}
                    </th>
                  ))}
                  {/* COLUNA DO TOTAL DO CANAL */}
                  <th style={{...styles.th, borderLeft: '2px solid var(--border)', textAlign: 'center', color: '#f59e0b'}}>
                    Total (Canal)
                  </th>
                </tr>
              </thead>
              <tbody>
                {channels.map(channel => {
                  // Soma total deste canal específico
                  const totalChannel = products.reduce((acc, prod) => acc + (goals[channel.id]?.[prod.id] || 0), 0);

                  return (
                    <tr key={channel.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={styles.tdName}>{channel.name}</td>
                      {products.map(prod => {
                        const val = goals[channel.id]?.[prod.id] || '';
                        return (
                          <td key={prod.id} style={{ padding: '15px', borderLeft: '1px solid var(--border)', textAlign: 'center' }}>
                            <input 
                              type="number" min="0" disabled={!isMaster}
                              value={val}
                              onChange={e => handleGoalChange(channel.id, prod.id, e.target.value)}
                              style={styles.inputNumber}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      {/* EXIBE O TOTAL DO CANAL */}
                      <td style={{ padding: '15px', borderLeft: '2px solid var(--border)', textAlign: 'center', fontWeight: '900', color: '#f59e0b', fontSize: '16px' }}>
                        {totalChannel}
                      </td>
                    </tr>
                  );
                })}

                {/* LINHA FINAL: TOTAL GLOBAL DE CADA PRODUTO */}
                <tr style={{ background: 'var(--bg-panel)' }}>
                  <td style={{...styles.tdName, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px'}}>
                    Total Global (Empresa)
                  </td>
                  
                  {products.map(prod => {
                    // Soma total de todos os canais para este produto específico
                    const totalProduct = channels.reduce((acc, ch) => acc + (goals[ch.id]?.[prod.id] || 0), 0);
                    return (
                      <td key={prod.id} style={{ padding: '15px', borderLeft: '1px solid var(--border)', textAlign: 'center', fontWeight: '900', color: '#10b981', fontSize: '16px' }}>
                        {totalProduct}
                      </td>
                    );
                  })}

                  {/* SUPER TOTAL */}
                  <td style={{ padding: '15px', borderLeft: '2px solid var(--border)', textAlign: 'center', fontWeight: '900', color: '#f59e0b', fontSize: '18px', background: 'rgba(245, 158, 11, 0.1)' }}>
                    {grandTotal}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  saveBtn: { background: '#3b82f6', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', boxShadow: 'var(--shadow-sm)' },
  th: { padding: '15px', textAlign: 'left', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' },
  tdName: { padding: '15px', fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap' },
  inputNumber: { width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '15px', fontWeight: 'bold', outline: 'none', textAlign: 'center' }
};