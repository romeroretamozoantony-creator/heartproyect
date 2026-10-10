"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signUp,
  type AuthActionResult,
} from "@/features/auth/actions/auth-actions";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas/register-schema";

type FieldErrorProps = Readonly<{
  id: string;
  message?: string;
}>;

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function RegisterForm() {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      studentCode: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  function submit(values: RegisterFormValues) {
    setResult(null);
    startTransition(async () => {
      setResult(await signUp(values));
    });
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onChange={() => setResult(null)}
      onSubmit={handleSubmit(submit)}
    >
      <div className="space-y-2">
        <Label htmlFor="firstName">Nombres</Label>
        <Input
          {...register("firstName")}
          id="firstName"
          autoComplete="given-name"
          aria-describedby={errors.firstName ? "firstName-error" : undefined}
          aria-invalid={Boolean(errors.firstName)}
          placeholder="Tus nombres"
        />
        <FieldError id="firstName-error" message={errors.firstName?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">Apellidos</Label>
        <Input
          {...register("lastName")}
          id="lastName"
          autoComplete="family-name"
          aria-describedby={errors.lastName ? "lastName-error" : undefined}
          aria-invalid={Boolean(errors.lastName)}
          placeholder="Tus apellidos"
        />
        <FieldError id="lastName-error" message={errors.lastName?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input
          {...register("username")}
          id="username"
          autoCapitalize="none"
          autoComplete="username"
          aria-describedby={errors.username ? "username-error" : undefined}
          aria-invalid={Boolean(errors.username)}
          placeholder="Ejemplo: ana.perez"
        />
        <FieldError id="username-error" message={errors.username?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="studentCode">Código de estudiante</Label>
        <Input
          {...register("studentCode")}
          id="studentCode"
          autoCapitalize="characters"
          aria-describedby={
            errors.studentCode ? "studentCode-error" : undefined
          }
          aria-invalid={Boolean(errors.studentCode)}
          placeholder="Ingresa tu código"
        />
        <FieldError
          id="studentCode-error"
          message={errors.studentCode?.message}
        />
      </div>

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
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="new-password"
          aria-describedby={errors.password ? "password-error" : undefined}
          aria-invalid={Boolean(errors.password)}
          placeholder="Mínimo 8 caracteres"
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          {...register("confirmPassword")}
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-describedby={
            errors.confirmPassword ? "confirmPassword-error" : undefined
          }
          aria-invalid={Boolean(errors.confirmPassword)}
          placeholder="Repite tu contraseña"
        />
        <FieldError
          id="confirmPassword-error"
          message={errors.confirmPassword?.message}
        />
      </div>

      {result ? (
        <Alert
          aria-live="polite"
          variant={result.status === "error" ? "destructive" : "default"}
        >
          <AlertTitle>
            {result.status === "error" ? "No se pudo crear la cuenta" : "Revisa tu correo"}
          </AlertTitle>
          <AlertDescription>
            {result.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <Button className="h-10 w-full" disabled={isPending} type="submit">
        <UserPlus aria-hidden="true" data-icon="inline-start" />
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
