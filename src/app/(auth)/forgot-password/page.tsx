"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";

import { identityService } from "@/lib/api/services/identity-service";
import { AuthCard, Field, FormError, fieldError } from "@/components/auth/auth-card";
import { Callout } from "@/components/shared/callout";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const reset = useMutation({ mutationFn: identityService.requestPasswordReset });

  return (
    <AuthCard
      title="Reset your password."
      description="Enter the email you sign in with and we'll send you a link."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {reset.isSuccess ? (
        <Callout tone="success" title="Check your inbox">
          If an Origin account uses {email}, a reset link is on its way. It expires in 1 hour.
        </Callout>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            reset.mutate({ email });
          }}
        >
          <FormError title="We couldn't send the link" error={reset.error} />
          <Field
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError(reset.error, "email")}
          />
          <Button type="submit" className="h-10 w-full" disabled={reset.isPending}>
            {reset.isPending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-xs text-muted-foreground">Signed up with Google? Reset your password with Google instead.</p>
        </form>
      )}
    </AuthCard>
  );
}
