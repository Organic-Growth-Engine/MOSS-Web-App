"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { roleLabel } from "@/lib/format";
import { identityService } from "@/lib/api/services/identity-service";
import { session } from "@/lib/api/session";
import { signedIn, trySession } from "@/lib/auth/sign-in";
import { cn } from "@/lib/utils";
import { AuthCard, Field, FormError, GoogleButton, OrDivider, fieldError } from "@/components/auth/auth-card";
import { ErrorState, LoadingBlock } from "@/components/shared/query-state";
import { Button, buttonVariants } from "@/components/ui/button";

export function AcceptInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signedInState, setSignedInState] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const here = `/invite/${token}`;

  useEffect(() => {
    trySession().then(setSignedInState);
  }, []);

  const invitation = useQuery({
    queryKey: ["identity", "invitation", token],
    queryFn: () => identityService.getInvitation(token),
    retry: false,
  });
  const me = useQuery({
    queryKey: ["identity", "me"],
    queryFn: () => identityService.getCurrentUser(),
    enabled: signedInState === true,
  });
  const accept = useMutation({
    mutationFn: (body?: { name: string; password: string }) => identityService.acceptInvitation(token, body),
    onSuccess: async (t) => {
      signedIn(t);
      await queryClient.invalidateQueries();
      router.replace("/");
    },
  });

  if (invitation.isError) {
    return (
      <AuthCard title="This invitation can't be used.">
        <ErrorState error={invitation.error} title="Invitation unavailable" />
        <Link href="/login" className={cn(buttonVariants({ variant: "outline", className: "w-full" }))}>
          Go to sign in
        </Link>
      </AuthCard>
    );
  }
  if (!invitation.data || signedInState === null) {
    return (
      <AuthCard title="Opening your invitation…">
        <LoadingBlock lines={3} />
      </AuthCard>
    );
  }

  const inv = invitation.data;
  return (
    <AuthCard
      title={`Join ${inv.workspaceName}.`}
      description={`${inv.invitedBy.name} invited ${inv.email} to join as an ${roleLabel[inv.role].toLowerCase()}.`}
    >
      <FormError title="We couldn't accept the invitation" error={accept.error} />
      {signedInState && me.data ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in as <span className="font-medium text-foreground">{me.data.email}</span>.
          </p>
          <Button className="h-10 w-full" disabled={accept.isPending} onClick={() => accept.mutate(undefined)}>
            {accept.isPending ? "Joining…" : `Join ${inv.workspaceName}`}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await identityService.logout().catch(() => {});
              session.clear();
              queryClient.clear();
              setSignedInState(false);
            }}
          >
            Not you? Sign out
          </button>
        </div>
      ) : inv.userExists ? (
        <Link href={`/login?next=${encodeURIComponent(here)}`} className={buttonVariants({ className: "h-10 w-full" })}>
          Sign in to accept
        </Link>
      ) : (
        <>
          <GoogleButton next={here} label="Join with Google" />
          <OrDivider />
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              accept.mutate(form);
            }}
          >
            <Field label="Email address" type="email" value={inv.email} disabled readOnly />
            <Field
              label="Your name"
              autoComplete="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldError(accept.error, "name")}
            />
            <Field
              label="Choose a password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              hint="At least 10 characters."
              error={fieldError(accept.error, "password")}
            />
            <Button type="submit" className="h-10 w-full" disabled={accept.isPending}>
              {accept.isPending ? "Joining…" : "Create account and join"}
            </Button>
          </form>
        </>
      )}
    </AuthCard>
  );
}
