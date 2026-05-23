import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  title,
  right,
  back,
}: {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md flex flex-col min-h-screen">
        {title && (
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-2">
            {back}
            <h1 className="text-lg font-semibold flex-1 truncate">{title}</h1>
            {right}
          </header>
        )}
        <main className="flex-1 pb-24">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
