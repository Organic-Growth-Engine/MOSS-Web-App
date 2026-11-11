import type { Metadata } from "next"

import { EmptyState, PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Workflows" }

export default function Page() {
  return (
    <>
      <PageHeader title="Workflows" description="Build and manage your automations." />
      <EmptyState title="Coming soon" description="This screen will be built from the Figma design." />
    </>
  )
}
