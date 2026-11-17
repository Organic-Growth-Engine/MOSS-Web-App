"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Link2, Lock, Plus, ShieldCheck } from "lucide-react";

import { errorMessage, isApiError } from "@/lib/api/errors";
import { formatInTz, platformName } from "@/lib/format";
import type { Platform, SocialAccount } from "@/lib/api/types";
import {
  useCheckout,
  useDisconnect,
  useReconnect,
  useSocialAccounts,
  useStartConnection,
} from "@/lib/api/hooks/queries";
import { useWorkspace } from "@/lib/api/hooks/workspace-context";
import { appUrl, useFollowUrl } from "@/lib/navigation";
import { COMING_SOON_PLATFORMS, LIVE_PLATFORMS, platformMeta } from "@/config/platforms";
import { PageHeader } from "@/components/layout/page-header";
import { Callout } from "@/components/shared/callout";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformTile } from "@/components/shared/platform-icon";
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

const callbackErrors: Record<string, string> = {
  access_denied: "Authorization was cancelled. Nothing changed.",
  account_mismatch: "That's a different account. Your included account can only be reconnected, not replaced.",
  missing_permissions: "Some permissions weren't granted. Try again and allow every permission.",
};

export default function AccountsPage() {
  return (
    <Suspense fallback={<LoadingBlock className="h-96" />}>
      <Accounts />
    </Suspense>
  );
}

function Accounts() {
  const { data: workspace } = useWorkspace();
  const accountsQuery = useSocialAccounts();
  const reconnect = useReconnect();
  const disconnect = useDisconnect();
  const followUrl = useFollowUrl();
  const [connectOpen, setConnectOpen] = useState(false);
  const [managing, setManaging] = useState<SocialAccount | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const accounts = accountsQuery.data?.data ?? [];

  // Results of the OAuth / Stripe round-trips arrive as query params.
  const connectedId = params.get("connected");
  const callbackError = params.get("error");
  const checkout = params.get("checkout");
  const checkoutPlatform = params.get("platform") as Platform | null;
  const returnKey = connectedId || callbackError || checkout ? params.toString() : "";
  const [handledKey, setHandledKey] = useState("");
  if (returnKey && returnKey !== handledKey && (!connectedId || accountsQuery.data)) {
    setHandledKey(returnKey);
    if (connectedId) {
      const account = accountsQuery.data?.data.find((a) => a.id === connectedId);
      setNotice({ tone: "success", text: `${account ? platformName(account.platform) : "Your account"} is connected and ready to publish.` });
    } else if (callbackError) {
      setNotice({ tone: "danger", text: callbackErrors[callbackError] ?? "We couldn't connect that account. Please try again." });
    } else if (checkout === "success") {
      setNotice({
        tone: "success",
        text: `Extra account slot added to your plan. Connect your ${checkoutPlatform ? `${platformName(checkoutPlatform)} ` : ""}account now.`,
      });
      setConnectOpen(true);
    }
  }
  useEffect(() => {
    if (handledKey) router.replace(pathname);
  }, [handledKey, router, pathname]);

  const doReconnect = (account: SocialAccount) =>
    reconnect.mutate(
      { accountId: account.id, redirectUri: appUrl("/accounts") },
      {
        onSuccess: ({ authorizationUrl }) => followUrl(authorizationUrl),
        onError: (e) => setNotice({ tone: "danger", text: errorMessage(e) }),
      },
    );

  const active = accounts.filter((a) => a.status !== "not_connected");
  const reconnectCount = accounts.filter((a) => a.status === "expired").length;
  const firstExpired = accounts.find((a) => a.status === "expired");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your corner of the internet."
        description="Keep every account connected, healthy and ready to share."
        actions={
          <Button onClick={() => setConnectOpen(true)}>
            <Plus aria-hidden /> Connect account
          </Button>
        }
      />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {firstExpired && (
        <Callout
          tone="warning"
          title={`${platformName(firstExpired.platform)} authorization expired`}
          action={
            <Button variant="outline" size="sm" disabled={reconnect.isPending} onClick={() => doReconnect(firstExpired)}>
              Reconnect {platformName(firstExpired.platform)}
            </Button>
          }
        >
          Reconnect {firstExpired.displayName} to resume scheduled publishing. Your queued posts will stay in place.
        </Callout>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PanelTitle className="text-base">Authorized accounts · {active.length}</PanelTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Connected accounts belong to the {workspace?.name ?? ""} workspace.
          </p>
        </div>
        {workspace && accountsQuery.data && (
          <p className="text-xs text-muted-foreground">
            {active.length} of {workspace.plan.accountSlots} account slots used · {active.length - reconnectCount} healthy ·{" "}
            {reconnectCount} need reconnect · {workspace.plan.name} plan
          </p>
        )}
      </div>

      {accountsQuery.isError ? (
        <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
      ) : accountsQuery.isPending ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <LoadingBlock key={i} className="h-60" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              initials={workspace?.initials ?? ""}
              tz={workspace?.timezone ?? "UTC"}
              busy={reconnect.isPending}
              onReconnect={() => doReconnect(account)}
              onManage={() => setManaging(account)}
            />
          ))}
        </div>
      )}

      <Panel className="flex flex-col items-start justify-between gap-4 border-dashed sm:flex-row sm:items-center">
        <div>
          <PanelTitle className="text-base">Make room for more.</PanelTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect another brand or account to your {workspace?.name ?? ""} workspace.
          </p>
        </div>
        <Button variant="outline" onClick={() => setConnectOpen(true)}>
          Connect account
        </Button>
      </Panel>
      <Panel className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          <PanelTitle className="text-base">Official platform authorization</PanelTitle>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Origin never stores your social account password. You can revoke access at any time.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {COMING_SOON_PLATFORMS.map((p) => (
            <StatusPill key={p}>{platformMeta[p].name} · Coming soon</StatusPill>
          ))}
        </div>
      </Panel>

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} accounts={accounts} />
      <ManageDialog
        account={managing ? (accounts.find((a) => a.id === managing.id) ?? null) : null}
        tz={workspace?.timezone ?? "UTC"}
        onClose={() => setManaging(null)}
        reconnecting={reconnect.isPending}
        onReconnect={(a) => doReconnect(a)}
        disconnecting={disconnect.isPending}
        disconnectError={disconnect.isError ? errorMessage(disconnect.error) : undefined}
        onDisconnect={(a) =>
          disconnect.mutate(a.id, {
            onSuccess: () => {
              setManaging(null);
              setNotice({ tone: "success", text: `${a.displayName} was disconnected. Its paid slot stays on your plan.` });
            },
          })
        }
      />
    </div>
  );
}

