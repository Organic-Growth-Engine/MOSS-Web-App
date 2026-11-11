import type { Metadata } from "next"

import { EmptyState, PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your automations." />
      <EmptyState title="Coming soon" description="This screen will be built from the Figma design." />
    </>
  )
}
