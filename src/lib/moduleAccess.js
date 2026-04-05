import { normalizeRole } from './roleUtils';

const SETTINGS_MODULE_ID = 'configuracoes';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildCatalogLookup(catalog = []) {
  return new Set(catalog.map((module) => module.id));
}

export function getDefaultEnabledIds({ role, catalog = [] }) {
  const roleKey = normalizeRole(role);
  return catalog
    .filter((module) => Boolean(module.defaultEnabledByRole?.[roleKey]))
    .map((module) => module.id);
}

export function resolveModuleAccess({
  role,
  catalog = [],
  roleConfig = {},
  userOverride = {},
}) {
  const roleKey = normalizeRole(role);
  const catalogLookup = buildCatalogLookup(catalog);
  const baseIds = Array.isArray(roleConfig?.enabledModuleIds)
    ? roleConfig.enabledModuleIds.filter((id) => catalogLookup.has(id))
    : getDefaultEnabledIds({ role: roleKey, catalog });

  const allowedIds = new Set(baseIds);
  const hiddenIds = ensureArray(userOverride?.hiddenModuleIds).filter((id) => catalogLookup.has(id));
  const forcedIds = ensureArray(userOverride?.forcedModuleIds).filter((id) => catalogLookup.has(id));

  hiddenIds.forEach((id) => allowedIds.delete(id));
  forcedIds.forEach((id) => allowedIds.add(id));

  let allowedModules = catalog.filter((module) => allowedIds.has(module.id));

  if (!allowedModules.length) {
    const emergencyModule =
      catalog.find((module) => module.id === SETTINGS_MODULE_ID) ||
      catalog[0] ||
      null;

    if (emergencyModule) {
      allowedIds.add(emergencyModule.id);
      allowedModules = [emergencyModule];
    }
  }

  const allowedModuleIds = allowedModules.map((module) => module.id);
  const blockedModuleIds = catalog
    .map((module) => module.id)
    .filter((id) => !allowedIds.has(id));

  return {
    roleKey,
    allowedModules,
    allowedModuleIds,
    blockedModuleIds,
    firstAvailableModule: allowedModuleIds[0] || null,
  };
}

export function resolvePreferredModule({
  requestedModule,
  preferredModule,
  allowedModuleIds = [],
  firstAvailableModule = null,
}) {
  if (requestedModule && allowedModuleIds.includes(requestedModule)) {
    return requestedModule;
  }

  if (preferredModule && allowedModuleIds.includes(preferredModule)) {
    return preferredModule;
  }

  return firstAvailableModule;
}
