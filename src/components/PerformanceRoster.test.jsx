import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PerformanceRoster from './PerformanceRoster';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const rows = [
  {
    id: 'emp-1',
    employee: {
      name: 'Joao Silva',
      jobTitle: 'Vendedor',
      teamName: 'Loja A',
      employmentStatus: 'ativo',
    },
    score: 82,
    status: 'green',
    targetPercent: 95,
    presencePercent: 98,
    pendingActions: 1,
    latestFeedbackLabel: '2026-04-01',
  },
  {
    id: 'emp-2',
    employee: {
      name: 'Maria Souza',
      jobTitle: 'Vendedora',
      teamName: 'Loja B',
      employmentStatus: 'afastado',
    },
    score: 61,
    status: 'yellow',
    targetPercent: 72,
    presencePercent: 90,
    pendingActions: 3,
    latestFeedbackLabel: '2026-03-28',
  },
];

function renderComponent(ui) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PerformanceRoster', () => {
  it('renderiza filtros principais e abre o perfil selecionado', () => {
    const onSelectEmployee = vi.fn();
    const onPeriodChange = vi.fn();
    const { container, unmount } = renderComponent(
      <PerformanceRoster
        rows={rows}
        period="2026-04"
        onPeriodChange={onPeriodChange}
        onSelectEmployee={onSelectEmployee}
      />,
    );

    const searchInput = container.querySelector('input[placeholder="Nome, cargo ou equipe"]');
    const selects = container.querySelectorAll('select');
    const periodInput = container.querySelector('input[type="month"]');

    expect(searchInput).toBeTruthy();
    expect(selects).toHaveLength(2);
    expect(periodInput).toBeTruthy();
    expect(container.textContent).toContain('Joao Silva');
    expect(container.textContent).toContain('Maria Souza');

    const profileButtons = Array.from(container.querySelectorAll('button')).filter((button) => button.textContent.includes('Abrir perfil'));
    act(() => {
      profileButtons[1].click();
    });
    expect(onSelectEmployee).toHaveBeenCalledWith('emp-2');
    expect(onPeriodChange).not.toHaveBeenCalled();

    unmount();
  });
});
