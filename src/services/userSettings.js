import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../firebase';
import { normalizeRole } from '../lib/roleUtils';

export const DEFAULT_USER_PREFERENCES = {
  theme: 'light',
  density: 'comfortable',
  defaultModule: '',
  sidebarCollapsed: false,
  notificationPrefs: {
    announcements: true,
    performance: true,
    emailDigest: false,
  },
};

const emptyRoleConfig = {
  enabledModuleIds: null,
};

const emptyOverride = {
  hiddenModuleIds: [],
  forcedModuleIds: [],
};

function cacheKey(uid) {
  return `oquei:user-preferences:${uid || 'anonymous'}`;
}

export function mergePreferences(base = {}, patch = {}) {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...base,
    ...patch,
    notificationPrefs: {
      ...DEFAULT_USER_PREFERENCES.notificationPrefs,
      ...(base.notificationPrefs || {}),
      ...(patch.notificationPrefs || {}),
    },
  };
}

export function getCachedUserPreferences(uid) {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey(uid));
    return raw ? mergePreferences(DEFAULT_USER_PREFERENCES, JSON.parse(raw)) : DEFAULT_USER_PREFERENCES;
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export function setCachedUserPreferences(uid, patch) {
  if (typeof window === 'undefined') {
    return mergePreferences(DEFAULT_USER_PREFERENCES, patch);
  }

  const merged = mergePreferences(getCachedUserPreferences(uid), patch);
  window.localStorage.setItem(cacheKey(uid), JSON.stringify(merged));
  return merged;
}

export async function getUserPreferences(uid) {
  if (!uid) {
    return DEFAULT_USER_PREFERENCES;
  }

  const cached = getCachedUserPreferences(uid);

  try {
    const snapshot = await getDoc(doc(db, 'user_preferences', uid));
    const data = snapshot.exists() ? snapshot.data() : {};
    const merged = mergePreferences(cached, data);
    setCachedUserPreferences(uid, merged);
    return merged;
  } catch {
    return cached;
  }
}

export async function saveUserPreferences(uid, patch, actorName = 'Sistema') {
  if (!uid) {
    return mergePreferences(DEFAULT_USER_PREFERENCES, patch);
  }

  const merged = setCachedUserPreferences(uid, patch);
  await setDoc(
    doc(db, 'user_preferences', uid),
    {
      ...merged,
      updatedAt: serverTimestamp(),
      updatedBy: actorName,
    },
    { merge: true }
  );
  return merged;
}

export async function getRoleNavigationConfig(role) {
  const roleKey = normalizeRole(role);
  if (!roleKey) {
    return emptyRoleConfig;
  }

  try {
    const snapshot = await getDoc(doc(db, 'navigation_roles', roleKey));
    return snapshot.exists()
      ? {
          ...emptyRoleConfig,
          ...snapshot.data(),
        }
      : emptyRoleConfig;
  } catch {
    return emptyRoleConfig;
  }
}

export async function saveRoleNavigationConfig(role, enabledModuleIds = [], actorName = 'Sistema') {
  const roleKey = normalizeRole(role);
  const payload = {
    enabledModuleIds: Array.from(new Set(enabledModuleIds)),
    updatedAt: serverTimestamp(),
    updatedBy: actorName,
  };

  await setDoc(doc(db, 'navigation_roles', roleKey), payload, { merge: true });
  return {
    ...emptyRoleConfig,
    ...payload,
  };
}

export async function getUserNavigationOverride(uid) {
  if (!uid) {
    return emptyOverride;
  }

  try {
    const snapshot = await getDoc(doc(db, 'navigation_user_overrides', uid));
    const data = snapshot.exists() ? snapshot.data() : {};
    return {
      ...emptyOverride,
      ...data,
      hiddenModuleIds: Array.isArray(data.hiddenModuleIds) ? data.hiddenModuleIds : [],
      forcedModuleIds: Array.isArray(data.forcedModuleIds) ? data.forcedModuleIds : [],
    };
  } catch {
    return emptyOverride;
  }
}

export async function saveUserNavigationOverride(uid, override = {}, actorName = 'Sistema') {
  if (!uid) {
    return emptyOverride;
  }

  const hiddenModuleIds = Array.from(new Set(override.hiddenModuleIds || []));
  const forcedModuleIds = Array.from(
    new Set((override.forcedModuleIds || []).filter((id) => !hiddenModuleIds.includes(id)))
  );

  const payload = {
    hiddenModuleIds,
    forcedModuleIds,
    updatedAt: serverTimestamp(),
    updatedBy: actorName,
  };

  await setDoc(doc(db, 'navigation_user_overrides', uid), payload, { merge: true });
  return {
    ...emptyOverride,
    ...payload,
  };
}
