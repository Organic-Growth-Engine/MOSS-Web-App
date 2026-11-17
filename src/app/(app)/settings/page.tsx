"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Check, ExternalLink, Plus, Save, Shield, Users } from "lucide-react";

import { errorMessage } from "@/lib/api/errors";
import { now } from "@/lib/clock";
import { roleLabel, timeAgo, timezoneLabel } from "@/lib/format";
import type { Member, NotificationPreferences, Role, User, Workspace } from "@/lib/api/types";
import {
  useBillingPortal,
  useCreateInvitation,
  useMembers,
  useNotificationPreferences,
  useRevokeSession,
  useSecurityOverview,
  useSocialAccounts,
  useUpdateMember,
  useUpdateNotificationPreferences,
  useUpdateProfile,
  useUpdateWorkspace,
} from "@/lib/api/hooks/queries";
import { useCurrentUser, useMyRole, useWorkspace } from "@/lib/api/hooks/workspace-context";
import { appUrl, useFollowUrl } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { ErrorState, LoadingBlock, Notice, type NoticeState } from "@/components/shared/query-state";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const tabs = ["General", "Members", "Billing", "Security"] as const;
type SettingsTab = (typeof tabs)[number];
const COMMON_TIMEZONES = ["America/Los_Angeles", "America/New_York", "Europe/London"];
const prefRows = [
  ["publishingResults", "Publishing results", "A summary after every publish."],
  ["accountHealth", "Account health", "Reconnect and permission alerts."],
  ["scheduleReminders", "Schedule reminders", "A daily look at what’s coming up."],
  ["weeklyInsights", "Weekly insights", "Your performance, every Monday."],
] as const;

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingBlock className="h-96" />}>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const me = useCurrentUser();
  const workspace = useWorkspace();
  const members = useMembers();
  const prefs = useNotificationPreferences();
  const queries = [me, workspace, members, prefs];
  const failed = queries.find((q) => q.isError);

  if (failed) return <ErrorState error={failed.error} onRetry={() => queries.forEach((q) => q.refetch())} />;
  if (!me.data || !workspace.data || !members.data || !prefs.data) {
    return (
      <div className="space-y-6">
        <LoadingBlock className="h-16 max-w-md" />
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <LoadingBlock className="h-[540px]" />
          <LoadingBlock className="h-[540px]" />
        </div>
      </div>
    );
  }
  // Keyed so the form re-initializes when the server data it was built from changes workspace.
  return (
    <SettingsForm
      key={workspace.data.id}
      me={me.data}
      workspace={workspace.data}
      members={members.data.data}
      prefs={prefs.data}
    />
  );
}

