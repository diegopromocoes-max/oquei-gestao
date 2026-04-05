import React, { useEffect, useMemo, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Bell,
  Check,
  History,
  LayoutPanelLeft,
  Lock,
  Palette,
  Settings2,
  UserRound,
  Users,
} from 'lucide-react';

import { auth, db } from '../firebase';
import {
  Btn,
  Card,
  Divider,
  Empty,
  InfoBox,
  Input,
  Page,
  Select,
  colors,
} from '../components/ui';
import { GestaoAtendentes, GestaoSupervisores } from './GestaoColaboradores';
import ConfigBaseAtiva from './configuracoes/ConfigBaseAtiva';
import ConfigHistorico from './configuracoes/ConfigHistorico';
import { MANAGED_ROLE_OPTIONS, MODULE_CATALOG, PANEL_KEYS, PANEL_LABELS } from '../lib/moduleCatalog';
import { getDefaultEnabledIds, resolveModuleAccess } from '../lib/moduleAccess';
import { normalizeRole } from '../lib/roleUtils';
import {
  DEFAULT_USER_PREFERENCES,
  getRoleNavigationConfig,
  getUserNavigationOverride,
  mergePreferences,
  saveRoleNavigationConfig,
  saveUserNavigationOverride,
} from '../services/userSettings';

const ROLE_PANEL_MAP = {
  coordinator: PANEL_KEYS.COORDINATOR,
  supervisor: PANEL_KEYS.SUPERVISOR,
  growth_team: PANEL_KEYS.GROWTH,
  attendant: PANEL_KEYS.ATTENDANT,
};

const TAB_DEFS = [
  { id: 'perfil', label: 'Meu Perfil', icon: UserRound, adminOnly: false },
  { id: 'preferencias', label: 'Preferencias', icon: Palette, adminOnly: false },
  { id: 'seguranca', label: 'Seguranca', icon: Lock, adminOnly: false },
  { id: 'modulos', label: 'Modulos Ativos', icon: LayoutPanelLeft, adminOnly: true },
  { id: 'base', label: 'Base de Clientes', icon: Settings2, adminOnly: true },
  { id: 'historico', label: 'Lancar Historico', icon: History, adminOnly: true },
  { id: 'acessos', label: 'Acessos', icon: Users, adminOnly: true },
];

