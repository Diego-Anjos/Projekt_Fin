export interface PortfolioKPIs {
  totalWealth: number;
  wealthChangePercent: number;
  monthlyCashFlow: number;
  allocation: {
    type: string;
    percentage: number;
    color: string;
  }[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: "Paid" | "Pending";
}

export interface Subscription {
  id: string;
  name: string;
  date: string;
  amount: number;
  renewalDate: string;
}

export interface PerformancePoint {
  month: string;
  value: number;
}

export type PerformanceData = PerformancePoint[];
