export type Transaction = {
  id: string;
  customerName: string;
  amount: number;
  currency: string;
  region: string;
  salesRep: string;
  date: string;
  createdAt: string;
};

export type Analytics = {
  totalRevenue: number;
  totalTransactions: number;
  avgDealSize: number;
  revenueByRegion: Record<string, number>;
  revenueByRep: Record<string, number>;
  avgDealSizeByRegion: Record<string, number>;
};

export type ParsedQuery = {
  interpretation: string;
  confidence: "high" | "low";
  filters: {
    salesRep?: string;
    region?: string;
    customerName?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  results: Transaction[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  awaitingConfirmation?: boolean;
  pendingFilters?: ParsedQuery["filters"];
};

export type DriftAlert = {
  message: string;
  region: string;
  before: number;
  after: number;
};