import type { Metadata } from "next"

import { EmptyState, PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Settings" }

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace and account settings." />
      <EmptyState title="Coming soon" description="This screen will be built from the Figma design." />
    </>
  )
}
