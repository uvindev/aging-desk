import { z } from "zod";

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export const deskInputSchema = z.object({
  csv: z
    .string()
    .min(1, "Paste an open-invoice CSV before running the desk.")
    .max(1_000_000, "The CSV is larger than the 1 MB browser limit."),
  referenceDate: z
    .string()
    .refine(isIsoDate, "Use a valid reference date in YYYY-MM-DD format."),
});

export type DeskInput = z.infer<typeof deskInputSchema>;
