"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login-schema";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas/register-schema";
import { isDemoMode } from "@/features/demo/mode";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_SESSION_COOKIE } from "@/features/demo/config";
import { DEMO_SESSION_SECONDS, issueDemoSession, revokeDemoSession } from "@/features/demo/session-registry";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AuthActionResult = Readonly<{
  status: "error" | "success";
  message: string;
}>;

function configurationError(): AuthActionResult {
  return {
    status: "error",
    message:
      "Supabase todavía no está configurado. Completa las variables de .env.local.",
  };
}

function serviceError(): AuthActionResult {
  return {
    status: "error",
    message:
      "El servicio de autenticación no está disponible. Inténtalo nuevamente.",
  };
}

async function createDemoSession() {
  const cookieStore = await cookies();
  revokeDemoSession(cookieStore.get(DEMO_SESSION_COOKIE)?.value);
  cookieStore.set(DEMO_SESSION_COOKIE, issueDemoSession(), {
    httpOnly: true,
    maxAge: DEMO_SESSION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function signIn(
  values: LoginFormValues,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa el correo y la contraseña ingresados.",
    };
  }

  if (isDemoMode()) {
    if (
      parsed.data.email !== DEMO_EMAIL ||
      parsed.data.password !== DEMO_PASSWORD
    ) {
      return {
        status: "error",
        message: "Utiliza las credenciales de demostración mostradas en pantalla.",
      };
    }

    await createDemoSession();
    redirect("/activities");
  }

  if (!hasSupabasePublicEnv()) {
    return configurationError();
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      const message =
        error.code === "email_not_confirmed"
          ? "Confirma tu correo electrónico antes de iniciar sesión."
          : "Correo o contraseña incorrectos.";

      return { status: "error", message };
    }
  } catch {
    return serviceError();
  }

  redirect("/activities");
}

export async function signUp(
  values: RegisterFormValues,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del formulario antes de continuar.",
    };
  }

  if (isDemoMode()) {
    await createDemoSession();
    redirect("/activities");
  }

  if (!hasSupabasePublicEnv()) {
    return configurationError();
  }

  const {
    email,
    firstName,
    lastName,
    password,
    studentCode,
    username,
  } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          student_code: studentCode,
          username,
        },
      },
    });

    if (error) {
      const message =
        error.code === "user_already_exists"
          ? "No fue posible crear la cuenta con esos datos."
          : "No se pudo crear la cuenta. Revisa los datos e inténtalo nuevamente.";

      return { status: "error", message };
    }

    if (!data.session) {
      return {
        status: "success",
        message:
          "Cuenta registrada. Revisa tu correo para confirmar el acceso antes de iniciar sesión.",
      };
    }
  } catch {
    return serviceError();
  }

  redirect("/activities");
}

export async function signOut() {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    revokeDemoSession(cookieStore.get(DEMO_SESSION_COOKIE)?.value);
    cookieStore.delete(DEMO_SESSION_COOKIE);
    redirect("/login");
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // El usuario vuelve al acceso incluso si el proveedor no está disponible.
  }

  redirect("/login");
}
