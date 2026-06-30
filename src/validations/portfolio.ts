import { z } from "zod";

export const portfolioSchema = z.object({
  stockCode: z
    .string()
    .min(1, "Kode saham wajib diisi")
    .max(20)
    .transform((v) => v.toUpperCase()),
  lot: z.number().positive("Jumlah harus lebih dari 0"),
  avgPrice: z.number().positive("Harga beli harus lebih dari 0"),
  exchange: z.enum(["IDX", "US", "CRYPTO"]).default("IDX"),
  currency: z.enum(["IDR", "USD"]).default("IDR"),
  sector: z.string().optional(),
  note: z.string().optional(),
});

export const dcaSimulationSchema = z.object({
  currentLot: z.number().nonnegative(),
  currentAvgPrice: z.number().nonnegative(),
  newLot: z.number().positive(),
  newPrice: z.number().positive(),
});

export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type DcaSimulationInput = z.infer<typeof dcaSimulationSchema>;
