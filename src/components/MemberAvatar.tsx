import { initials } from "@/lib/format";

const PALETTE = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-success text-success-foreground",
  "bg-secondary text-secondary-foreground border border-primary/30",
  "bg-muted text-foreground border border-border",
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function MemberAvatar({
  id,
  name,
  size = "md",
  selected,
  onClick,
}: {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
}) {
  const sizes = { sm: "size-7 text-[10px]", md: "size-9 text-xs", lg: "size-12 text-sm" };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-full font-semibold flex items-center justify-center transition ${sizes[size]} ${colorFor(id)} ${
        onClick ? "hover:scale-105 active:scale-95" : ""
      } ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      title={name}
    >
      {initials(name)}
    </Tag>
  );
}
