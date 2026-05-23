import { describe, expect, it } from 'vitest';
import { billTotals, assignmentProgress, itemTotal, perPersonBreakdown, subtotal } from './calc';
import type { Bill, Member } from './types';

const members: Member[] = [
  { id: 'm1', name: 'Alice' },
  { id: 'm2', name: 'Bob' },
];

const bill: Bill = {
  id: 'b1',
  createdAt: Date.now(),
  items: [
    { id: 'i1', name: 'Pizza', price: 100, quantity: 2, assignedTo: ['m1', 'm2'] },
    { id: 'i2', name: 'Soda', price: 30, quantity: 1, assignedTo: ['m1'] },
  ],
  serviceCharge: true,
  serviceChargeRate: 0.1,
  vat: true,
  vatRate: 0.07,
  settled: false,
};

describe('calc utilities', () => {
  it('computes itemTotal', () => {
    expect(itemTotal({ id: 'i2', name: 'Soda', price: 30, quantity: 2, assignedTo: ['m1'] })).toBe(60);
  });

  it('computes subtotal', () => {
    expect(subtotal(bill.items)).toBe(230);
  });

  it('computes bill totals with service and vat', () => {
    const totals = billTotals(bill);
    expect(totals.subtotal).toBe(230);
    expect(totals.service).toBeCloseTo(23);
    expect(totals.vat).toBeCloseTo((230 + 23) * 0.07);
    expect(totals.grand).toBeCloseTo(230 + 23 + (230 + 23) * 0.07);
  });

  it('computes per-person breakdown and distributes extras', () => {
    const breakdown = perPersonBreakdown(bill, members);
    expect(breakdown).toHaveLength(2);
    const alice = breakdown.find((entry) => entry.member.id === 'm1');
    const bob = breakdown.find((entry) => entry.member.id === 'm2');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(alice?.subtotal).toBeGreaterThan(0);
    expect(bob?.subtotal).toBeGreaterThan(0);
    expect(alice?.total).toBeGreaterThanOrEqual(alice?.subtotal ?? 0);
    expect(bob?.total).toBeGreaterThanOrEqual(bob?.subtotal ?? 0);
  });

  it('computes assignment progress', () => {
    const progress = assignmentProgress(bill);
    expect(progress.total).toBe(2);
    expect(progress.done).toBe(2);
    expect(progress.pct).toBe(100);
  });
});
