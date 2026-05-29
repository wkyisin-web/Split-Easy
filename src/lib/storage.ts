import { useEffect, useRef, useState, useCallback } from "react";
import type { Group, AppSettings, Category } from "./types";
import { getSupabase } from "./supabase";

// --- Settings (UI preferences, kept in localStorage) ---

const SETTINGS_KEY = "spliteasy.settings.v1";

const defaultSettings: AppSettings = {
  defaultServiceCharge: true,
  defaultVat: true,
  currency: "฿",
};

function readSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return JSON.parse(raw) as AppSettings;
  } catch {
    return defaultSettings;
  }
}

function writeSettings(value: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("spliteasy:settings"));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    setSettings(readSettings());
    const handler = () => setSettings(readSettings());
    window.addEventListener("spliteasy:settings", handler);
    return () => window.removeEventListener("spliteasy:settings", handler);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...readSettings(), ...patch };
    writeSettings(next);
    setSettings(next);
  }, []);

  return { settings, update };
}

export function getSettingsSync(): AppSettings {
  return readSettings();
}

// --- DB row shapes ---

interface DbGroup {
  id: string;
  name: string;
  category: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  active_bill_id: string | null;
  members: DbMember[];
  bills: (DbBill & { expense_items: DbExpenseItem[] })[];
}

interface DbMember {
  id: string;
  group_id: string;
  name: string;
}

interface DbBill {
  id: string;
  group_id: string;
  created_at: string;
  settled: boolean;
  service_charge: boolean;
  service_charge_rate: number;
  vat: boolean;
  vat_rate: number;
}

interface DbExpenseItem {
  id: string;
  bill_id: string;
  name: string;
  price: number;
  quantity: number;
  assigned_to: string[];
}

// --- Mapping ---

function toAppGroup(row: DbGroup): Group {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Category,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    activeBillId: row.active_bill_id ?? undefined,
    members: row.members.map((m) => ({ id: m.id, name: m.name })),
    bills: row.bills.map((b) => ({
      id: b.id,
      createdAt: new Date(b.created_at).getTime(),
      settled: b.settled,
      serviceCharge: b.service_charge,
      serviceChargeRate: Number(b.service_charge_rate),
      vat: b.vat,
      vatRate: Number(b.vat_rate),
      items: (b.expense_items ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        price: Number(e.price),
        quantity: e.quantity,
        assignedTo: e.assigned_to ?? [],
      })),
    })),
  };
}

// --- Supabase queries ---

async function loadGroups(): Promise<Group[]> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("groups")
    .select("*, members(*), bills(*, expense_items(*))")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load groups:", error);
    return [];
  }

  return (data as unknown as DbGroup[]).map(toAppGroup);
}

async function upsertGroup(group: Group): Promise<void> {
  const sb = await getSupabase();

  const { error: groupErr } = await sb.from("groups").upsert({
    id: group.id,
    name: group.name,
    category: group.category,
    user_id: null,
    updated_at: new Date(group.updatedAt).toISOString(),
    active_bill_id: group.activeBillId ?? null,
  });
  if (groupErr) throw groupErr;

  // Replace members
  await sb.from("members").delete().eq("group_id", group.id);
  if (group.members.length > 0) {
    const { error: membersErr } = await sb
      .from("members")
      .insert(group.members.map((m) => ({ id: m.id, group_id: group.id, name: m.name })));
    if (membersErr) throw membersErr;
  }

  // Replace bills and items (cascade deletes items)
  await sb.from("bills").delete().eq("group_id", group.id);
  for (const bill of group.bills) {
    const { error: billErr } = await sb.from("bills").insert({
      id: bill.id,
      group_id: group.id,
      settled: bill.settled,
      service_charge: bill.serviceCharge,
      service_charge_rate: bill.serviceChargeRate,
      vat: bill.vat,
      vat_rate: bill.vatRate,
      title: null,
      amount: null,
      paid_by: null,
    });
    if (billErr) throw billErr;

    if (bill.items.length > 0) {
      const { error: itemsErr } = await sb.from("expense_items").insert(
        bill.items.map((item) => ({
          id: item.id,
          bill_id: bill.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          assigned_to: item.assignedTo,
        })),
      );
      if (itemsErr) throw itemsErr;
    }
  }
}

async function deleteGroup(id: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from("groups").delete().eq("id", id);
  if (error) throw error;
}

// --- React hook ---

export function useGroups() {
  const [groups, setGroupsState] = useState<Group[]>([]);
  const [ready, setReady] = useState(false);
  const groupsRef = useRef<Group[]>([]);

  useEffect(() => {
    loadGroups().then((loaded) => {
      setGroupsState(loaded);
      groupsRef.current = loaded;
      setReady(true);
    });
  }, []);

  const save = useCallback((next: Group[]) => {
    const prev = groupsRef.current;
    groupsRef.current = next;
    setGroupsState(next);

    // Delete removed groups
    const nextIds = new Set(next.map((g) => g.id));
    for (const g of prev) {
      if (!nextIds.has(g.id)) {
        deleteGroup(g.id).catch(console.error);
      }
    }

    // Upsert new or changed groups
    const prevMap = new Map(prev.map((g) => [g.id, g]));
    for (const g of next) {
      const prevG = prevMap.get(g.id);
      if (!prevG || JSON.stringify(prevG) !== JSON.stringify(g)) {
        upsertGroup(g).catch(console.error);
      }
    }
  }, []);

  return { groups, setGroups: save, ready };
}

// Kept for import compatibility — routes use the hook instead
export function getGroupsSync(): Group[] {
  return [];
}
export function saveGroupsSync(_g: Group[]): void {
  // no-op
}
