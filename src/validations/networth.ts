import { z } from "zod";

export const assetSchema = z.object({
  name: z.string().min(1, "Nama aset wajib diisi"),
  category: z.enum(["cash", "stock", "mutual_fund", "property", "crypto", "other"]),
  value: z.number().nonnegative("Nilai harus >= 0"),
  note: z.string().optional(),
});

export const liabilitySchema = z.object({
  name: z.string().min(1, "Nama hutang wajib diisi"),
  category: z.enum(["mortgage", "personal_loan", "credit_card", "vehicle_loan", "other"]),
  amount: z.number().nonnegative("Jumlah harus >= 0"),
  note: z.string().optional(),
});

export type AssetInput = z.infer<typeof assetSchema>;
export type LiabilityInput = z.infer<typeof liabilitySchema>;
