import { z } from "zod";

export const phoneRegex = /^(\+258)?8[2-7]\d{7}$/;

export const registerSchema = z.object({
  firstName: z.string().min(1, "Indique o primeiro nome"),
  lastName: z.string().min(1, "Indique o último nome"),
  email: z.email("Indique um email válido"),
  password: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres"),
  birthDate: z.string().min(1, "Indique a data de nascimento"),
  phone: z.string().regex(phoneRegex, "Número de telefone moçambicano inválido"),
  address: z.string().min(1, "Indique o endereço"),
  city: z.literal("Maputo"),
  neighborhood: z.string().min(1, "Selecione o bairro"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Indique um email válido"),
  password: z.string().min(1, "Indique a palavra-passe"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  code: z.string().length(6, "O código tem 6 dígitos"),
});

export type OtpFormValues = z.infer<typeof otpSchema>;

// Fields PATCH /api/v1/users/me accepts — used to finish an account the Auth
// service auto-created via Google OAuth (which only supplies email/name).
export const completeProfileSchema = z.object({
  firstName: z.string().min(1, "Indique o primeiro nome"),
  lastName: z.string().min(1, "Indique o último nome"),
  phone: z.string().regex(phoneRegex, "Número de telefone moçambicano inválido"),
  address: z.string().min(1, "Indique o endereço"),
  city: z.literal("Maputo"),
  neighborhood: z.string().min(1, "Selecione o bairro"),
});

export type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;
