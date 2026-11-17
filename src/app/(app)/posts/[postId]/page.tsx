import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingBlock } from "@/components/shared/query-state";
import { PostDetail } from "./post-detail";

export const metadata: Metadata = { title: "Post" };

export default function Page({ params }: { params: Promise<{ postId: string }> }) {
  return (
    <Suspense fallback={<LoadingBlock className="h-96" />}>
      <PostDetail params={params} />
    </Suspense>
  );
}
