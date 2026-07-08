export type TransactionType = {
  id: number;
  name: string;
  type: "in" | "out";
};

export type Transaction = {
  id: number;
  type: "in" | "out";
  typeId: number | null;
  typeName: string | null;
  amount: number;
  balance: number;
  transactionDate: string;
  confirmationDate: string;
  active: boolean;
  externalId?: string | null;
  externalSource?: string | null;
};

export type MonthData = {
  month: string;
  globalInitialBalance: number;
  globalInitialBalanceDate: string | null;
  monthStartBalance: number;
  monthEndBalance: number;
  availableDays: string[];
  currentPage: number;
  totalPages: number;
  transactions: Transaction[];
};
