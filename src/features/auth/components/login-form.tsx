"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signIn,
  type AuthActionResult,
} from "@/features/auth/actions/auth-actions";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login-schema";
type DemoCredentials = Readonly<{
  email: string;
  password: string;
}>;

type LoginFormProps = Readonly<{
  demoMode?: boolean;
  demoCredentials?: DemoCredentials;
}>;

export function LoginForm({ demoMode = false, demoCredentials }: LoginFormProps) {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: demoCredentials?.email ?? "",
      password: demoCredentials?.password ?? "",
    },
    mode: "onBlur",
  });

  function submit(values: LoginFormValues) {
    setResult(null);
    startTransition(async () => {
      setResult(await signIn(values));
    });
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onChange={() => setResult(null)}
      onSubmit={handleSubmit(submit)}
    >
      {demoMode && demoCredentials ? (
        <Alert>
          <AlertTitle>Modo demostración activo</AlertTitle>
          <AlertDescription>
            Usa {demoCredentials.email} con la contraseña {demoCredentials.password}. Los campos ya
            están completados.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          {...register("email")}
          id="email"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          placeholder="nombre@correo.com"
        />
        {errors.email ? (
          <p
            id="email-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="current-password"
          aria-describedby={errors.password ? "password-error" : undefined}
          aria-invalid={Boolean(errors.password)}
          placeholder="Ingresa tu contraseña"
        />
        {errors.password ? (
          <p
            id="password-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {result ? (
        <Alert
          aria-live="polite"
          variant={result.status === "error" ? "destructive" : "default"}
        >
          <AlertTitle>
            {result.status === "error" ? "No se pudo iniciar sesión" : "Listo"}
          </AlertTitle>
          <AlertDescription>
            {result.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <Button className="h-10 w-full" disabled={isPending} type="submit">
        <LogIn aria-hidden="true" data-icon="inline-start" />
        {isPending ? "Ingresando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
