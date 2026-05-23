export function formatMoney(n: number, symbol = "฿") {
  if (!isFinite(n)) n = 0;
  return `${symbol}${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
