import { Suspense } from "react";

import { LoadingBlock } from "@/components/shared/query-state";
import { AcceptInvite } from "./accept-invite";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<LoadingBlock className="mx-auto mt-24 h-96 max-w-md" />}>
      <AcceptInvite params={params} />
    </Suspense>
  );
}
