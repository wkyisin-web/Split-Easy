import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Users, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGroups } from "@/lib/storage";
import { CATEGORIES, categoryMeta } from "@/lib/category";
import type { Category, Group } from "@/lib/types";
import { uid } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SplitEasy — Your Groups" },
      { name: "description", content: "Your bill-splitting groups. Tap a group to add expenses." },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { groups, setGroups, ready } = useGroups();
  const [open, setOpen] = useState(false);

  const sorted = [...groups].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <AppShell
      title="SplitEasy"
      right={
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
          <Plus className="size-4" /> New
        </Button>
      }
    >
      <div className="p-4 space-y-3">
        {ready && sorted.length === 0 && <EmptyGroups onCreate={() => setOpen(true)} />}
        {sorted.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>

      <NewGroupDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(g) => {
          setGroups([g, ...groups]);
          toast.success(`Group "${g.name}" created`);
        }}
      />
    </AppShell>
  );
}

function EmptyGroups({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="mx-auto size-20 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Users className="size-10 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">No groups yet</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Create your first group to start splitting bills with friends.
      </p>
      <Button onClick={onCreate} className="mt-5 gap-1">
        <Plus className="size-4" /> Create a group
      </Button>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const meta = categoryMeta(group.category);
  const Icon = meta.icon;
  const lastBill = group.bills[group.bills.length - 1];
  const unsettled = group.bills.filter((b) => !b.settled).length;
  return (
    <Link
      to="/group/$id"
      params={{ id: group.id }}
      className="block rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)] hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-xl bg-secondary flex items-center justify-center">
          <Icon className="size-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{group.name}</div>
          <div className="text-xs text-muted-foreground">
            {group.members.length} member{group.members.length !== 1 ? "s" : ""} •{" "}
            {formatDistanceToNow(group.updatedAt, { addSuffix: true })}
          </div>
        </div>
        {unsettled > 0 && (
          <span className="text-[10px] font-semibold rounded-full bg-accent text-accent-foreground px-2 py-1">
            {unsettled} open
          </span>
        )}
      </div>
      {group.members.length > 0 && (
        <div className="flex -space-x-2 mt-3">
          {group.members.slice(0, 6).map((m) => (
            <MemberAvatar key={m.id} id={m.id} name={m.name} size="sm" />
          ))}
          {group.members.length > 6 && (
            <div className="size-7 rounded-full bg-muted text-xs flex items-center justify-center font-semibold border border-card">
              +{group.members.length - 6}
            </div>
          )}
        </div>
      )}
      {lastBill && (
        <div className="text-xs text-muted-foreground mt-2">
          Last bill: {lastBill.items.length} item{lastBill.items.length !== 1 ? "s" : ""}
          {lastBill.settled ? " • Settled" : " • Unsettled"}
        </div>
      )}
    </Link>
  );
}

function NewGroupDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (g: Group) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  const reset = () => {
    setName("");
    setCategory("food");
    setMemberInput("");
    setMembers([]);
  };

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    setMembers([...members, { id: uid(), name: trimmed }]);
    setMemberInput("");
  };

  const create = () => {
    if (!name.trim()) {
      toast.error("Group needs a name");
      return;
    }
    if (members.length < 2) {
      toast.error("Add at least 2 members");
      return;
    }
    const now = Date.now();
    onCreate({
      id: uid(),
      name: name.trim(),
      category,
      createdAt: now,
      updatedAt: now,
      members,
      bills: [],
    });
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
          <DialogTitle>New group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dinner at MK"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium">Category</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl py-3 text-[10px] font-medium border transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-5" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Members</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
                placeholder="Name"
              />
              <Button type="button" onClick={addMember} variant="secondary">
                Add
              </Button>
            </div>
            {members.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {members.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-2 rounded-full bg-secondary pl-1 pr-2 py-1 text-xs"
                  >
                    <MemberAvatar id={m.id} name={m.name} size="sm" />
                    {m.name}
                    <button
                      onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Create group</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
