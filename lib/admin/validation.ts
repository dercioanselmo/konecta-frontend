import { z } from "zod";
import { phoneRegex } from "@/lib/auth/validation";
import { ONBOARDABLE_ROLES } from "./roleLabels";
import type { Role } from "@/lib/auth/types";

export const createUserSchema = z.object({
  firstName: z.string().min(1, "Indique o primeiro nome"),
  lastName: z.string().min(1, "Indique o último nome"),
  email: z.email("Indique um email válido"),
  phone: z.string().regex(phoneRegex, "Número de telefone moçambicano inválido"),
  address: z.string().min(1, "Indique o endereço"),
  city: z.literal("Maputo"),
  neighborhood: z.string().min(1, "Selecione o bairro"),
  role: z.enum(ONBOARDABLE_ROLES as [Role, ...Role[]], "Selecione uma função"),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  firstName: z.string().min(1, "Indique o primeiro nome"),
  lastName: z.string().min(1, "Indique o último nome"),
  phone: z.string().regex(phoneRegex, "Número de telefone moçambicano inválido"),
  address: z.string().min(1, "Indique o endereço"),
  city: z.literal("Maputo"),
  neighborhood: z.string().min(1, "Selecione o bairro"),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
