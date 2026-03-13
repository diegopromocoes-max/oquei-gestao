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
                  <span style={styles.statusValue}>{rhData.lojasAbertas}</span>
                  <span style={styles.statusLabel}>Lojas Abertas</span>
                </div>
              </div>
              <div style={{ ...styles.statusBox, border: rhData.lojasFechadas > 0 ? '1px solid rgba(248, 54, 0, 0.4)' : '1px solid #2d325a' }}>
                <Store size={22} color={rhData.lojasFechadas > 0 ? '#f83600' : '#8b8fa3'} />
                <div>
                  <span style={{ ...styles.statusValue, color: rhData.lojasFechadas > 0 ? '#f83600' : 'white' }}>{rhData.lojasFechadas}</span>
                  <span style={styles.statusLabel}>Lojas Fechadas</span>
                </div>
              </div>
            </div>
            <div style={styles.statusRow}>
              <div style={styles.statusBox}>
                <Users size={22} color="#00f2fe" style={{ filter: 'drop-shadow(0 0 5px rgba(0,242,254,0.6))' }} />
                <div>
                  <span style={styles.statusValue}>{rhData.atendentesTrabalhando}</span>
                  <span style={styles.statusLabel}>Comerciais Hoje</span>
                </div>
              </div>
              <div style={{ ...styles.statusBox, border: rhData.atendentesAtestado > 0 ? '1px solid rgba(249, 212, 35, 0.4)' : '1px solid #2d325a' }}>
                <UserX size={22} color="#f9d423" />
                <div>
                  <span style={{ ...styles.statusValue, color: '#f9d423' }}>{rhData.atendentesAtestado}</span>
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
                {rhData.topPositivo.map((user, idx) => (
                  <div key={idx} style={styles.bhRow}>
                    <span style={styles.bhName}>{user.name}</span>
                    <span style={{ ...styles.bhVal, color: '#3cba92' }}>{user.hours}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)' }} />
              <div style={{ flex: 1 }}>
                <h4 style={styles.bhSubTitle}><ArrowDownCircle size={14} color="#f83600" /> Top Negativos</h4>
                {rhData.topNegativo.map((user, idx) => (
                  <div key={idx} style={styles.bhRow}>
                    <span style={styles.bhName}>{user.name}</span>
                    <span style={{ ...styles.bhVal, color: '#f83600' }}>{user.hours}</span>
                  </div>
                ))}
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
              <BigSpeedometer title="VENDAS GLOBAIS"   current={salesData.cluster.sales}    target={salesData.cluster.salesGoal}    color1="#00f2fe" color2="#4facfe" />
              <BigSpeedometer title="INSTALAÇÕES SLA"  current={salesData.cluster.installs} target={salesData.cluster.installsGoal} color1="#0ba360" color2="#3cba92" backlog={salesData.cluster.backlog} />
            </div>

            {/* Barras por cidade */}
            <div style={styles.citiesSpeedGrid}>
              {salesData.cities.map((city, idx) => (
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
              {salesData.topSellers.map((seller, index) => {
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
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Módulo 3: Saúde da Base e Churn ─────────────────────────────────────────
export function Mod3Churn({ collapsed, onToggle, churnData }) {
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
                <span style={styles.netAddsVal}>{churnData.clusterGrowth}</span>
              </div>
              <div style={styles.netAddsGlow} />
            </div>

            {/* Motivos de evasão */}
            <div style={styles.churnReasonCard}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Activity size={14} /> Motivos de Evasão (Mês Atual)
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={churnData.churnReasons} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                      {churnData.churnReasons.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#${entry.gradId})`} style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(22, 25, 59, 0.95)', borderColor: '#2d325a', color: '#ffffff', borderRadius: '12px', fontSize: '11px', backdropFilter: 'blur(5px)' }} itemStyle={{ fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {churnData.churnReasons.slice(0, 3).map((item, idx) => {
                  const baseColor = item.gradId === 'neon-orange' ? '#f83600' : item.gradId === 'neon-purple' ? '#c471ed' : '#00f2fe';
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ffffff', fontWeight: 'bold' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: baseColor, boxShadow: `0 0 5px ${baseColor}` }} />
                      {item.name}
                    </div>
                  );
                })}
              </div>
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
                <ResponsiveContainer>
                  <AreaChart data={churnData.penetrationEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="#8b8fa3" tick={{ fill: '#8b8fa3', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#8b8fa3" tick={{ fill: '#8b8fa3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={val => `${val}%`} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(22, 25, 59, 0.95)', borderColor: '#2d325a', color: '#ffffff', borderRadius: '12px', backdropFilter: 'blur(5px)', fontSize: '12px' }} itemStyle={{ fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="Bady Bassitt" stroke="#00f2fe" fill="url(#neon-cyan-alpha)"   strokeWidth={3} style={{ filter: 'drop-shadow(0 0 4px rgba(0,242,254,0.5))'   }} />
                    <Area type="monotone" dataKey="Nova Granada"  stroke="#0ba360" fill="url(#neon-green-alpha)"  strokeWidth={3} style={{ filter: 'drop-shadow(0 0 4px rgba(11,163,96,0.5))'   }} />
                    <Area type="monotone" dataKey="Nova Aliança"  stroke="#f64f59" fill="url(#neon-purple-alpha)" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 4px rgba(246,79,89,0.5))'   }} />
                    <Area type="monotone" dataKey="Borborema"     stroke="#f9d423" fill="url(#neon-orange-alpha)" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 4px rgba(249,212,35,0.5))'  }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Net Adds por cidade */}
            <div style={styles.citiesGrowthCard}>
              {churnData.cities.map((city, idx) => {
                const isNegative = city.growth.includes('-');
                return (
                  <div key={idx} style={styles.cityGrowthRow}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>{city.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: isNegative ? '#f83600' : '#0ba360', background: isNegative ? 'rgba(248,54,0,0.1)' : 'rgba(11,163,96,0.1)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${isNegative ? 'rgba(248,54,0,0.3)' : 'rgba(11,163,96,0.3)'}`, boxShadow: isNegative ? '0 0 10px rgba(248,54,0,0.2)' : '0 0 10px rgba(11,163,96,0.2)' }}>
                      {city.growth} net
                    </span>
                  </div>
                );
              })}
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
              <ResponsiveContainer>
                <ComposedChart data={filteredMegaData} margin={{ top: 35, right: 20, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 'bold', fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8fa3', fontSize: 12 }} />
                  <RechartsTooltip content={props => <MegaTooltip {...props} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
                  <Bar dataKey="netAdds" barSize={4} radius={4}>
                    {filteredMegaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gradId} opacity={0.6} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="netAdds" stroke="none" isAnimationActive dot={<NeonLollipopDot />} activeDot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}