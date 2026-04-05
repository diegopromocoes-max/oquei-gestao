import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScoreConfigEditor from './ScoreConfigEditor';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const config = {
  weights: {
    commercial: 50,
    behavior: 20,
    attendance: 15,
    engagement: 15,
  },
  thresholds: {
    green: 75,
    yellow: 55,
  },
  feedbackWindowDays: 10,
  alertThresholds: {
    conversionDrop: 10,
    attendanceRise: 2,
    stalledScoreDelta: 3,
    improvementStreakCount: 4,
  },
};

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

describe('ScoreConfigEditor', () => {
  beforeEach(() => {
    window.showToast = vi.fn();
  });

  it('mostra aviso quando a configuracao inicial esta invalida', () => {
    const invalidConfig = {
      ...config,
      weights: {
        commercial: 40,
        behavior: 20,
        attendance: 15,
        engagement: 15,
      },
    };
    const onSave = vi.fn();
    const { container, unmount } = renderComponent(<ScoreConfigEditor config={invalidConfig} onSave={onSave} />);

    expect(container.textContent).toContain('A soma atual dos pesos e 90');
    expect(onSave).not.toHaveBeenCalled();
    unmount();
  });

  it('salva configuracao valida sem alterar os pesos', () => {
    const onSave = vi.fn();
    const { container, unmount } = renderComponent(<ScoreConfigEditor config={config} onSave={onSave} />);
    const saveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Salvar configuracao'));

    act(() => {
      saveButton.click();
    });

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      weights: expect.objectContaining({
        commercial: 50,
        attendance: 15,
      }),
    }));
    unmount();
  });
});
