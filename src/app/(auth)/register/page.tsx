import type { Metadata } from "next";
import Link from "next/link";
import { HeartPulse } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta | Mobile Heart",
  description: "Crea tu cuenta de estudiante en Mobile Heart.",
};

export default function RegisterPage() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="text-center">
        <HeartPulse
          aria-hidden="true"
          className="mx-auto mb-3 size-11 text-primary"
        />
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">
            Crea tu cuenta
          </h1>
        </CardTitle>
        <CardDescription>
          Registra tus datos para comenzar a organizar tu tiempo.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <RegisterForm />
      </CardContent>

      <CardFooter className="justify-center text-center text-sm text-muted-foreground">
        <p>
          ¿Ya tienes una cuenta?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/login"
          >
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
