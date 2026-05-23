import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useGroups } from "@/lib/storage";
import { billTotals } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Bill History — SplitEasy" },
      { name: "description", content: "All past bills across your groups." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { groups } = useGroups();
  const entries = groups
    .flatMap((g) =>
      g.bills
        .filter((b) => b.items.length > 0)
        .map((b) => ({ group: g, bill: b, totals: billTotals(b) })),
    )
    .sort((a, b) => b.bill.createdAt - a.bill.createdAt);

  return (
    <AppShell title="History">
      <div className="p-4 space-y-3">
        {entries.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto size-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <ScrollText className="size-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">No bills yet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bills you create will show up here.
            </p>
          </div>
        )}
        {entries.map(({ group, bill, totals }) => (
          <Link
            key={bill.id}
            to="/group/$id"
            params={{ id: group.id }}
            className="block rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{group.name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(bill.createdAt, "MMM d, yyyy • HH:mm")} • {bill.items.length} items
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold rounded-full px-2 py-1 ${
                  bill.settled
                    ? "bg-success text-success-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {bill.settled ? "Settled" : "Unsettled"}
              </span>
            </div>
            <div className="mt-2 text-lg font-bold text-primary">{formatMoney(totals.grand)}</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
