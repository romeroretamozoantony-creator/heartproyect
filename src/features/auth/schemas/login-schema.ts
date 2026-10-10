import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu correo electrónico.")
    .email("Ingresa un correo electrónico válido.")
    .max(254, "El correo electrónico es demasiado largo."),
  password: z
    .string()
    .min(1, "Ingresa tu contraseña.")
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(72, "La contraseña no puede superar los 72 caracteres."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
