import { Utensils, ShoppingBag, Car, Sparkles, type LucideIcon } from "lucide-react";
import type { Category } from "./types";

export const CATEGORIES: { value: Category; label: string; icon: LucideIcon }[] = [
  { value: "food", label: "Food", icon: Utensils },
  { value: "shopping", label: "Shopping", icon: ShoppingBag },
  { value: "transportation", label: "Transportation", icon: Car },
  { value: "other", label: "Other", icon: Sparkles },
];

export function categoryMeta(c: Category) {
  return CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[3];
}
