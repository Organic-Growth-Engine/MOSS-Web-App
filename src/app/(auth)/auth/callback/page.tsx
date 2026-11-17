"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { errorMessage } from "@/lib/api/errors";
import { completeGoogleSignIn } from "@/lib/auth/sign-in";
import { AuthCard } from "@/components/auth/auth-card";
import { Callout } from "@/components/shared/callout";
import { LoadingBlock } from "@/components/shared/query-state";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingBlock className="mx-auto mt-24 h-60 max-w-md" />}>
      <Callback />
    </Suspense>
  );
}

/** Google redirects back here (via identity-service) with ?code&state. */
function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);
  const code = params.get("code");
  const state = params.get("state");
  const invalid = Boolean(params.get("error")) || !code || !state;
  const error = invalid ? "Google sign-in was cancelled or didn't complete." : failure;

  useEffect(() => {
    if (started.current || invalid) return;
    started.current = true;
    completeGoogleSignIn(code!, state!)
      .then((next) => router.replace(next))
      .catch((e) => setFailure(e instanceof Error && !("code" in e) ? e.message : errorMessage(e)));
  }, [code, state, invalid, router]);

  return (
    <AuthCard title={error ? "Sign-in didn't finish." : "Signing you in…"}>
      {error ? (
        <Callout tone="danger" title="We couldn't log you in">
          {error}{" "}
          <Link href="/login" className="underline">
            Try again
          </Link>
        </Callout>
      ) : (
        <LoadingBlock lines={2} />
      )}
    </AuthCard>
  );
}
