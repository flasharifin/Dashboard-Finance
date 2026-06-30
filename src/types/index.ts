export type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  updatedAt: string;
};

export type PortfolioWithCalc = {
  id: string;
  stockCode: string;
  lot: number;
  avgPrice: number;
  sector: string | null;
  note: string | null;
  marketPrice: number | null;
  totalCost: number;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  shares: number;
};

export type DividendWithCalc = {
  id: string;
  stockCode: string;
  dps: number;
  taxPct: number;
  netDps: number;
  dividendYield: number;
  receivedAmount: number;
  cumDate: string | null;
  exDate: string | null;
  paymentDate: string | null;
  note: string | null;
};

export type NetWorthSummary = {
  totalAssets: number;
  totalLiabilities: number;
  netValue: number;
};

export type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: string;
};
