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
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/features/demo/config";

type LoginFormProps = Readonly<{
  demoMode?: boolean;
}>;

export function LoginForm({ demoMode = false }: LoginFormProps) {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: demoMode ? DEMO_EMAIL : "",
      password: demoMode ? DEMO_PASSWORD : "",
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
      {demoMode ? (
        <Alert>
          <AlertTitle>Modo demostración activo</AlertTitle>
          <AlertDescription>
            Usa {DEMO_EMAIL} con la contraseña {DEMO_PASSWORD}. Los campos ya
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
