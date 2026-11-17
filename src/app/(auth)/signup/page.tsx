"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { identityService } from "@/lib/api/services/identity-service";
import { signedIn } from "@/lib/auth/sign-in";
import { AuthCard, Field, FormError, GoogleButton, OrDivider, fieldError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", workspaceName: "" });
  const signUp = useMutation({
    mutationFn: identityService.signUp,
    onSuccess: (token) => {
      signedIn(token);
      router.replace("/");
    },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <AuthCard
      title="Make room to grow."
      description="Create your Origin account and your first workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton next="/" label="Sign up with Google" />
      <OrDivider />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          signUp.mutate(form);
        }}
      >
        <FormError title="We couldn't create your account" error={signUp.error} />
        <Field label="Your name" autoComplete="name" required value={form.name} onChange={set("name")} error={fieldError(signUp.error, "name")} />
        <Field label="Email address" type="email" autoComplete="email" required value={form.email} onChange={set("email")} error={fieldError(signUp.error, "email")} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={form.password}
          onChange={set("password")}
          hint="At least 10 characters."
          error={fieldError(signUp.error, "password")}
        />
        <Field
          label="Workspace name"
          required
          placeholder="Your brand or team"
          value={form.workspaceName}
          onChange={set("workspaceName")}
          error={fieldError(signUp.error, "workspaceName")}
        />
        <Button type="submit" className="h-10 w-full" disabled={signUp.isPending}>
          {signUp.isPending ? "Creating your account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