function ReadonlyField({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div
        style={{
          padding: '11px 13px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          background: 'var(--bg-app)',
          color: 'var(--text-main)',
          fontSize: '14px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {value || 'Nao informado'}
      </div>
    </div>
  );
}

function ToggleCard({ title, description, checked, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 18px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'var(--bg-app)',
        cursor: 'pointer',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{description}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  );
}

function ModuleModeButton({ active, color, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 10px',
        borderRadius: '10px',
        border: active ? `1px solid ${color}` : '1px solid var(--border)',
        background: active ? `${color}20` : 'transparent',
        color: active ? color : 'var(--text-muted)',
        fontWeight: '700',
        fontSize: '12px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export default function Configuracoes({
  userData,
  panel,
  activeModules = [],
  preferences = DEFAULT_USER_PREFERENCES,
  onPreferencesChange,
  onSettingsSaved,
}) {
  const roleKey = normalizeRole(userData?.role);
  const isAdmin = ['coordinator', 'supervisor'].includes(roleKey);
  const tabs = TAB_DEFS.filter((tab) => !tab.adminOnly || isAdmin);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'perfil');
  const [profileDraft, setProfileDraft] = useState({ name: userData?.name || '', photo: userData?.photo || '' });
  const [prefsDraft, setPrefsDraft] = useState(() => mergePreferences(DEFAULT_USER_PREFERENCES, preferences));
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('supervisor');
  const [roleEnabledIds, setRoleEnabledIds] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserOverride, setSelectedUserOverride] = useState({ hiddenModuleIds: [], forcedModuleIds: [] });
  const [users, setUsers] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [accessTab, setAccessTab] = useState('lideres');
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  const isSingleColumnLayout = viewportWidth < 1100;
  const isTightGridLayout = viewportWidth < 900;

  useEffect(() => {
    setProfileDraft({ name: userData?.name || '', photo: userData?.photo || '' });
  }, [userData?.name, userData?.photo]);

  useEffect(() => {
    setPrefsDraft(mergePreferences(DEFAULT_USER_PREFERENCES, preferences));
  }, [preferences]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 'perfil');
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isMounted = true;
    setLoadingAdminData(true);

    Promise.all([
      getDocs(collection(db, 'users')),
      getRoleNavigationConfig(selectedRole),
    ])
      .then(([usersSnap, roleConfig]) => {
        if (!isMounted) return;
        setUsers(usersSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
        const rolePanel = ROLE_PANEL_MAP[selectedRole];
        const roleModules = MODULE_CATALOG.filter((module) => module.panel === rolePanel);
        const defaultIds = getDefaultEnabledIds({ role: selectedRole, catalog: roleModules });
        setRoleEnabledIds(Array.isArray(roleConfig.enabledModuleIds) ? roleConfig.enabledModuleIds : defaultIds);
      })
      .finally(() => {
        if (isMounted) setLoadingAdminData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, selectedRole]);

  useEffect(() => {
    if (!isAdmin || !selectedUserId) {
      setSelectedUserOverride({ hiddenModuleIds: [], forcedModuleIds: [] });
      return;
    }

    getUserNavigationOverride(selectedUserId).then((override) => {
      setSelectedUserOverride(override);
    });
  }, [isAdmin, selectedUserId]);

  useEffect(() => {
    setSelectedUserId('');
    setSelectedUserOverride({ hiddenModuleIds: [], forcedModuleIds: [] });
  }, [selectedRole]);

  const currentPanelOptions = activeModules.map((module) => ({
    value: module.id,
    label: module.label,
  }));

  const rolePanel = ROLE_PANEL_MAP[selectedRole];
  const roleModules = useMemo(
    () => MODULE_CATALOG.filter((module) => module.panel === rolePanel),
    [rolePanel]
  );

  const filteredRoleModules = useMemo(() => {
    return roleModules.filter((module) => {
      if (!adminSearch.trim()) return true;
      return `${module.label} ${module.section}`.toLowerCase().includes(adminSearch.toLowerCase());
    });
  }, [adminSearch, roleModules]);

  const selectedUsersForRole = useMemo(() => {
    return users.filter((user) => normalizeRole(user.role) === selectedRole);
  }, [selectedRole, users]);

  const userOptions = selectedUsersForRole.map((user) => ({
    value: user.id,
    label: `${user.name || user.email || user.id} (${user.cityId || user.sector || 'sem local'})`,
  }));

  const rolePreview = useMemo(
    () =>
      resolveModuleAccess({
        role: selectedRole,
        catalog: roleModules,
        roleConfig: { enabledModuleIds: roleEnabledIds },
        userOverride: selectedUserId ? selectedUserOverride : {},
      }),
    [roleEnabledIds, roleModules, selectedRole, selectedUserId, selectedUserOverride]
  );

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        name: profileDraft.name.trim(),
        photo: profileDraft.photo.trim(),
        updatedAt: serverTimestamp(),
      });
      window.showToast?.('Perfil atualizado com sucesso.', 'success');
    } catch (error) {
      window.showToast?.(`Erro ao salvar perfil: ${error.message}`, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      await onPreferencesChange?.(prefsDraft);
      window.showToast?.('Preferencias salvas.', 'success');
    } catch (error) {
      window.showToast?.(`Erro ao salvar preferencias: ${error.message}`, 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const sendReset = async () => {
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, userData.email);
      window.showToast?.('Email de redefinicao enviado.', 'success');
    } catch (error) {
      window.showToast?.(`Nao foi possivel enviar o email: ${error.message}`, 'error');
    } finally {
      setSendingReset(false);
    }
  };

  const toggleRoleModule = (moduleId) => {
    setRoleEnabledIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]
    );
  };

  const restoreRoleDefaults = () => {
    setRoleEnabledIds(getDefaultEnabledIds({ role: selectedRole, catalog: roleModules }));
  };

  const saveRoleModules = async () => {
    try {
      await saveRoleNavigationConfig(selectedRole, roleEnabledIds, userData?.name || 'Gestor');
      await onSettingsSaved?.();
      window.showToast?.('Configuracao de modulos atualizada.', 'success');
    } catch (error) {
      window.showToast?.(`Erro ao salvar modulos: ${error.message}`, 'error');
    }
  };

  const setOverrideMode = (moduleId, mode) => {
    setSelectedUserOverride((current) => {
      const hidden = new Set(current.hiddenModuleIds || []);
      const forced = new Set(current.forcedModuleIds || []);

      hidden.delete(moduleId);
      forced.delete(moduleId);

      if (mode === 'hide') hidden.add(moduleId);
      if (mode === 'show') forced.add(moduleId);

      return {
        hiddenModuleIds: Array.from(hidden),
        forcedModuleIds: Array.from(forced),
      };
    });
  };

  const saveUserOverride = async () => {
    if (!selectedUserId) {
      window.showToast?.('Selecione um usuario para salvar excecoes.', 'error');
      return;
    }

    try {
      await saveUserNavigationOverride(selectedUserId, selectedUserOverride, userData?.name || 'Gestor');
      await onSettingsSaved?.();
      window.showToast?.('Excecoes do usuario salvas.', 'success');
    } catch (error) {
      window.showToast?.(`Erro ao salvar excecoes: ${error.message}`, 'error');
    }
  };

  const renderProfileTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: isTightGridLayout ? '1fr' : '1.2fr 0.8fr', gap: '20px' }}>
      <Card title="Identidade do usuario" subtitle="Edite apenas os dados pessoais liberados.">
        <div style={{ display: 'grid', gap: '16px' }}>
          <Input
            label="Nome de exibicao"
            value={profileDraft.name}
            onChange={(event) => setProfileDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="URL do avatar"
            value={profileDraft.photo}
            onChange={(event) => setProfileDraft((prev) => ({ ...prev, photo: event.target.value }))}
            placeholder="https://..."
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={saveProfile} loading={savingProfile}>Salvar perfil</Btn>
          </div>
        </div>
      </Card>

      <Card title="Dados organizacionais" subtitle="Campos de vinculo permanecem protegidos.">
        <div style={{ display: 'grid', gap: '12px' }}>
          <ReadonlyField label="Email" value={userData?.email} />
          <ReadonlyField label="Cargo" value={userData?.role} />
          <ReadonlyField label="Cidade / Loja" value={userData?.cityId} />
          <ReadonlyField label="Cluster" value={userData?.clusterId} />
          <ReadonlyField label="Supervisor" value={userData?.supervisorUid} />
          <ReadonlyField label="Status" value={userData?.employmentStatus} />
          <ReadonlyField label="Admissao" value={userData?.hireDate} />
        </div>
      </Card>
    </div>
  );

  const renderPreferencesTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: isTightGridLayout ? '1fr' : '1fr 1fr', gap: '20px' }}>
      <Card title="Aparencia e navegação" subtitle="Essas preferencias valem para este usuario.">
        <div style={{ display: 'grid', gap: '16px' }}>
          <Select
            label="Tema"
            value={prefsDraft.theme}
            onChange={(event) => setPrefsDraft((prev) => ({ ...prev, theme: event.target.value }))}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
            ]}
          />
          <Select
            label="Densidade"
            value={prefsDraft.density}
            onChange={(event) => setPrefsDraft((prev) => ({ ...prev, density: event.target.value }))}
            options={[
              { value: 'comfortable', label: 'Confortavel' },
              { value: 'compact', label: 'Compacta' },
            ]}
          />
          <Select
            label="Modulo inicial"
            value={prefsDraft.defaultModule}
            onChange={(event) => setPrefsDraft((prev) => ({ ...prev, defaultModule: event.target.value }))}
            options={currentPanelOptions}
            placeholder="Escolha o modulo de entrada"
          />
          <ToggleCard
            title="Abrir sidebar recolhida"
            description="Mantem a barra lateral fechada por padrao."
            checked={Boolean(prefsDraft.sidebarCollapsed)}
            onChange={(event) => setPrefsDraft((prev) => ({ ...prev, sidebarCollapsed: event.target.checked }))}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={savePreferences} loading={savingPrefs}>Salvar preferencias</Btn>
          </div>
        </div>
      </Card>

      <Card title="Notificacoes" subtitle="Preferencias preparadas para os modulos atuais.">
        <div style={{ display: 'grid', gap: '12px' }}>
          <ToggleCard
            title="Comunicados"
            description="Receber alertas de comunicados e avisos internos."
            checked={Boolean(prefsDraft.notificationPrefs?.announcements)}
            onChange={(event) =>
              setPrefsDraft((prev) => ({
                ...prev,
                notificationPrefs: { ...prev.notificationPrefs, announcements: event.target.checked },
              }))
            }
          />
          <ToggleCard
            title="Performance"
            description="Receber alertas de metas, desempenho e indicadores."
            checked={Boolean(prefsDraft.notificationPrefs?.performance)}
            onChange={(event) =>
              setPrefsDraft((prev) => ({
                ...prev,
                notificationPrefs: { ...prev.notificationPrefs, performance: event.target.checked },
              }))
            }
          />
          <ToggleCard
            title="Resumo por email"
            description="Consolidar informacoes em um digest por email quando disponivel."
            checked={Boolean(prefsDraft.notificationPrefs?.emailDigest)}
            onChange={(event) =>
              setPrefsDraft((prev) => ({
                ...prev,
                notificationPrefs: { ...prev.notificationPrefs, emailDigest: event.target.checked },
              }))
            }
          />
        </div>
      </Card>
    </div>
  );

  const renderSecurityTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: isTightGridLayout ? '1fr' : '1fr 0.8fr', gap: '20px' }}>
      <Card title="Seguranca da conta" subtitle="A redefinicao de senha segue o fluxo oficial do Firebase Auth.">
        <InfoBox type="info">
          Para preservar seguranca e compatibilidade, a troca de senha sera enviada por email para o endereco da conta logada.
        </InfoBox>
        <div style={{ height: '16px' }} />
        <ReadonlyField label="Conta atual" value={userData?.email} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Btn onClick={sendReset} loading={sendingReset}>Enviar email de redefinicao</Btn>
        </div>
      </Card>

      <Card title="Boas praticas" subtitle="Recomendacoes para este projeto.">
        <div style={{ display: 'grid', gap: '12px' }}>
          <InfoBox type="success">Use senhas unicas e altere o acesso sempre que houver mudanca de equipe.</InfoBox>
          <InfoBox type="warning">Perfis administrativos devem revisar modulos e excecoes de usuarios periodicamente.</InfoBox>
          <InfoBox type="danger">Nao compartilhe links de recuperacao de senha fora do email corporativo oficial.</InfoBox>
        </div>
      </Card>
    </div>
  );

  const renderModulesTab = () => (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card title="Governanca de modulos" subtitle="Controle o que cada cargo enxerga e refine com excecoes por usuario.">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isSingleColumnLayout ? '1fr' : '1fr 1fr 1fr auto auto auto',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <Select label="Cargo" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} options={MANAGED_ROLE_OPTIONS} />
          <ReadonlyField label="Painel" value={PANEL_LABELS[rolePanel]} />
          <Input label="Buscar modulo" value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Nome ou secao" />
          <Btn variant="secondary" onClick={() => setRoleEnabledIds(roleModules.map((module) => module.id))}>Selecionar tudo</Btn>
          <Btn variant="secondary" onClick={() => setRoleEnabledIds([])}>Limpar</Btn>
          <Btn variant="secondary" onClick={restoreRoleDefaults}>Restaurar padrao</Btn>
        </div>
        <div style={{ height: '18px' }} />
        {loadingAdminData ? (
          <Empty icon="..." title="Carregando configuracoes" description="Buscando usuarios e regras do cargo." />
        ) : filteredRoleModules.length === 0 ? (
          <InfoBox type="info">Nenhum modulo encontrado para o filtro informado.</InfoBox>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
            {filteredRoleModules.map((module) => {
              const checked = roleEnabledIds.includes(module.id);
              return (
                <label
                  key={module.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '16px',
                    background: checked ? `${module.color || colors.primary}16` : 'var(--bg-card)',
                    display: 'flex',
                    gap: '12px',
                    cursor: 'pointer',
                    alignItems: 'flex-start',
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleRoleModule(module.id)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontWeight: '800', color: 'var(--text-main)' }}>{module.label}</div>
                      {checked ? <Check size={16} color={module.color || colors.primary} /> : null}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{module.section}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>{module.id}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <Btn onClick={saveRoleModules}>Salvar modulos do cargo</Btn>
        </div>
      </Card>

      <Card title="Excecoes por usuario" subtitle="Sobrescreva o padrao do cargo quando necessario.">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isTightGridLayout ? '1fr' : '1fr 1fr',
            gap: '16px',
            alignItems: 'end',
          }}
        >
          <Select
            label="Usuario"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            options={userOptions}
            placeholder="Selecione um usuario do cargo"
          />
          <ReadonlyField
            label="Previa"
            value={`${rolePreview.allowedModuleIds.length} modulos liberados / ${rolePreview.blockedModuleIds.length} bloqueados`}
          />
        </div>
        <div style={{ height: '18px' }} />
        {!selectedUserId ? (
          <InfoBox type="info">Escolha um usuario para configurar excecoes individuais.</InfoBox>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredRoleModules.map((module) => {
              const forced = selectedUserOverride.forcedModuleIds?.includes(module.id);
              const hidden = selectedUserOverride.hiddenModuleIds?.includes(module.id);
              return (
                <div
                  key={module.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    background: 'var(--bg-app)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{module.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{module.section}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <ModuleModeButton active={!forced && !hidden} color={colors.neutral} label="Herda" onClick={() => setOverrideMode(module.id, 'inherit')} />
                    <ModuleModeButton active={forced} color={colors.success} label="Exibir" onClick={() => setOverrideMode(module.id, 'show')} />
                    <ModuleModeButton active={hidden} color={colors.danger} label="Ocultar" onClick={() => setOverrideMode(module.id, 'hide')} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <Btn onClick={saveUserOverride}>Salvar excecoes do usuario</Btn>
        </div>
      </Card>
    </div>
  );

  const renderAccessTab = () => (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card title="Gestao de acessos" subtitle="Reaproveitando os modulos de lideres e colaboradores do projeto.">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Btn variant={accessTab === 'lideres' ? 'primary' : 'secondary'} onClick={() => setAccessTab('lideres')}>Lideres</Btn>
          <Btn variant={accessTab === 'colaboradores' ? 'primary' : 'secondary'} onClick={() => setAccessTab('colaboradores')}>Colaboradores</Btn>
        </div>
      </Card>
      {accessTab === 'lideres' ? <GestaoSupervisores /> : <GestaoAtendentes />}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'perfil':
        return renderProfileTab();
      case 'preferencias':
        return renderPreferencesTab();
      case 'seguranca':
        return renderSecurityTab();
      case 'modulos':
        return renderModulesTab();
      case 'base':
        return <ConfigBaseAtiva userData={userData} />;
      case 'historico':
        return <ConfigHistorico userData={userData} />;
      case 'acessos':
        return renderAccessTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <Page
      title="Configuracoes"
      subtitle="Ajuste perfil, preferencias pessoais e, quando permitido, governanca do sistema."
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Bell size={16} color={colors.primary} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
            {panel ? PANEL_LABELS[panel] : 'Painel atual'}
          </span>
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isSingleColumnLayout ? '1fr' : '280px minmax(0, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <Card title="Navegacao interna" subtitle="Tudo o que pode ser configurado nesta conta.">
          <div style={{ display: 'grid', gap: '8px' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: active ? `1px solid ${colors.primary}` : '1px solid var(--border)',
                    background: active ? colors.primaryLight : 'transparent',
                    color: active ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: active ? '800' : '700',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={16} color={active ? colors.primary : 'currentColor'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <Divider />
          <InfoBox type={isAdmin ? 'success' : 'info'}>
            {isAdmin
              ? 'Seu perfil tem acesso pessoal e administrativo. Alteracoes em modulos afetam sidebar e bloqueio por URL.'
              : 'Seu perfil visualiza apenas configuracoes pessoais e de seguranca.'}
          </InfoBox>
        </Card>

        <div style={{ display: 'grid', gap: '20px' }}>{renderTabContent()}</div>
      </div>
    </Page>
  );
}
