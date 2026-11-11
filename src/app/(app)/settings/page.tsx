"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Check, Plus, Save, Shield, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import { members, workspace } from "@/lib/data/mock";

const tabs = ["General", "Members", "Billing", "Security"] as const;
type SettingsTab = (typeof tabs)[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("General");
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [notice, setNotice] = useState("");
  const [notifications, setNotifications] = useState({
    results: true,
    health: true,
    reminders: false,
    insights: true,
  });
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Make yourself at home."
        description="The people, preferences and details behind Studio North."
        actions={
          <Button
            onClick={() => setNotice("Your settings are saved in this demo.")}
          >
            <Save aria-hidden /> Save changes
          </Button>
        }
      />
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {notice}
        </div>
      )}
      <div
        className="flex gap-1 overflow-x-auto border-b"
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`mb-[-1px] h-10 shrink-0 border-b-2 px-4 text-sm ${tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "General" && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Panel className="p-4 sm:p-5">
              <PanelTitle className="text-sm">Workspace details</PanelTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium">
                  Workspace name
                  <input
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-medium">
                  Workspace URL
                  <input
                    defaultValue={`origin.app/${workspace.slug}`}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-medium sm:col-span-2">
                  Workspace timezone
                  <select
                    defaultValue={workspace.timezone}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="America/Los_Angeles">
                      America/Los_Angeles · PDT (UTC−07:00)
                    </option>
                    <option value="America/New_York">
                      America/New_York · EDT (UTC−04:00)
                    </option>
                    <option value="Europe/London">
                      Europe/London · BST (UTC+01:00)
                    </option>
                  </select>
                </label>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Scheduling and reports use this timezone. Existing scheduled
                posts keep their original publishing time.
              </p>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PanelTitle className="text-sm">
                    The people behind the posts
                  </PanelTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {members.length} members ·{" "}
                    {workspace.plan.seats - members.length} seats available
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotice("Invite link copied in this demo.")}
                >
                  <Plus aria-hidden /> Invite member
                </Button>
              </div>
              <div className="mt-4 divide-y">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 py-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                      {member.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {member.name}
                        {member.id === "u_maya" && " (you)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                    <select
                      aria-label={`${member.name} role`}
                      defaultValue={member.role}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option>Owner</option>
                      <option>Admin</option>
                      <option>Editor</option>
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Editors create and schedule posts. Admins also manage accounts
                and members.
              </p>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <PanelTitle className="text-sm">Your profile</PanelTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium">
                  Full name
                  <input
                    defaultValue="Maya Chen"
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-medium">
                  Email address
                  <input
                    defaultValue="maya@studionorth.co"
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
              </div>
            </Panel>
          </div>
          <div className="space-y-5">
            <Panel className="p-4 sm:p-5">
              <PanelTitle className="text-sm">Stay in the loop</PanelTitle>
              <div className="mt-4 space-y-4">
                {(
                  [
                    [
                      "results",
                      "Publishing results",
                      "A summary after every publish.",
                    ],
                    [
                      "health",
                      "Account health",
                      "Reconnect and permission alerts.",
                    ],
                    [
                      "reminders",
                      "Schedule reminders",
                      "A daily look at what’s coming up.",
                    ],
                    [
                      "insights",
                      "Weekly insights",
                      "Your performance, every Monday.",
                    ],
                  ] as const
                ).map(([id, label, description]) => (
                  <label
                    key={id}
                    className="flex items-center justify-between gap-4"
                  >
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {description}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={notifications[id]}
                      onChange={(event) =>
                        setNotifications((current) => ({
                          ...current,
                          [id]: event.target.checked,
                        }))
                      }
                      className="size-4 accent-primary"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 border-t pt-4 text-sm">
                <input
                  type="checkbox"
                  defaultChecked
                  className="size-4 accent-primary"
                />
                Send notifications to my email, too
              </label>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <PanelTitle className="text-sm">
                A workspace that feels right
              </PanelTitle>
              <p className="mt-3 text-xs text-muted-foreground">Appearance</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as const).map((appearance) => (
                  <button
                    key={appearance}
                    onClick={() => setTheme(appearance)}
                    aria-pressed={theme === appearance}
                    className={`rounded-lg border p-3 text-xs capitalize ${theme === appearance ? "border-primary bg-primary-soft/50 text-primary" : "hover:bg-muted/40"}`}
                  >
                    <span
                      className={`mx-auto mb-2 block h-8 w-full rounded border ${appearance === "dark" ? "bg-[#1b1c20]" : "bg-white"}`}
                    />
                    <span className="inline-flex items-center gap-1">
                      {appearance === theme && (
                        <Check className="size-3" aria-hidden />
                      )}
                      {appearance}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <PanelTitle className="text-sm">Workspace plan</PanelTitle>
                <StatusPill tone="success">Active</StatusPill>
              </div>
              <p className="mt-3 text-sm font-medium">{workspace.plan.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {workspace.plan.accountSlots} social accounts ·{" "}
                {workspace.plan.seats} members · Unlimited scheduled posts
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() =>
                  setNotice("Billing management is not connected in this demo.")
                }
              >
                Manage billing
              </Button>
            </Panel>
          </div>
        </div>
      )}

      {tab === "Members" && (
        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <PanelTitle className="text-base">Workspace members</PanelTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage people who can create and publish content.
              </p>
            </div>
            <Button
              onClick={() => setNotice("Invite link copied in this demo.")}
            >
              <Plus aria-hidden /> Invite member
            </Button>
          </div>
          <div className="mt-5 divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {member.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                <StatusPill>{member.role}</StatusPill>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "Billing" && (
        <Panel className="max-w-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Users className="size-5" aria-hidden />
            </span>
            <div>
              <PanelTitle className="text-base">
                {workspace.plan.name} workspace
              </PanelTitle>
              <p className="text-sm text-muted-foreground">
                Your current plan and usage.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">
                Social account slots
              </p>
              <p className="mt-2 text-xl font-semibold">
                5 of {workspace.plan.accountSlots}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Team seats</p>
              <p className="mt-2 text-xl font-semibold">
                {members.length} of {workspace.plan.seats}
              </p>
            </div>
          </div>
          <Button
            className="mt-5"
            onClick={() =>
              setNotice("Billing management is not connected in this demo.")
            }
          >
            Manage billing
          </Button>
        </Panel>
      )}
      {tab === "Security" && (
        <Panel className="max-w-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success">
              <Shield className="size-5" aria-hidden />
            </span>
            <div>
              <PanelTitle className="text-base">
                Keep your workspace secure.
              </PanelTitle>
              <p className="text-sm text-muted-foreground">
                Review account access and sign-in preferences.
              </p>
            </div>
          </div>
          <div className="mt-5 divide-y">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">
                  Add another layer of protection to your account.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNotice(
                    "Two-factor authentication setup is not connected in this demo.",
                  )
                }
              >
                Set up
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium">Active sessions</p>
                <p className="text-xs text-muted-foreground">
                  This device · Last active just now
                </p>
              </div>
              <StatusPill tone="success">Current session</StatusPill>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
