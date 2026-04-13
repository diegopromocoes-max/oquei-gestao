// ============================================================
//  wallboard/WallboardModules.jsx — Oquei Gestão
//  Os 4 módulos colapsáveis do Wallboard TV.
//  Recebe dados como props — sem Firebase, sem estado próprio.
// ============================================================

import React from 'react';
import {
  AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  CartesianGrid, YAxis, PieChart, Pie, Cell,
  BarChart, Bar, ReferenceLine, LineChart, Line, ComposedChart,
} from 'recharts';
import {
  TrendingUp, Trophy, MapPin, Users, Store, UserX,
  ArrowUpCircle, ArrowDownCircle, ShieldCheck, ChevronDown, ChevronUp,
  AlertOctagon, Filter, Globe, Activity, Clock,
} from 'lucide-react';
import { styles } from './WallboardStyles';
import { NeonProgressBar, BigSpeedometer, MegaTooltip, NeonLollipopDot } from './WallboardCharts';
import { colors } from '../../components/ui';

// ─── Módulo 1: Operação e Equipe ──────────────────────────────────────────────
export function Mod1Operacao({ collapsed, onToggle, rhData }) {
  const topPositivo = Array.isArray(rhData.topPositivo) ? rhData.topPositivo : [];
  const topNegativo = Array.isArray(rhData.topNegativo) ? rhData.topNegativo : [];
  const lojasAbertas = Number(rhData.lojasAbertas || 0);
  const lojasFechadas = Number(rhData.lojasFechadas || 0);
  const atendentesTrabalhando = Number(rhData.atendentesTrabalhando || 0);
  const atendentesAtestado = Number(rhData.atendentesAtestado || 0);

  return (
    <div style={styles.moduleBox}>
      <div style={styles.moduleHeader} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...styles.iconGlow, color: '#c471ed', boxShadow: '0 0 10px rgba(196, 113, 237, 0.4)' }}>
            <Users size={18} />
          </div>
          <h2 style={{ ...styles.moduleTitle, color: '#ffffff' }}>Operação e Equipe</h2>
        </div>
        <div style={styles.collapseBtn}>
          {collapsed ? <ChevronDown size={20} color="#8b8fa3" /> : <ChevronUp size={20} color="#8b8fa3" />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ ...styles.mod1Grid, animation: 'fadeIn 0.4s ease-out' }}>
          {/* Status de lojas e atendentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={styles.statusRow}>
              <div style={styles.statusBox}>
                <Store size={22} color="#0ba360" style={{ filter: 'drop-shadow(0 0 5px rgba(11,163,96,0.6))' }} />
                <div>
                  <span style={styles.statusValue}>{lojasAbertas}</span>
                  <span style={styles.statusLabel}>Lojas Abertas</span>
                </div>
              </div>
              <div style={{ ...styles.statusBox, border: lojasFechadas > 0 ? '1px solid rgba(248, 54, 0, 0.4)' : '1px solid #2d325a' }}>
                <Store size={22} color={lojasFechadas > 0 ? '#f83600' : '#8b8fa3'} />
                <div>
                  <span style={{ ...styles.statusValue, color: lojasFechadas > 0 ? '#f83600' : 'white' }}>{lojasFechadas}</span>
                  <span style={styles.statusLabel}>Lojas Fechadas</span>
                </div>
              </div>
            </div>
            <div style={styles.statusRow}>
              <div style={styles.statusBox}>
                <Users size={22} color="#00f2fe" style={{ filter: 'drop-shadow(0 0 5px rgba(0,242,254,0.6))' }} />
                <div>
                  <span style={styles.statusValue}>{atendentesTrabalhando}</span>
                  <span style={styles.statusLabel}>Comerciais Hoje</span>
                </div>
              </div>
              <div style={{ ...styles.statusBox, border: atendentesAtestado > 0 ? '1px solid rgba(249, 212, 35, 0.4)' : '1px solid #2d325a' }}>
                <UserX size={22} color="#f9d423" />
                <div>
                  <span style={{ ...styles.statusValue, color: '#f9d423' }}>{atendentesAtestado}</span>
                  <span style={styles.statusLabel}>Atestados/Faltas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Banco de horas */}
          <div style={styles.bancoHorasCard}>
            <h3 style={styles.bhTitle}><Clock size={14} /> Alertas de Banco de Horas</h3>
            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
              <div style={{ flex: 1 }}>
                <h4 style={styles.bhSubTitle}><ArrowUpCircle size={14} color="#0ba360" /> Top Positivos</h4>
                {topPositivo.length ? topPositivo.map((user, idx) => (
                  <div key={idx} style={styles.bhRow}>
                    <span style={styles.bhName}>{user.name}</span>
                    <span style={{ ...styles.bhVal, color: '#3cba92' }}>{user.hours}</span>
                  </div>
                )) : <div style={{ ...styles.bhRow, borderBottom: 'none' }}><span style={styles.bhName}>Sem saldo positivo no momento</span></div>}
              </div>
              <div style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)' }} />
              <div style={{ flex: 1 }}>
                <h4 style={styles.bhSubTitle}><ArrowDownCircle size={14} color="#f83600" /> Top Negativos</h4>
                {topNegativo.length ? topNegativo.map((user, idx) => (
                  <div key={idx} style={styles.bhRow}>
                    <span style={styles.bhName}>{user.name}</span>
                    <span style={{ ...styles.bhVal, color: '#f83600' }}>{user.hours}</span>
                  </div>
                )) : <div style={{ ...styles.bhRow, borderBottom: 'none' }}><span style={styles.bhName}>Sem saldo negativo no momento</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Módulo 2: Tração de Vendas ───────────────────────────────────────────────
export function Mod2Vendas({ collapsed, onToggle, salesData }) {
  const safeCities = Array.isArray(salesData.cities) ? salesData.cities : [];
  const safeTopSellers = Array.isArray(salesData.topSellers) ? salesData.topSellers : [];
  const cluster = salesData.cluster || {};

  return (
    <div style={styles.moduleBox}>
      <div style={styles.moduleHeader} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...styles.iconGlow, color: '#0ba360', boxShadow: '0 0 10px rgba(11, 163, 96, 0.4)' }}>
            <TrendingUp size={18} />
          </div>
          <h2 style={{ ...styles.moduleTitle, color: '#ffffff' }}>Tração de Vendas e SLA</h2>
        </div>
        <div style={styles.collapseBtn}>
          {collapsed ? <ChevronDown size={20} color="#8b8fa3" /> : <ChevronUp size={20} color="#8b8fa3" />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ ...styles.mod2Grid, animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Velocímetros globais */}
            <div style={styles.globalSpeedGrid}>
              <BigSpeedometer title="VENDAS GLOBAIS" current={Number(cluster.sales || 0)} target={Number(cluster.salesGoal || 0)} color1="#00f2fe" color2="#4facfe" />
              <BigSpeedometer title="INSTALAÇÕES SLA" current={Number(cluster.installs || 0)} target={Number(cluster.installsGoal || 0)} color1="#0ba360" color2="#3cba92" backlog={Number(cluster.backlog || 0)} />
            </div>

            {/* Barras por cidade */}
            <div style={styles.citiesSpeedGrid}>
              {safeCities.map((city, idx) => (
                <div key={idx} style={styles.cityDashCard}>
                  <h4 style={styles.cityDashTitle}>
                    <MapPin size={14} color="#00f2fe" /> {city.name}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                    <NeonProgressBar title="Vendas"      current={city.sales}    target={city.salesGoal}    gradCSS="linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)" />
                    <NeonProgressBar title="Instalações" current={city.installs} target={city.installsGoal} gradCSS="linear-gradient(90deg, #0ba360 0%, #3cba92 100%)" backlog={city.backlog} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking de vendedores */}
          <div style={styles.rankingCard}>
            <h3 style={styles.rankingTitle}>
              <Trophy size={18} color="#f9d423" style={{ filter: 'drop-shadow(0 0 5px rgba(249, 212, 35, 0.6))' }} />
              Top 5 Vendedores (Regional)
            </h3>
            <div style={styles.sellerList}>
              {safeTopSellers.length ? safeTopSellers.map((seller, index) => {
                const isFirst = index === 0;
                return (
                  <div key={seller.id} style={{ ...styles.sellerItem, background: isFirst ? 'rgba(249, 212, 35, 0.05)' : 'rgba(255, 255, 255, 0.02)', borderColor: isFirst ? 'rgba(249, 212, 35, 0.3)' : 'rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ ...styles.sellerAvatar, background: isFirst ? 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)' : '#1e2042', color: '#ffffff', border: isFirst ? 'none' : '1px solid #2d325a' }}>
                        {index + 1}º
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: isFirst ? '15px' : '14px', fontWeight: '900', color: isFirst ? '#f9d423' : 'white' }}>{seller.name}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{seller.store}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: isFirst ? '#f9d423' : 'white', textShadow: isFirst ? '0 0 10px rgba(249,212,35,0.5)' : 'none' }}>
                      {seller.sales}
                    </div>
                  </div>
                );
              }) : <div style={{ ...styles.sellerItem, justifyContent: 'center', color: 'var(--text-muted)' }}>Nenhuma venda fechada encontrada no período.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Módulo 3: Saúde da Base e Churn ─────────────────────────────────────────
