import type { Bill, ExpenseItem, Member } from "./types";

export function itemTotal(item: ExpenseItem) {
  return item.price * item.quantity;
}

export function subtotal(items: ExpenseItem[]) {
  return items.reduce((s, i) => s + itemTotal(i), 0);
}

export interface BillTotals {
  subtotal: number;
  service: number;
  vat: number;
  grand: number;
}

export function billTotals(bill: Bill): BillTotals {
  const sub = subtotal(bill.items);
  const service = bill.serviceCharge ? sub * bill.serviceChargeRate : 0;
  const vatBase = sub + service;
  const vat = bill.vat ? vatBase * bill.vatRate : 0;
  return { subtotal: sub, service, vat, grand: sub + service + vat };
}

export interface PerPerson {
  member: Member;
  items: { item: ExpenseItem; share: number }[];
  subtotal: number;
  extras: number; // service + vat share
  total: number;
}

export function perPersonBreakdown(bill: Bill, members: Member[]): PerPerson[] {
  const totals = billTotals(bill);
  const extrasTotal = totals.service + totals.vat;

  const perMember = new Map<string, PerPerson>();
  members.forEach((m) =>
    perMember.set(m.id, { member: m, items: [], subtotal: 0, extras: 0, total: 0 }),
  );

  for (const item of bill.items) {
    if (item.assignedTo.length === 0) continue;
    const itemSum = itemTotal(item);
    const share = itemSum / item.assignedTo.length;
    for (const mid of item.assignedTo) {
      const p = perMember.get(mid);
      if (!p) continue;
      p.items.push({ item, share });
      p.subtotal += share;
    }
  }

  // Distribute extras proportional to subtotal
  const totalAssigned = Array.from(perMember.values()).reduce((s, p) => s + p.subtotal, 0);
  for (const p of perMember.values()) {
    p.extras = totalAssigned > 0 ? (p.subtotal / totalAssigned) * extrasTotal : 0;
    p.total = p.subtotal + p.extras;
  }
  return Array.from(perMember.values()).filter((p) => p.items.length > 0);
}

export function assignmentProgress(bill: Bill) {
  const total = bill.items.length;
  const done = bill.items.filter((i) => i.assignedTo.length > 0).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
