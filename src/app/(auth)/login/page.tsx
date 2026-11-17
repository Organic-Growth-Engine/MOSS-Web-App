"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { identityService } from "@/lib/api/services/identity-service";
import { useAuthProviders } from "@/lib/api/hooks/queries";
import { safeNext, signedIn } from "@/lib/auth/sign-in";
import { AuthCard, Field, FormError, GoogleButton, OrDivider, fieldError } from "@/components/auth/auth-card";
import { Callout } from "@/components/shared/callout";
import { LoadingBlock } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingBlock className="mx-auto mt-24 h-96 max-w-md" />}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const providers = useAuthProviders().data?.data;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: identityService.loginWithPassword,
    onSuccess: (token) => {
      signedIn(token);
      router.replace(next);
    },
  });
  const hasGoogle = !providers || providers.some((p) => p.id === "google");
  const hasPassword = !providers || providers.some((p) => p.id === "password");

  return (
    <AuthCard
      title="Welcome back."
      description="Sign in to plan, create and publish everywhere at once."
      footer={
        <>
          New to Origin?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {params.get("error") && (
        <Callout tone="danger" role="alert" title="We couldn't log you in">
          Sign-in was cancelled or didn&apos;t complete. Please try again.
        </Callout>
      )}
      {hasGoogle && <GoogleButton next={next} />}
      {hasGoogle && hasPassword && <OrDivider />}
      {hasPassword && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate({ email, password });
          }}
        >
          <FormError title="We couldn't log you in" error={login.error} />
          <Field
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError(login.error, "email")}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="h-10 w-full" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
