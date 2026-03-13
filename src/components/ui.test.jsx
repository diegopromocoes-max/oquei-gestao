import { colors, corMeta } from './ui';

describe('ui helpers', () => {
  it('corMeta retorna a cor correta por faixa', () => {
    expect(corMeta(100)).toBe(colors.success);
    expect(corMeta(80)).toBe(colors.primary);
    expect(corMeta(60)).toBe(colors.warning);
    expect(corMeta(10)).toBe(colors.danger);
  });
});
