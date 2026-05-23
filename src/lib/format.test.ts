import { describe, expect, it } from 'vitest';
import { formatMoney, initials, uid } from './format';

describe('format utilities', () => {
  it('formats money with symbol and two decimals', () => {
    expect(formatMoney(1234.5)).toBe('฿1,234.50');
    expect(formatMoney(9999.999)).toBe('฿10,000.00');
  });

  it('generates initials from single and multi-word names', () => {
    expect(initials('Alice')).toBe('AL');
    expect(initials('Alice Bob Carol')).toBe('AC');
    expect(initials('  single  ')).toBe('SI');
  });

  it('generates a unique identifier string', () => {
    const value1 = uid();
    const value2 = uid();
    expect(typeof value1).toBe('string');
    expect(typeof value2).toBe('string');
    expect(value1).not.toBe(value2);
    expect(value1.length).toBeGreaterThanOrEqual(8);
  });
});
