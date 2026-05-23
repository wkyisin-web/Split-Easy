import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useSettings } from "@/lib/storage";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SplitEasy" },
      { name: "description", content: "Default service charge, VAT, and currency for new bills." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update } = useSettings();
  return (
    <AppShell title="Settings">
      <div className="p-4 space-y-2">
        <div className="rounded-2xl bg-card border border-border divide-y divide-border">
          <Row
            label="Default service charge"
            description="Add 10% to new bills by default"
            control={
              <Switch
                checked={settings.defaultServiceCharge}
                onCheckedChange={(v) => update({ defaultServiceCharge: v })}
              />
            }
          />
          <Row
            label="Default VAT"
            description="Add 7% VAT to new bills by default"
            control={
              <Switch
                checked={settings.defaultVat}
                onCheckedChange={(v) => update({ defaultVat: v })}
              />
            }
          />
          <div className="p-4">
            <Label htmlFor="cur" className="text-sm font-medium">
              Currency symbol
            </Label>
            <p className="text-xs text-muted-foreground mb-2">Default ฿ (Thai Baht)</p>
            <Input
              id="cur"
              value={settings.currency}
              onChange={(e) => update({ currency: e.target.value.slice(0, 3) || "฿" })}
              className="w-24"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-6">
          SplitEasy stores everything on this device. Receipt scanning uses AI.
        </p>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {control}
    </div>
  );
}
