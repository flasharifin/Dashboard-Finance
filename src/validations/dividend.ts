import { z } from "zod";

export const dividendSchema = z.object({
  portfolioId: z.string().min(1),
  stockCode: z.string().min(1).transform((v) => v.toUpperCase()),
  dps: z.number().positive("DPS harus lebih dari 0"),
  taxPct: z.number().min(0).max(100).default(10),
  cumDate: z.string().optional().nullable(),
  exDate: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  note: z.string().optional(),
});

export type DividendInput = z.infer<typeof dividendSchema>;
