import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { Suspense } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { isDemoMode } from "@/features/demo/mode";

export const metadata: Metadata = {
  title: "Iniciar sesión | Mobile Heart",
  description: "Accede a tu cuenta de Mobile Heart.",
};

const AUTH_MESSAGES: Record<string, string> = {
  configuration:
    "Configura las variables de Supabase en .env.local para habilitar el acceso.",
  confirmation:
    "El enlace de confirmación no es válido o ya expiró. Intenta iniciar sesión nuevamente.",
};

async function AuthenticationMessage({
  searchParams,
  demoMode,
}: Pick<PageProps<"/login">, "searchParams"> & { demoMode: boolean }) {
  if (demoMode) {
    return null;
  }

  const { auth_error: authError } = await searchParams;
  const authMessage =
    typeof authError === "string" ? AUTH_MESSAGES[authError] : undefined;

  if (!authMessage) {
    return null;
  }

  return (
    <Alert className="mb-5" variant="destructive">
      <AlertTitle>Acceso no disponible</AlertTitle>
      <AlertDescription>{authMessage}</AlertDescription>
    </Alert>
  );
}

async function LoginContent({ searchParams }: PageProps<"/login">) {
  await connection();
  const demoMode = isDemoMode();

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-center">
        <HeartPulse
          aria-hidden="true"
          className="mx-auto mb-3 size-11 text-primary"
        />
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bienvenido al control de tu tiempo
          </h1>
        </CardTitle>
        <CardDescription>
          Ingresa tus datos para continuar en Mobile Heart.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Suspense fallback={null}>
          <AuthenticationMessage
            demoMode={demoMode}
            searchParams={searchParams}
          />
        </Suspense>
        <LoginForm demoMode={demoMode} />
      </CardContent>

      <CardFooter className="justify-center text-center text-sm text-muted-foreground">
        <p>
          ¿Aún no tienes una cuenta?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/register"
          >
            Regístrate
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return <Suspense fallback={null}><LoginContent {...props} /></Suspense>;
}
