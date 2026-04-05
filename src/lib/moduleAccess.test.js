import { describe, expect, it } from 'vitest';

import { resolveModuleAccess, resolvePreferredModule } from './moduleAccess';

const catalog = [
  { id: 'dashboard', defaultEnabledByRole: { supervisor: true } },
  { id: 'crm_ativo', defaultEnabledByRole: { supervisor: true } },
  { id: 'configuracoes', defaultEnabledByRole: { supervisor: true } },
];

describe('resolveModuleAccess', () => {
  it('uses defaults when no Firestore config exists', () => {
    const result = resolveModuleAccess({
      role: 'supervisor',
      catalog,
    });

    expect(result.allowedModuleIds).toEqual(['dashboard', 'crm_ativo', 'configuracoes']);
    expect(result.firstAvailableModule).toBe('dashboard');
  });

  it('applies role config and user overrides together', () => {
    const result = resolveModuleAccess({
      role: 'supervisor',
      catalog,
      roleConfig: { enabledModuleIds: ['dashboard', 'configuracoes'] },
      userOverride: { hiddenModuleIds: ['dashboard'], forcedModuleIds: ['crm_ativo'] },
    });

    expect(result.allowedModuleIds).toEqual(['crm_ativo', 'configuracoes']);
    expect(result.blockedModuleIds).toEqual(['dashboard']);
  });

  it('keeps configuracoes as emergency fallback when everything is disabled', () => {
    const result = resolveModuleAccess({
      role: 'supervisor',
      catalog,
      roleConfig: { enabledModuleIds: [] },
      userOverride: { hiddenModuleIds: ['configuracoes'] },
    });

    expect(result.allowedModuleIds).toEqual(['configuracoes']);
    expect(result.firstAvailableModule).toBe('configuracoes');
  });
});

describe('resolvePreferredModule', () => {
  it('prefers the requested module when allowed', () => {
    const result = resolvePreferredModule({
      requestedModule: 'crm_ativo',
      preferredModule: 'dashboard',
      allowedModuleIds: ['dashboard', 'crm_ativo'],
      firstAvailableModule: 'dashboard',
    });

    expect(result).toBe('crm_ativo');
  });

  it('falls back to the saved default and then to the first available module', () => {
    const result = resolvePreferredModule({
      requestedModule: 'blocked',
      preferredModule: 'crm_ativo',
      allowedModuleIds: ['dashboard', 'crm_ativo'],
      firstAvailableModule: 'dashboard',
    });

    expect(result).toBe('crm_ativo');

    const fallback = resolvePreferredModule({
      requestedModule: 'blocked',
      preferredModule: 'also-blocked',
      allowedModuleIds: ['dashboard'],
      firstAvailableModule: 'dashboard',
    });

    expect(fallback).toBe('dashboard');
  });
});
