import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { InfoBox, Page, Spinner, colors } from './ui';
import PerformanceProfile from './PerformanceProfile';
import PerformanceRoster from './PerformanceRoster';
import { loadEmployeePerformanceData, loadPerformanceListData } from '../services/performance';

export default function DesempenhoPage({ userData }) {
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [config, setConfig] = useState(null);
  const [listError, setListError] = useState('');
  const [profileError, setProfileError] = useState('');

  const loadList = async () => {
    setLoading(true);
    setListError('');
    try {
      const result = await loadPerformanceListData({ period, userData });
      setRows(result.rows);
      setConfig(result.config);
    } catch (error) {
      console.error('Erro ao carregar modulo de desempenho:', error);
      setRows([]);
      setListError(error?.message || 'Nao foi possivel carregar os dados do modulo.');
      window.showToast?.('Erro ao carregar o modulo de desempenho.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, [period]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setProfileData(null);
      return;
    }

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');
      try {
        const result = await loadEmployeePerformanceData({
          employeeId: selectedEmployeeId,
          period,
          userData,
        });
        setProfileData(result);
      } catch (error) {
        console.error('Erro ao carregar perfil de desempenho:', error);
        setProfileData(null);
        setProfileError(error?.message || 'Nao foi possivel carregar o perfil do colaborador.');
        window.showToast?.('Erro ao carregar o perfil do colaborador.', 'error');
      }
      setProfileLoading(false);
    };

    loadProfile();
  }, [selectedEmployeeId, period]);

  const handleRefreshCurrent = async () => {
    await loadList();
    if (!selectedEmployeeId) return;

    setProfileLoading(true);
    setProfileError('');
    try {
      const result = await loadEmployeePerformanceData({
        employeeId: selectedEmployeeId,
        period,
        userData,
      });
      setProfileData(result);
    } catch (error) {
      console.error('Erro ao atualizar perfil de desempenho:', error);
      setProfileData(null);
      setProfileError(error?.message || 'Nao foi possivel atualizar o perfil do colaborador.');
      window.showToast?.('Erro ao carregar o perfil do colaborador.', 'error');
    }
    setProfileLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <Page
      title="Modulo de Desempenho"
      subtitle="Acompanhamento individual do time de vendas com score, feedbacks e plano de desenvolvimento."
      actions={(
        <button
          onClick={handleRefreshCurrent}
          style={{
            border: `1px solid ${colors.primary}30`,
            background: `${colors.primary}10`,
            color: colors.primary,
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '900',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
          Atualizar modulo
        </button>
      )}
    >
      {listError && (
        <div style={{ marginBottom: '20px' }}>
          <InfoBox type="error">{listError}</InfoBox>
        </div>
      )}

      {!selectedEmployeeId ? (
        <PerformanceRoster
          rows={rows}
          period={period}
          onPeriodChange={setPeriod}
          onSelectEmployee={setSelectedEmployeeId}
        />
      ) : profileError ? (
        <InfoBox type="error">{profileError}</InfoBox>
      ) : profileLoading || !profileData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Spinner size={28} />
        </div>
      ) : (
        <PerformanceProfile
          key={`${selectedEmployeeId}_${period}`}
          data={profileData}
          userData={userData}
          config={config || profileData.config}
          onBack={() => setSelectedEmployeeId('')}
          onRefresh={handleRefreshCurrent}
          onConfigChange={(nextConfig) => setConfig(nextConfig)}
        />
      )}
    </Page>
  );
}