function SettingsForm({
  me,
  workspace,
  members,
  prefs,
}: {
  me: User;
  workspace: Workspace;
  members: Member[];
  prefs: NotificationPreferences;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = tabs.find((t) => t.toLowerCase() === params.get("tab"));
  const [tab, setTab] = useState<SettingsTab>(requested ?? "General");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const myRole = useMyRole();
  const canAdmin = myRole === "owner" || myRole === "admin";

  const [ws, setWs] = useState({ name: workspace.name, slug: workspace.slug, timezone: workspace.timezone });
  const [profile, setProfile] = useState({ name: me.name, email: me.email });
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [notifications, setNotifications] = useState(prefs);

  const updateWorkspace = useUpdateWorkspace();
  const updateProfile = useUpdateProfile();
  const updateMember = useUpdateMember();
  const updatePrefs = useUpdateNotificationPreferences();
  const saving = [updateWorkspace, updateProfile, updateMember, updatePrefs].some((m) => m.isPending);

  // Follow ?tab= when it changes (e.g. the sidebar's "Manage your plan" link).
  const [lastRequested, setLastRequested] = useState(requested);
  if (requested && requested !== lastRequested) {
    setLastRequested(requested);
    setTab(requested);
  }
  const portalReturn = params.get("billing") === "mock_portal";
  const [portalSeen, setPortalSeen] = useState(false);
  if (portalReturn && !portalSeen) {
    setPortalSeen(true);
    setNotice({ tone: "info", text: "With mock data there's no Stripe portal. In production, Manage billing opens it." });
  }
  useEffect(() => {
    if (portalReturn) router.replace(`${pathname}?tab=billing`);
  }, [portalReturn, router, pathname]);

  const save = async () => {
    setNotice(null);
    const jobs: Promise<unknown>[] = [];
    const wsChanges = Object.fromEntries(
      Object.entries(ws).filter(([k, v]) => workspace[k as keyof typeof ws] !== v),
    );
    if (Object.keys(wsChanges).length) jobs.push(updateWorkspace.mutateAsync(wsChanges));
    const profileChanges = Object.fromEntries(
      Object.entries(profile).filter(([k, v]) => me[k as keyof typeof profile] !== v),
    );
    if (Object.keys(profileChanges).length) jobs.push(updateProfile.mutateAsync(profileChanges));
    for (const [userId, role] of Object.entries(roles)) {
      if (members.find((m) => m.userId === userId)?.role !== role) jobs.push(updateMember.mutateAsync({ userId, role }));
    }
    if (JSON.stringify(notifications) !== JSON.stringify(prefs)) jobs.push(updatePrefs.mutateAsync(notifications));
    if (!jobs.length) return setNotice({ tone: "info", text: "Nothing to save yet." });
    const results = await Promise.allSettled(jobs);
    const errors = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (errors.length) setNotice({ tone: "danger", text: errors.map((e) => errorMessage(e.reason)).join(" ") });
    else {
      setRoles({});
      setNotice({ tone: "success", text: "Your settings are saved." });
    }
  };

  const timezones = COMMON_TIMEZONES.includes(ws.timezone) ? COMMON_TIMEZONES : [ws.timezone, ...COMMON_TIMEZONES];
  const tzAt = now();
  const seatsLeft = workspace.plan.seats - members.length;

  const membersList = (variant: "compact" | "full") => (
    <div className={variant === "compact" ? "mt-4 divide-y" : "mt-5 divide-y"}>
      {members.map((member) => (
        <div key={member.userId} className={`flex items-center gap-3 ${variant === "compact" ? "py-3" : "py-4"}`}>
          <span className={`flex items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary ${variant === "compact" ? "size-9" : "size-10"}`}>
            {member.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {member.name}
              {variant === "compact" && member.userId === me.id && " (you)"}
            </p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>
          {variant === "compact" ? (
            <select
              aria-label={`${member.name} role`}
              value={roles[member.userId] ?? member.role}
              disabled={!canAdmin}
              onChange={(e) => setRoles((r) => ({ ...r, [member.userId]: e.target.value as Role }))}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              {(["owner", "admin", "editor"] as const).map((r) => (
                <option key={r} value={r} disabled={r === "owner" && myRole !== "owner"}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
          ) : (
            <StatusPill>{roleLabel[member.role]}</StatusPill>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Make yourself at home."
        description={`The people, preferences and details behind ${workspace.name}.`}
        actions={
          <Button onClick={save} disabled={saving}>
            <Save aria-hidden /> {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Settings sections">
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
                    value={ws.name}
                    disabled={!canAdmin}
                    onChange={(event) => setWs({ ...ws, name: event.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-medium">
                  Workspace URL
                  <input
                    value={`origin.app/${ws.slug}`}
                    disabled={!canAdmin}
                    onChange={(event) =>
                      setWs({ ...ws, slug: event.target.value.replace(/^origin\.app\/?/, "").toLowerCase() })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-medium sm:col-span-2">
                  Workspace timezone
                  <select
                    value={ws.timezone}
                    disabled={!canAdmin}
                    onChange={(event) => setWs({ ...ws, timezone: event.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {timezoneLabel(tz, tzAt)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Scheduling and reports use this timezone. Existing scheduled posts keep their original publishing time.
              </p>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PanelTitle className="text-sm">The people behind the posts</PanelTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {members.length} members · {Math.max(seatsLeft, 0)} seats available
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={!canAdmin} onClick={() => setInviteOpen(true)}>
                  <Plus aria-hidden /> Invite member
                </Button>
              </div>
              {membersList("compact")}
              <p className="mt-3 text-xs text-muted-foreground">
                Editors create and schedule posts. Admins also manage accounts and members.
              </p>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <PanelTitle className="text-sm">Your profile</PanelTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium">
                  Full name
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-medium">
                  Email address
                  <input
                    type="email"
                    value={profile.email}
                    disabled={me.authProvider === "google"}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm disabled:opacity-70"
                  />
                  {me.authProvider === "google" && (
                    <span className="mt-1 block font-normal text-muted-foreground">Managed by your Google account.</span>
                  )}
                </label>
              </div>
            </Panel>
          </div>
          <div className="space-y-5">
            <Panel className="p-4 sm:p-5">
              <PanelTitle className="text-sm">Stay in the loop</PanelTitle>
              <div className="mt-4 space-y-4">
                {prefRows.map(([id, label, description]) => (
                  <label key={id} className="flex items-center justify-between gap-4">
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={notifications[id]}
                      onChange={(event) => setNotifications((current) => ({ ...current, [id]: event.target.checked }))}
                      className="size-4 accent-primary"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 border-t pt-4 text-sm">
                <input
                  type="checkbox"
                  checked={notifications.emailEnabled}
                  onChange={(e) => setNotifications((c) => ({ ...c, emailEnabled: e.target.checked }))}
                  className="size-4 accent-primary"
                />
                Send notifications to my email, too
              </label>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <PanelTitle className="text-sm">A workspace that feels right</PanelTitle>
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
                      {appearance === theme && <Check className="size-3" aria-hidden />}
                      {appearance}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
            <PlanPanel workspace={workspace} onNotice={setNotice} compact />
          </div>
        </div>
      )}

      {tab === "Members" && (
        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <PanelTitle className="text-base">Workspace members</PanelTitle>
              <p className="mt-1 text-sm text-muted-foreground">Manage people who can create and publish content.</p>
            </div>
            <Button disabled={!canAdmin} onClick={() => setInviteOpen(true)}>
              <Plus aria-hidden /> Invite member
            </Button>
          </div>
          {membersList("full")}
        </Panel>
      )}
      {tab === "Billing" && <PlanPanel workspace={workspace} members={members.length} onNotice={setNotice} />}
      {tab === "Security" && <SecurityPanel />}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSent={(email) => setNotice({ tone: "success", text: `Invitation sent to ${email}.` })}
      />
    </div>
  );
}

function PlanPanel({
  workspace,
  members,
  compact,
  onNotice,
}: {
  workspace: Workspace;
  members?: number;
  compact?: boolean;
  onNotice: (n: NoticeState) => void;
}) {
  const portal = useBillingPortal();
  const followUrl = useFollowUrl();
  const accounts = useSocialAccounts();
  const myRole = useMyRole();
  const used = accounts.data?.data.filter((a) => a.status !== "not_connected").length;
  const openPortal = () =>
    portal.mutate(
      { returnUrl: appUrl("/settings?tab=billing") },
      {
        onSuccess: ({ url }) => followUrl(url),
        onError: (e) => onNotice({ tone: "danger", text: errorMessage(e) }),
      },
    );
  const manage = (
    <Button
      variant={compact ? "outline" : "default"}
      className={compact ? "mt-4 w-full" : "mt-5"}
      disabled={portal.isPending || myRole !== "owner"}
      title={myRole !== "owner" ? "Only owners can manage billing" : undefined}
      onClick={openPortal}
    >
      {portal.isPending ? "Opening…" : "Manage billing"}
      {!compact && <ExternalLink aria-hidden />}
    </Button>
  );

  if (compact) {
    return (
      <Panel className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <PanelTitle className="text-sm">Workspace plan</PanelTitle>
          <StatusPill tone="success">Active</StatusPill>
        </div>
        <p className="mt-3 text-sm font-medium">{workspace.plan.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {workspace.plan.accountSlots} social accounts · {workspace.plan.seats} members · Unlimited scheduled posts
        </p>
        {manage}
      </Panel>
    );
  }
  return (
    <Panel className="max-w-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Users className="size-5" aria-hidden />
        </span>
        <div>
          <PanelTitle className="text-base">{workspace.plan.name} workspace</PanelTitle>
          <p className="text-sm text-muted-foreground">Your current plan and usage.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Social account slots</p>
          <p className="mt-2 text-xl font-semibold">
            {used ?? "–"} of {workspace.plan.accountSlots}
          </p>
          {workspace.plan.extraSocialAccounts > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Includes {workspace.plan.extraSocialAccounts} paid extra account
              {workspace.plan.extraSocialAccounts === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Team seats</p>
          <p className="mt-2 text-xl font-semibold">
            {members ?? workspace.seatsUsed} of {workspace.plan.seats}
          </p>
        </div>
      </div>
      {manage}
    </Panel>
  );
}

function SecurityPanel() {
  const security = useSecurityOverview();
  const revoke = useRevokeSession();
  if (security.isError) return <ErrorState error={security.error} onRetry={() => security.refetch()} />;
  if (!security.data) return <LoadingBlock className="h-56 max-w-2xl" />;
  const { twoFactor, sessions } = security.data;
  return (
    <Panel className="max-w-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success">
          <Shield className="size-5" aria-hidden />
        </span>
        <div>
          <PanelTitle className="text-base">Keep your workspace secure.</PanelTitle>
          <p className="text-sm text-muted-foreground">Review account access and sign-in preferences.</p>
        </div>
      </div>
      <div className="mt-5 divide-y">
        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium">Two-factor authentication</p>
            <p className="text-xs text-muted-foreground">
              {twoFactor
                ? "Managed by your Google account."
                : "Available when you sign in with Google."}
            </p>
          </div>
          {twoFactor && (
            <a
              href={twoFactor.manageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
            >
              Manage in Google <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
        <div className="py-4">
          <p className="text-sm font-medium">Active sessions</p>
          <p className="text-xs text-muted-foreground">
            {sessions.length === 1 ? "Only this device is signed in." : `${sessions.length} devices are signed in.`}
          </p>
          {revoke.isError && <p className="mt-2 text-xs text-destructive">{errorMessage(revoke.error)}</p>}
          <ul className="mt-3 space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm">{s.current ? "This device" : s.device}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.current ? s.device : null, s.location].filter(Boolean).join(" · ")} · Last active{" "}
                    {timeAgo(s.lastActiveAt, now())}
                  </p>
                </div>
                {s.current ? (
                  <StatusPill tone="success">Current session</StatusPill>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revoke.isPending && revoke.variables === s.id}
                    onClick={() => revoke.mutate(s.id)}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSent: (email: string) => void;
}) {
  const invite = useCreateInvitation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) invite.reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>We&apos;ll email them a link to join this workspace.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate(
              { email, role },
              {
                onSuccess: () => {
                  onSent(email);
                  onOpenChange(false);
                  setEmail("");
                },
              },
            );
          }}
        >
          <label className="block text-xs font-medium">
            Email address
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-xs font-medium">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "editor")}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="editor">Editor — creates and schedules posts</option>
              <option value="admin">Admin — also manages accounts and members</option>
            </select>
          </label>
          {invite.isError && <p className="text-xs text-destructive">{errorMessage(invite.error)}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
