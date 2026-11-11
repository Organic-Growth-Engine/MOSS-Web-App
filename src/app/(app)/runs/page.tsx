import type { Metadata } from "next"

import { EmptyState, PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Runs" }

export default function Page() {
  return (
    <>
      <PageHeader title="Runs" description="Execution history across all workflows." />
      <EmptyState title="Coming soon" description="This screen will be built from the Figma design." />
    </>
  )
}