function AccountCard({
  account,
  initials,
  tz,
  busy,
  onReconnect,
  onManage,
}: {
  account: SocialAccount;
  initials: string;
  tz: string;
  busy: boolean;
  onReconnect: () => void;
  onManage: () => void;
}) {
  const status =
    account.status === "connected"
      ? { tone: "success" as const, label: "Connected" }
      : account.status === "expires_soon"
        ? { tone: "warning" as const, label: "Expires soon" }
        : account.status === "expired"
          ? { tone: "warning" as const, label: "Expired" }
          : { tone: "neutral" as const, label: "Not connected" };
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-center gap-3 border-b pb-3">
        <PlatformTile platform={account.platform} />
        <div className="min-w-0 flex-1">
          <PanelTitle className="text-base">{platformName(account.platform)}</PanelTitle>
          <p className="text-xs text-muted-foreground">
            {account.platform === "instagram" ? "Business or Creator · Facebook Page" : account.accountType}
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <div className="flex flex-wrap items-center gap-3 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{account.displayName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {account.accountType} · {account.audience.toLocaleString()} {account.audienceLabel}
          </p>
        </div>
        {account.isDefault && <StatusPill tone="primary">Default</StatusPill>}
        {account.isAddOn && <StatusPill>Paid extra</StatusPill>}
      </div>
      {account.connectedBy && (
        <div className="flex justify-between border-b pb-3 text-xs text-muted-foreground">
          <span>Connected by {account.connectedBy.name}</span>
          <span>{account.connectedAt ? formatInTz(account.connectedAt, tz, { dateStyle: "medium" }) : ""}</span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {account.status === "expired" || account.status === "expires_soon" ? (
          <Button size="sm" disabled={busy} onClick={onReconnect}>
            Reconnect account
          </Button>
        ) : account.status === "not_connected" ? (
          <Button size="sm" disabled={busy} onClick={onReconnect}>
            <Link2 aria-hidden /> Connect
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={onManage}>
          Manage connection
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {account.permissions.map((permission) => (
          <span key={permission}>✓ {permission}</span>
        ))}
      </div>
    </Panel>
  );
}

function ConnectDialog({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: SocialAccount[];
}) {
  const { data: workspace } = useWorkspace();
  const start = useStartConnection();
  const checkout = useCheckout();
  const followUrl = useFollowUrl();
  const [paywall, setPaywall] = useState<{ platform: Platform; message: string } | null>(null);
  const used = accounts.filter((a) => a.status !== "not_connected").length;

  const connect = (platform: Platform) => {
    setPaywall(null);
    start.mutate(
      { platform, redirectUri: appUrl("/accounts") },
      {
        onSuccess: ({ authorizationUrl }) => {
          onOpenChange(false);
          followUrl(authorizationUrl);
        },
        onError: (e) => {
          if (isApiError(e, "PAYMENT_REQUIRED")) setPaywall({ platform, message: e.message });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setPaywall(null);
          start.reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect an account</DialogTitle>
          <DialogDescription>
            Choose a platform to connect to {workspace?.name}. You&apos;ll sign in with the platform to authorize Origin.
          </DialogDescription>
        </DialogHeader>
        {paywall ? (
          <Callout
            tone="primary"
            title={`Add another ${platformName(paywall.platform)} account`}
            action={
              <Button
                size="sm"
                disabled={checkout.isPending}
                onClick={() =>
                  checkout.mutate(
                    {
                      item: "extra_social_account",
                      // The platform only tells the return page which account to offer next.
                      successUrl: appUrl(`/accounts?checkout=success&platform=${paywall.platform}`),
                      cancelUrl: appUrl("/accounts"),
                    },
                    {
                      onSuccess: ({ url }) => {
                        setPaywall(null);
                        followUrl(url);
                      },
                    },
                  )
                }
              >
                {checkout.isPending ? "Opening checkout…" : "Buy an extra account slot"}
              </Button>
            }
          >
            {paywall.message}
            {checkout.isError && <span className="mt-1 block text-destructive">{errorMessage(checkout.error)}</span>}
          </Callout>
        ) : (
          start.isError && <p className="text-xs text-destructive">{errorMessage(start.error)}</p>
        )}
        <div className="space-y-2">
          {LIVE_PLATFORMS.map((platform) => {
            const hasDefault = accounts.some((a) => a.platform === platform && a.isDefault);
            return (
              <button
                key={platform}
                type="button"
                disabled={start.isPending}
                onClick={() => connect(platform)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 disabled:opacity-60"
              >
                <PlatformTile platform={platform} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{platformName(platform)}</span>
                  <span className="text-xs text-muted-foreground">
                    {hasDefault ? "Included account connected · another uses a paid extra slot" : platformMeta[platform].connectHint}
                  </span>
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {used} of {workspace?.plan.accountSlots ?? "–"} account slots used.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageDialog({
  account,
  tz,
  onClose,
  reconnecting,
  onReconnect,
  disconnecting,
  disconnectError,
  onDisconnect,
}: {
  account: SocialAccount | null;
  tz: string;
  onClose: () => void;
  reconnecting: boolean;
  onReconnect: (a: SocialAccount) => void;
  disconnecting: boolean;
  disconnectError?: string;
  onDisconnect: (a: SocialAccount) => void;
}) {
  const date = (iso?: string | null) => (iso ? formatInTz(iso, tz, { dateStyle: "medium" }) : "—");
  return (
    <Dialog open={Boolean(account)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {account && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlatformTile platform={account.platform} size="sm" /> {account.displayName}
              </DialogTitle>
              <DialogDescription>
                {platformName(account.platform)} · {account.accountType}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Connected by</dt>
              <dd>{account.connectedBy?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Connected on</dt>
              <dd>{date(account.connectedAt)}</dd>
              <dt className="text-muted-foreground">Authorization</dt>
              <dd>
                {account.status === "expired" ? "Expired " : account.status === "not_connected" ? "Not authorized" : "Valid until "}
                {account.status !== "not_connected" && date(account.authorizationExpiresAt)}
              </dd>
              <dt className="text-muted-foreground">Permissions</dt>
              <dd className="space-y-0.5">
                {account.permissions.map((p) => (
                  <span key={p} className="block">
                    ✓ {p}
                  </span>
                ))}
              </dd>
            </dl>
            {account.isDefault && (
              <p className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                This is your included {platformName(account.platform)} account. Compose always publishes here. It can be
                reconnected, but not disconnected or replaced.
              </p>
            )}
            {disconnectError && <p className="text-xs text-destructive">{disconnectError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {account.isAddOn && (
                <Button variant="ghost" disabled={disconnecting} onClick={() => onDisconnect(account)}>
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </Button>
              )}
              <Button variant="outline" disabled={reconnecting} onClick={() => onReconnect(account)}>
                Reconnect
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
