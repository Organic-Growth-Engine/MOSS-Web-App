"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { identityService } from "@/lib/api/services/identity-service";
import { AuthCard, Field, FormError, fieldError } from "@/components/auth/auth-card";
import { Callout } from "@/components/shared/callout";
import { LoadingBlock } from "@/components/shared/query-state";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingBlock className="mx-auto mt-24 h-80 max-w-md" />}>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = useMutation({ mutationFn: identityService.confirmPasswordReset });
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <AuthCard title="Choose a new password." description="You'll use it the next time you sign in.">
      {!token ? (
        <Callout tone="danger" title="This link is incomplete">
          Open the link from your email again, or{" "}
          <Link href="/forgot-password" className="underline">
            request a new one
          </Link>
          .
        </Callout>
      ) : reset.isSuccess ? (
        <div className="space-y-4">
          <Callout tone="success" title="Password updated">
            You&apos;ve been signed out everywhere. Sign in with your new password.
          </Callout>
          <Link href="/login" className={buttonVariants({ className: "h-10 w-full" })}>
            Sign in
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!mismatch) reset.mutate({ token, password });
          }}
        >
          <FormError title="We couldn't reset your password" error={reset.error} />
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 10 characters."
            error={fieldError(reset.error, "password")}
          />
          <Field
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? "Passwords don't match." : undefined}
          />
          <Button type="submit" className="h-10 w-full" disabled={reset.isPending || mismatch}>
            {reset.isPending ? "Saving…" : "Set new password"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
