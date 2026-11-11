import type { Metadata } from "next"

import { EmptyState, PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Integrations" }

export default function Page() {
  return (
    <>
      <PageHeader title="Integrations" description="Connect the apps your workflows use." />
      <EmptyState title="Coming soon" description="This screen will be built from the Figma design." />
    </>
  )
}
