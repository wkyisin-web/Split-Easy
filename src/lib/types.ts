export type Category = "food" | "shopping" | "transportation" | "other";

export interface Member {
  id: string;
  name: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // member IDs
}

export interface Bill {
  id: string;
  createdAt: number;
  items: ExpenseItem[];
  serviceCharge: boolean;
  serviceChargeRate: number; // e.g. 0.10
  vat: boolean;
  vatRate: number; // e.g. 0.07
  settled: boolean;
}

export interface Group {
  id: string;
  name: string;
  category: Category;
  createdAt: number;
  updatedAt: number;
  members: Member[];
  bills: Bill[];
  /** id of the bill currently being edited (latest in-progress) */
  activeBillId?: string;
}

export interface AppSettings {
  defaultServiceCharge: boolean;
  defaultVat: boolean;
  currency: string; // symbol, default ฿
}
