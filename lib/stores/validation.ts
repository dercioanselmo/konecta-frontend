import { z } from "zod";
import { WEEKDAYS } from "./types";

export const createShopSchema = z.object({
  name: z.string().min(1, "Indique o nome da loja"),
  nuit: z.string().optional(),
  address: z.string().optional(),
  city: z.literal("Maputo"),
  neighborhood: z.string().optional(),
  phone: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export type CreateShopFormValues = z.infer<typeof createShopSchema>;

export const editShopSchema = z.object({
  name: z.string().min(1, "Indique o nome da loja"),
  legalName: z.string().optional(),
  nuit: z.string().optional(),
  email: z.union([z.email("Indique um email válido"), z.literal("")]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.literal("Maputo"),
  neighborhood: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  description: z.string().optional(),
  acceptsPickup: z.boolean(),
  acceptsDelivery: z.boolean(),
});

export type EditShopFormValues = z.infer<typeof editShopSchema>;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const hoursSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.enum(WEEKDAYS),
        opensAt: z.string().nullable(),
        closesAt: z.string().nullable(),
        closed: z.boolean(),
      }),
    )
    .length(7)
    .superRefine((days, ctx) => {
      days.forEach((d, i) => {
        if (d.closed) return;
        if (!d.opensAt || !timeRegex.test(d.opensAt)) {
          ctx.addIssue({ code: "custom", message: "Hora de abertura inválida", path: [i, "opensAt"] });
        }
        if (!d.closesAt || !timeRegex.test(d.closesAt)) {
          ctx.addIssue({ code: "custom", message: "Hora de fecho inválida", path: [i, "closesAt"] });
        }
      });
    }),
});

export type HoursFormValues = z.infer<typeof hoursSchema>;

export const createProductSchema = z.object({
  name: z.string().min(1, "Indique o nome do produto"),
  description: z.string().min(1, "Indique a descrição"),
  subcategoryId: z.string().optional(),
  price: z.number({ error: "Indique o preço" }).min(0, "O preço não pode ser negativo"),
  stockQuantity: z
    .number({ error: "Indique a quantidade" })
    .int("Deve ser um número inteiro")
    .min(0, "Não pode ser negativo"),
  lowStockThreshold: z.number().int().min(0).optional(),
  active: z.boolean(),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;

export const stockAdjustSchema = z.object({
  quantity: z
    .number({ error: "Indique a quantidade" })
    .int("Deve ser um número inteiro")
    .min(0, "Não pode ser negativo"),
});

export type StockAdjustFormValues = z.infer<typeof stockAdjustSchema>;
