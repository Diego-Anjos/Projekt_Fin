export interface DashboardKpis {
  totalWealth: number;
  wealthGrowth: string;
  monthlyCashFlow: number;
  monthlyExpenses: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: "Paid" | "Pending";
  installmentNumber?: number | null;
  totalInstallments?: number | null;
}

export interface Subscription {
  id: string;
  name: string;
  date: string;
  amount: number;
  renewalDate: string;
}
