import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ScanLine,
  Loader2,
  Check,
  Share2,
  Download,
  Receipt,
  Users as UsersIcon,
  PartyPopper,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useGroups, useSettings } from "@/lib/storage";
import { categoryMeta } from "@/lib/category";
import { uid, formatMoney } from "@/lib/format";
import {
  billTotals,
  itemTotal,
  subtotal,
  perPersonBreakdown,
  assignmentProgress,
} from "@/lib/calc";
import type { Bill, ExpenseItem, Group } from "@/lib/types";
import { useServerFn } from "@tanstack/react-start";
import { scanReceipt } from "@/lib/ocr.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/group/$id")({
  component: GroupPage,
});

function ensureActiveBill(group: Group, defaults: { sc: boolean; vat: boolean }): Bill {
  const active = group.bills.find((b) => b.id === group.activeBillId && !b.settled);
  if (active) return active;
  return {
    id: uid(),
    createdAt: Date.now(),
    items: [],
    serviceCharge: defaults.sc,
    serviceChargeRate: 0.1,
    vat: defaults.vat,
    vatRate: 0.07,
    settled: false,
  };
}

function GroupPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { groups, setGroups } = useGroups();
  const { settings } = useSettings();
  const [tab, setTab] = useState<"expenses" | "assign" | "summary">("expenses");

  const group = groups.find((g) => g.id === id);

  // Ensure there's an active bill for editing
  useEffect(() => {
    if (!group) return;
    if (group.activeBillId && group.bills.some((b) => b.id === group.activeBillId)) return;
    const bill = ensureActiveBill(group, {
      sc: settings.defaultServiceCharge,
      vat: settings.defaultVat,
    });
    const updated: Group = {
      ...group,
      bills: group.bills.some((b) => b.id === bill.id) ? group.bills : [...group.bills, bill],
      activeBillId: bill.id,
      updatedAt: Date.now(),
    };
    setGroups(groups.map((g) => (g.id === group.id ? updated : g)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  if (!group) {
    return (
      <AppShell title="Group" back={<BackButton />}>
        <div className="p-8 text-center text-muted-foreground">
          Group not found.
          <div className="mt-4">
            <Link to="/" className="text-primary underline">
              Back to groups
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const bill =
    group.bills.find((b) => b.id === group.activeBillId && !b.settled) ??
    group.bills[group.bills.length - 1];

  const updateBill = (mut: (b: Bill) => Bill) => {
    if (!bill) return;
    const nextBill = mut(bill);
    const nextGroup: Group = {
      ...group,
      bills: group.bills.map((b) => (b.id === bill.id ? nextBill : b)),
      updatedAt: Date.now(),
    };
    setGroups(groups.map((g) => (g.id === group.id ? nextGroup : g)));
  };

  const settleAndReset = () => {
    if (!bill) return;
    const settledBill: Bill = { ...bill, settled: true };
    const newActive: Bill = {
      id: uid(),
      createdAt: Date.now(),
      items: [],
      serviceCharge: settings.defaultServiceCharge,
      serviceChargeRate: 0.1,
      vat: settings.defaultVat,
      vatRate: 0.07,
      settled: false,
    };
    const nextGroup: Group = {
      ...group,
      bills: [...group.bills.map((b) => (b.id === bill.id ? settledBill : b)), newActive],
      activeBillId: newActive.id,
      updatedAt: Date.now(),
    };
    setGroups(groups.map((g) => (g.id === group.id ? nextGroup : g)));
    toast.success("Bill marked as settled");
    setTab("expenses");
  };

  const meta = categoryMeta(group.category);
  const Icon = meta.icon;

  return (
    <AppShell
      title={group.name}
      back={
        <button
          onClick={() => navigate({ to: "/" })}
          className="-ml-2 p-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
      }
      right={
        <div className="size-9 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="size-4 text-primary" />
        </div>
      }
    >
      {bill && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="p-4 space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="expenses">Items</TabsTrigger>
            <TabsTrigger value="assign">Assign</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-0 space-y-4">
            <ExpensesTab
              group={group}
              bill={bill}
              updateBill={updateBill}
              onNext={() => setTab("assign")}
            />
            <HistorySection group={group} />
          </TabsContent>

          <TabsContent value="assign" className="mt-0">
            <AssignTab
              group={group}
              bill={bill}
              updateBill={updateBill}
              onNext={() => setTab("summary")}
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-0">
            <SummaryTab group={group} bill={bill} onSettle={settleAndReset} />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

function BackButton() {
  return (
    <Link to="/" className="-ml-2 p-2 rounded-full hover:bg-muted">
      <ArrowLeft className="size-5" />
    </Link>
  );
}

/* ---------- Expenses tab ---------- */

function ExpensesTab({
  group,
  bill,
  updateBill,
  onNext,
}: {
  group: Group;
  bill: Bill;
  updateBill: (mut: (b: Bill) => Bill) => void;
  onNext: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [scanOpen, setScanOpen] = useState(false);

  const addItem = () => {
    const p = parseFloat(price);
    const q = parseInt(qty || "1", 10);
    if (!name.trim() || !isFinite(p) || p <= 0) {
      toast.error("Enter item name and price");
      return;
    }
    const item: ExpenseItem = {
      id: uid(),
      name: name.trim(),
      price: p,
      quantity: Math.max(1, q),
      assignedTo: [],
    };
    updateBill((b) => ({ ...b, items: [...b.items, item] }));
    setName("");
    setPrice("");
    setQty("1");
  };

  const mergeScanned = (items: { name: string; price: number; quantity: number }[]) => {
    const newItems: ExpenseItem[] = items.map((i) => ({
      id: uid(),
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      assignedTo: [],
    }));
    updateBill((b) => ({ ...b, items: [...b.items, ...newItems] }));
    toast.success(`Added ${items.length} item${items.length !== 1 ? "s" : ""} from receipt`);
  };

  const totals = billTotals(bill);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)] space-y-3">
        <div className="text-sm font-semibold">Add item</div>
        <Input
          placeholder="Item name (e.g. Pad Thai)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            className="col-span-2"
            type="number"
            inputMode="decimal"
            placeholder="Price ฿"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 gap-1" onClick={addItem}>
            <Plus className="size-4" /> Add item
          </Button>
          <Button variant="secondary" className="gap-1" onClick={() => setScanOpen(true)}>
            <ScanLine className="size-4" /> Scan
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-[var(--shadow-soft)] overflow-hidden">
        {bill.items.length === 0 ? (
          <div className="text-center py-10 px-6">
            <Receipt className="size-10 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">No items yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add items manually or scan a receipt.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {bill.items.map((item) => (
              <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.quantity} × {formatMoney(item.price)}
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatMoney(itemTotal(item))}</div>
                <button
                  onClick={() =>
                    updateBill((b) => ({ ...b, items: b.items.filter((x) => x.id !== item.id) }))
                  }
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Service charge (10%)</div>
            <div className="text-xs text-muted-foreground">
              {bill.serviceCharge ? formatMoney(totals.service) : "Off"}
            </div>
          </div>
          <Switch
            checked={bill.serviceCharge}
            onCheckedChange={(v) => updateBill((b) => ({ ...b, serviceCharge: v }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">VAT (7%)</div>
            <div className="text-xs text-muted-foreground">
              {bill.vat ? formatMoney(totals.vat) : "Off"}
            </div>
          </div>
          <Switch
            checked={bill.vat}
            onCheckedChange={(v) => updateBill((b) => ({ ...b, vat: v }))}
          />
        </div>
        <div className="pt-3 border-t border-border space-y-1">
          <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
          {bill.serviceCharge && <Row label="Service 10%" value={formatMoney(totals.service)} />}
          {bill.vat && <Row label="VAT 7%" value={formatMoney(totals.vat)} />}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-xl font-bold text-accent">{formatMoney(totals.grand)}</span>
          </div>
        </div>
      </div>

      <Button className="w-full" disabled={bill.items.length === 0} onClick={onNext} size="lg">
        Continue to assign →
      </Button>

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} onAdd={mergeScanned} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function HistorySection({ group }: { group: Group }) {
  const past = group.bills.filter((b) => b.items.length > 0 && b.settled);
  if (past.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)]">
      <div className="text-sm font-semibold mb-2">Past bills</div>
      <ul className="space-y-2">
        {past
          .slice()
          .reverse()
          .map((b) => {
            const t = billTotals(b);
            return (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{b.items.length} items</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatMoney(t.grand)}</span>
                  <span className="text-[10px] font-semibold rounded-full bg-success text-success-foreground px-2 py-1">
                    Settled
                  </span>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/* ---------- Scan dialog ---------- */

function ScanDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (items: { name: string; price: number; quantity: number }[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ name: string; price: number; quantity: number }[] | null>(
    null,
  );
  const scan = useServerFn(scanReceipt);

  const reset = () => {
    setItems(null);
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (file: File) => {
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await scan({ data: { image: dataUrl } });
      if (res.items.length === 0) {
        toast.error("No items detected. Try a clearer photo.");
        setLoading(false);
        return;
      }
      setItems(res.items);
    } catch (e) {
      console.error("Receipt scan failed", e);
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!items) return;
    onAdd(items);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Scan receipt</DialogTitle>
        </DialogHeader>

        {!items && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Take a photo or upload a receipt. AI will extract the items.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            <Button className="w-full gap-2" onClick={() => fileRef.current?.click()}>
              <ScanLine className="size-4" /> Choose image
            </Button>
          </div>
        )}

        {loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="size-8 mx-auto animate-spin text-primary mb-2" />
            Reading receipt…
          </div>
        )}

        {items && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Review and edit before adding. Tap a field to fix it.
            </p>
            <ul className="max-h-72 overflow-y-auto space-y-2">
              {items.map((it, idx) => (
                <li key={idx} className="flex gap-2 items-center">
                  <Input
                    value={it.name}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setItems(next);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={it.price}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                      setItems(next);
                    }}
                    className="w-20"
                  />
                  <button
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {items && <Button onClick={confirm}>Add {items.length} items</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Assign tab ---------- */

function AssignTab({
  group,
  bill,
  updateBill,
  onNext,
}: {
  group: Group;
  bill: Bill;
  updateBill: (mut: (b: Bill) => Bill) => void;
  onNext: () => void;
}) {
  const progress = assignmentProgress(bill);

  const toggle = (itemId: string, memberId: string) => {
    updateBill((b) => ({
      ...b,
      items: b.items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              assignedTo: it.assignedTo.includes(memberId)
                ? it.assignedTo.filter((m) => m !== memberId)
                : [...it.assignedTo, memberId],
            }
          : it,
      ),
    }));
  };

  const assignAll = (itemId: string) => {
    updateBill((b) => ({
      ...b,
      items: b.items.map((it) =>
        it.id === itemId ? { ...it, assignedTo: group.members.map((m) => m.id) } : it,
      ),
    }));
  };

  if (bill.items.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
        <UsersIcon className="size-10 text-primary mx-auto mb-2" />
        <p className="font-medium">No items to assign</p>
        <p className="text-sm text-muted-foreground mt-1">Add items first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">Assignment progress</span>
          <span className="text-muted-foreground">
            {progress.done}/{progress.total}
          </span>
        </div>
        <Progress value={progress.pct} />
      </div>

      <ul className="space-y-3">
        {bill.items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.quantity} × {formatMoney(item.price)} ={" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(itemTotal(item))}
                  </span>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => assignAll(item.id)}>
                All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.members.map((m) => {
                const selected = item.assignedTo.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(item.id, m.id)}
                    className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-xs border transition ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border"
                    }`}
                  >
                    <MemberAvatar id={m.id} name={m.name} size="sm" />
                    <span>{m.name}</span>
                    {selected && <Check className="size-3" />}
                  </button>
                );
              })}
            </div>
            {item.assignedTo.length > 1 && (
              <div className="text-[11px] text-muted-foreground">
                Split equally: {formatMoney(itemTotal(item) / item.assignedTo.length)} each
              </div>
            )}
          </li>
        ))}
      </ul>

      <Button className="w-full" size="lg" onClick={onNext} disabled={progress.done === 0}>
        See bills →
      </Button>
    </div>
  );
}

/* ---------- Summary tab ---------- */

function SummaryTab({ group, bill, onSettle }: { group: Group; bill: Bill; onSettle: () => void }) {
  const breakdown = useMemo(() => perPersonBreakdown(bill, group.members), [bill, group.members]);
  const totals = billTotals(bill);

  const text = useMemo(() => {
    const lines: string[] = [];
    lines.push(`🧾 SplitEasy — ${group.name}`);
    lines.push("");
    for (const p of breakdown) {
      const itemTxt = p.items.map((i) => `${i.item.name} ${formatMoney(i.share)}`).join(" + ");
      lines.push(
        `👤 ${p.member.name}: ${itemTxt} = ${formatMoney(p.subtotal)} + SC&VAT ${formatMoney(
          p.extras,
        )} = ${formatMoney(p.total)}`,
      );
    }
    lines.push("");
    lines.push(`💰 Total: ${formatMoney(totals.grand)}`);
    return lines.join("\n");
  }, [breakdown, totals, group.name]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `SplitEasy — ${group.name}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch {
      /* dismissed */
    }
  };

  const exportTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spliteasy-${group.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (breakdown.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
        <PartyPopper className="size-10 text-accent mx-auto mb-2" />
        <p className="font-medium">Nothing to summarize yet</p>
        <p className="text-sm text-muted-foreground mt-1">Assign items to members first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 shadow-[var(--shadow-card)]">
        <div className="text-xs uppercase tracking-wide opacity-80">Grand total</div>
        <div className="text-4xl font-bold mt-1">{formatMoney(totals.grand)}</div>
        <div className="text-xs opacity-80 mt-1">
          {bill.items.length} items • {breakdown.length} people
          {bill.settled && " • Settled"}
        </div>
      </div>

      <ul className="space-y-3">
        {breakdown.map((p) => (
          <li
            key={p.member.id}
            className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <MemberAvatar id={p.member.id} name={p.member.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.member.name}</div>
                <div className="text-xs text-muted-foreground">{p.items.length} items</div>
              </div>
              <div className="text-2xl font-bold text-accent">{formatMoney(p.total)}</div>
            </div>
            <ul className="text-sm space-y-1">
              {p.items.map((i, idx) => (
                <li key={idx} className="flex justify-between text-muted-foreground">
                  <span className="truncate pr-2">{i.item.name}</span>
                  <span>{formatMoney(i.share)}</span>
                </li>
              ))}
              <li className="flex justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatMoney(p.subtotal)}</span>
              </li>
              <li className="flex justify-between text-xs">
                <span className="text-muted-foreground">SC & VAT share</span>
                <span className="font-medium">{formatMoney(p.extras)}</span>
              </li>
            </ul>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={share} className="gap-2">
          <Share2 className="size-4" /> Share
        </Button>
        <Button onClick={exportTxt} variant="secondary" className="gap-2">
          <Download className="size-4" /> Export
        </Button>
      </div>
      <Button
        onClick={onSettle}
        disabled={bill.settled}
        variant={bill.settled ? "secondary" : "default"}
        className={`w-full ${
          !bill.settled ? "bg-success text-success-foreground hover:bg-success/90" : ""
        }`}
        size="lg"
      >
        <Check className="size-4 mr-1" />
        {bill.settled ? "Settled" : "Mark as settled"}
      </Button>
    </div>
  );
}
