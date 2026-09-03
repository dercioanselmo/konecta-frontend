import { z } from "zod";

export const phoneRegex = /^(\+258)?8[2-7]\d{7}$/;

// A CUSTOMER may self-request one of these at registration, pending admin
// approval — "" means a plain customer signup (the common case).
export const requestableRoleSchema = z.enum(["MERCHANT", "COURIER", "MOBILITY_PARTNER"]);

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
  requestedRole: z.union([requestableRoleSchema, z.literal("")]).optional(),
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

export const setPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a palavra-passe"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

export type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indique a palavra-passe atual"),
    newPassword: z.string().min(8, "A nova palavra-passe deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova palavra-passe"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const editProfileSchema = z.object({
  firstName: z.string().min(1, "Indique o primeiro nome"),
  lastName: z.string().min(1, "Indique o último nome"),
  phone: z.string().regex(phoneRegex, "Número de telefone moçambicano inválido"),
  address: z.string().min(1, "Indique o endereço"),
  city: z.literal("Maputo"),
  neighborhood: z.string().min(1, "Selecione o bairro"),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