export function Mod3Churn({ collapsed, onToggle, churnData }) {
  const safeReasons = Array.isArray(churnData.churnReasons) ? churnData.churnReasons : [];
  const safeCities = Array.isArray(churnData.cities) ? churnData.cities : [];
  const penetrationSeries = Array.isArray(churnData.penetrationSeries) ? churnData.penetrationSeries : [];
  const penetrationData = Array.isArray(churnData.penetrationEvolution) ? churnData.penetrationEvolution : [];
  const clusterGrowth = churnData.clusterGrowth || '+0';

  return (
    <div style={styles.moduleBox}>
      <div style={styles.moduleHeader} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...styles.iconGlow, color: '#f9d423', boxShadow: '0 0 10px rgba(249, 212, 35, 0.4)' }}>
            <ShieldCheck size={18} />
          </div>
          <h2 style={{ ...styles.moduleTitle, color: '#ffffff' }}>Saúde da Base e Market Share</h2>
        </div>
        <div style={styles.collapseBtn}>
          {collapsed ? <ChevronDown size={20} color="#8b8fa3" /> : <ChevronUp size={20} color="#8b8fa3" />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ ...styles.mod3Grid, animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Net Adds global */}
            <div style={styles.netAddsGlobal}>
              <span style={styles.netAddsLabel}>Crescimento Líquido (Net Adds)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp size={28} color="white" />
                <span style={styles.netAddsVal}>{clusterGrowth}</span>
              </div>
              <div style={styles.netAddsGlow} />
            </div>

            {/* Motivos de evasão */}
            <div style={styles.churnReasonCard}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Activity size={14} /> Motivos de Evasão (Mês Atual)
              </h4>
              {safeReasons.length ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={safeReasons} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                          {safeReasons.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#${entry.gradId})`} style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(22, 25, 59, 0.95)', borderColor: '#2d325a', color: '#ffffff', borderRadius: '12px', fontSize: '11px', backdropFilter: 'blur(5px)' }} itemStyle={{ fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    {safeReasons.slice(0, 3).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ffffff', fontWeight: 'bold' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.solidColor, boxShadow: `0 0 5px ${item.solidColor}` }} />
                        {item.name}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                  Nenhum motivo de evasão registrado neste mês.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Gráfico de penetração */}
            <div style={styles.penetrationChartCard}>
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>Evolução da Penetração (% HPs Ocupadas)</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Expansão de território nos últimos 6 meses</p>
                </div>
              </div>
              <div style={{ width: '100%', height: '220px' }}>
                {penetrationSeries.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={penetrationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="month" stroke="#8b8fa3" tick={{ fill: '#8b8fa3', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#8b8fa3" tick={{ fill: '#8b8fa3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(22, 25, 59, 0.95)', borderColor: '#2d325a', color: '#ffffff', borderRadius: '12px', backdropFilter: 'blur(5px)', fontSize: '12px' }} itemStyle={{ fontWeight: 'bold' }} />
                      {penetrationSeries.map((series) => (
                        <Area
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          stroke={series.color}
                          fill={`url(#${series.fillId})`}
                          strokeWidth={3}
                          style={{ filter: `drop-shadow(0 0 4px ${series.color}80)` }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Sem histórico suficiente para montar a evolução.
                  </div>
                )}
              </div>
            </div>

            {/* Net Adds por cidade */}
            <div style={styles.citiesGrowthCard}>
              {safeCities.length ? safeCities.map((city, idx) => {
                const isNegative = city.growth.includes('-');
                return (
                  <div key={idx} style={styles.cityGrowthRow}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>{city.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: isNegative ? '#f83600' : '#0ba360', background: isNegative ? 'rgba(248,54,0,0.1)' : 'rgba(11,163,96,0.1)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${isNegative ? 'rgba(248,54,0,0.3)' : 'rgba(11,163,96,0.3)'}`, boxShadow: isNegative ? '0 0 10px rgba(248,54,0,0.2)' : '0 0 10px rgba(11,163,96,0.2)' }}>
                      {city.growth} net
                    </span>
                  </div>
                );
              }) : <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Nenhuma praça com movimentação no período.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Módulo 4: Monitor Global de Expansão ────────────────────────────────────
export function Mod4Expansion({
  collapsed, onToggle,
  megaFilterCluster, megaFilterCity,
  onFilterCluster, onFilterCity,
  megaClusters, megaCities,
  filteredMegaData, isMegaFiltered,
  totalFilteredNetAdds, glowStyle,
}) {
  const safeFilteredMegaData = Array.isArray(filteredMegaData) ? filteredMegaData : [];

  return (
    <div style={{ ...styles.moduleBox, ...glowStyle, transition: 'all 0.4s ease' }}>
      <div style={styles.moduleHeader} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...styles.iconGlow, color: '#00f2fe', boxShadow: '0 0 10px rgba(0, 242, 254, 0.4)' }}>
            <Globe size={18} />
          </div>
          <h2 style={{ ...styles.moduleTitle, color: '#ffffff' }}>Monitor Global de Expansão</h2>
        </div>
        <div style={styles.collapseBtn}>
          {collapsed ? <ChevronDown size={20} color="#8b8fa3" /> : <ChevronUp size={20} color="#8b8fa3" />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {/* Filtros */}
          <div style={styles.megaFilterRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={16} color="#8b8fa3" />
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>Filtros:</span>
            </div>
            <select value={megaFilterCluster} onChange={e => { onFilterCluster(e.target.value); onFilterCity('all'); }} style={styles.megaSelect}>
              <option value="all">Todas as Regionais</option>
              {megaClusters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={megaFilterCity} onChange={e => onFilterCity(e.target.value)} style={styles.megaSelect} disabled={megaFilterCluster === 'all'}>
              <option value="all">Todas as Cidades</option>
              {megaCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {isMegaFiltered && (
              <div style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '900', background: totalFilteredNetAdds > 0 ? 'rgba(11,163,96,0.15)' : totalFilteredNetAdds < 0 ? 'rgba(248,54,0,0.15)' : 'rgba(249,212,35,0.15)', color: totalFilteredNetAdds > 0 ? '#3cba92' : totalFilteredNetAdds < 0 ? '#f64f59' : '#f9d423', border: `1px solid ${totalFilteredNetAdds > 0 ? '#0ba360' : totalFilteredNetAdds < 0 ? '#f83600' : colors.warning}` }}>
                Balanço: {totalFilteredNetAdds > 0 ? '+' : ''}{totalFilteredNetAdds} clientes
              </div>
            )}
          </div>

          {/* Lollipop Chart */}
          <div style={styles.megaChartWrapper}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', margin: '0 0 25px 0', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Crescimento Líquido (Base Dia 1 vs Base Hoje)
            </h3>
            <div style={{ width: '100%', height: '340px' }}>
              {safeFilteredMegaData.length ? (
                <ResponsiveContainer>
                  <ComposedChart data={safeFilteredMegaData} margin={{ top: 35, right: 20, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 'bold', fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8fa3', fontSize: 12 }} />
                    <RechartsTooltip content={(props) => <MegaTooltip {...props} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
                    <Bar dataKey="netAdds" barSize={4} radius={4}>
                      {safeFilteredMegaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.gradId} opacity={0.6} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="netAdds" stroke="none" isAnimationActive dot={<NeonLollipopDot />} activeDot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Nenhuma praça encontrada para os filtros selecionados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
