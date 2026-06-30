import { z } from "zod";

export const portfolioSchema = z.object({
  stockCode: z
    .string()
    .min(1, "Kode saham wajib diisi")
    .max(10)
    .transform((v) => v.toUpperCase()),
  lot: z.number().int().positive("Lot harus lebih dari 0"),
  avgPrice: z.number().positive("Harga beli harus lebih dari 0"),
  sector: z.string().optional(),
  note: z.string().optional(),
});

export const dcaSimulationSchema = z.object({
  currentLot: z.number().int().nonnegative(),
  currentAvgPrice: z.number().nonnegative(),
  newLot: z.number().int().positive(),
  newPrice: z.number().positive(),
});

export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type DcaSimulationInput = z.infer<typeof dcaSimulationSchema>;
