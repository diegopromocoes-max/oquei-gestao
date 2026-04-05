import { useCallback, useEffect, useMemo, useState } from 'react';

import { getModulesForPanel } from '../lib/moduleCatalog';
import { resolveModuleAccess, resolvePreferredModule } from '../lib/moduleAccess';
import { normalizeRole } from '../lib/roleUtils';
import {
  DEFAULT_USER_PREFERENCES,
  getRoleNavigationConfig,
  getUserNavigationOverride,
  getUserPreferences,
  saveUserPreferences,
} from '../services/userSettings';

export function usePanelAccess({
  panel,
  userData,
  activeView,
  setActiveView,
  setDefaultModule,
}) {
  const uid = userData?.uid || '';
  const roleKey = normalizeRole(userData?.role);
  const catalog = useMemo(() => getModulesForPanel(panel), [panel]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);
  const [roleConfig, setRoleConfig] = useState({ enabledModuleIds: null });
  const [userOverride, setUserOverride] = useState({ hiddenModuleIds: [], forcedModuleIds: [] });

  const refresh = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [prefData, roleData, overrideData] = await Promise.all([
      getUserPreferences(uid),
      getRoleNavigationConfig(roleKey),
      getUserNavigationOverride(uid),
    ]);

    setPreferences(prefData || DEFAULT_USER_PREFERENCES);
    setRoleConfig(roleData || { enabledModuleIds: null });
    setUserOverride(overrideData || { hiddenModuleIds: [], forcedModuleIds: [] });
    setLoading(false);
  }, [roleKey, uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const access = useMemo(
    () =>
      resolveModuleAccess({
        role: roleKey,
        catalog,
        roleConfig,
        userOverride,
      }),
    [catalog, roleConfig, roleKey, userOverride]
  );

  const allowedSignature = access.allowedModuleIds.join('|');

  useEffect(() => {
    if (!setDefaultModule || loading) {
      return;
    }

    const preferredDefault = resolvePreferredModule({
      requestedModule: preferences.defaultModule,
      preferredModule: null,
      allowedModuleIds: access.allowedModuleIds,
      firstAvailableModule: access.firstAvailableModule,
    });

    if (preferredDefault) {
      setDefaultModule(preferredDefault);
    }
  }, [
    access.allowedModuleIds,
    access.firstAvailableModule,
    allowedSignature,
    loading,
    preferences.defaultModule,
    setDefaultModule,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const nextModule = resolvePreferredModule({
      requestedModule: activeView,
      preferredModule: preferences.defaultModule,
      allowedModuleIds: access.allowedModuleIds,
      firstAvailableModule: access.firstAvailableModule,
    });

    if (nextModule && nextModule !== activeView) {
      setActiveView(nextModule);
    }
  }, [
    access.allowedModuleIds,
    access.firstAvailableModule,
    activeView,
    allowedSignature,
    loading,
    preferences.defaultModule,
    setActiveView,
  ]);

  const updatePreferences = useCallback(
    async (patch) => {
      const saved = await saveUserPreferences(uid, patch, userData?.name || 'Usuário');
      setPreferences(saved);
      return saved;
    },
    [uid, userData?.name]
  );

  return {
    ...access,
    loading,
    catalog,
    preferences,
    roleConfig,
    userOverride,
    refresh,
    updatePreferences,
  };
}
