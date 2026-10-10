import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "Ingresa tus nombres.")
      .max(80, "Los nombres no pueden superar los 80 caracteres."),
    lastName: z
      .string()
      .trim()
      .min(1, "Ingresa tus apellidos.")
      .max(100, "Los apellidos no pueden superar los 100 caracteres."),
    username: z
      .string()
      .trim()
      .min(3, "El usuario debe tener al menos 3 caracteres.")
      .max(40, "El usuario no puede superar los 40 caracteres.")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Usa solo letras, números, puntos, guiones o guiones bajos.",
      ),
    studentCode: z
      .string()
      .trim()
      .min(3, "El código debe tener al menos 3 caracteres.")
      .max(30, "El código no puede superar los 30 caracteres.")
      .regex(
        /^[a-zA-Z0-9-]+$/,
        "Usa solo letras, números o guiones.",
      ),
    email: z
      .string()
      .trim()
      .min(1, "Ingresa tu correo electrónico.")
      .email("Ingresa un correo electrónico válido.")
      .max(254, "El correo electrónico es demasiado largo."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(72, "La contraseña no puede superar los 72 caracteres."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
