export type Exchange = "IDX" | "US" | "CRYPTO";
export type Currency = "IDR" | "USD";

export type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
};

export type PortfolioWithCalc = {
  id: string;
  stockCode: string;
  lot: number;
  avgPrice: number;
  exchange: Exchange;
  currency: Currency;
  platform: string;
  sector: string | null;
  note: string | null;
  marketPrice: number | null;
  units: number;
  totalCost: number;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
};

export type DividendWithCalc = {
  id: string;
  stockCode: string;
  dps: number;
  taxPct: number;
  netDps: number;
  dividendYield: number;
  receivedAmount: number;
  currency: Currency;
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

export type ExchangeRate = {
  USDIDR: number;
  updatedAt: string;
};

export type ApiResponse<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };
