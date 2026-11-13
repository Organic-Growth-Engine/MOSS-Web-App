"use client";

import { useState } from "react";
import { ArrowUpRight, Link2, Plus, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Callout } from "@/components/shared/callout";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformTile, platformMeta } from "@/components/shared/platform-icon";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { accounts as initialAccounts, workspace } from "@/lib/data/mock";
import {
  LIVE_PLATFORMS,
  type LivePlatformId,
  type SocialAccount,
} from "@/lib/data/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [connectOpen, setConnectOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const activeAccounts = accounts.filter(
    (account) => account.status !== "not_connected",
  );
  const currentUsedSlots = activeAccounts.length;
  const reconnectCount = accounts.filter(
    (account) => account.status === "expired",
  ).length;
  const connectAccount = (platform: LivePlatformId) => {
    setAccounts((current) => {
      const disconnected = current.find(
        (account) =>
          account.platform === platform && account.status === "not_connected",
      );
      if (disconnected)
        return current.map((account) =>
          account.id === disconnected.id
            ? {
                ...account,
                status: "connected",
                connectedBy: "Maya Chen",
                connectedOn: "Just now",
              }
            : account,
        );
      const existing = current.find((account) => account.platform === platform);
      if (existing)
        return current.map((account) =>
          account.id === existing.id
            ? {
                ...account,
                status: "connected",
                connectedBy: "Maya Chen",
                connectedOn: "Just now",
              }
            : account,
        );
      const newAccount: SocialAccount = {
        id: `acc_${platform}_demo`,
        platform,
        handle: "@studionorth",
        displayName: "@studionorth",
        accountType: "Professional account",
        audience: 0,
        audienceLabel: "followers",
        status: "connected",
        isDefault: false,
        connectedBy: "Maya Chen",
        connectedOn: "Just now",
        permissions: [
          "Create and publish content",
          "Read insights & account details",
        ],
      };
      return [...current, newAccount];
    });
    setConnectOpen(false);
    setNotice(
      `${platformMeta[platform].name} connected in demo mode. No authorization took place.`,
    );
  };
  const updateStatus = (id: string, status: SocialAccount["status"]) =>
    setAccounts((current) =>
      current.map((account) =>
        account.id === id ? { ...account, status } : account,
      ),
    );
  const setDefault = (id: string) =>
    setAccounts((current) =>
      current.map((account) => ({ ...account, isDefault: account.id === id })),
    );

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
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
        >
          {notice}
        </div>
      )}
      {reconnectCount > 0 && (
        <Callout
          tone="warning"
          title="LinkedIn authorization expired"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateStatus("acc_li", "connected");
                setNotice(
                  "LinkedIn reconnected in demo mode. No authorization took place.",
                );
              }}
            >
              Reconnect LinkedIn
            </Button>
          }
        >
          Reconnect Studio North to resume scheduled publishing. Your queued
          posts will stay in place.
        </Callout>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PanelTitle className="text-base">
            Authorized accounts · {activeAccounts.length}
          </PanelTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Connected accounts belong to the Studio North workspace.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {currentUsedSlots} of {workspace.plan.accountSlots} account slots used
          · {activeAccounts.length - reconnectCount} healthy · {reconnectCount}{" "}
          need reconnect · {workspace.plan.name} plan
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {accounts.map((account) => (
          <Panel key={account.id} className="p-4 sm:p-5">
            <div className="flex items-center gap-3 border-b pb-3">
              <PlatformTile platform={account.platform} />
              <div className="min-w-0 flex-1">
                <PanelTitle className="text-base">
                  {platformMeta[account.platform].name}
                </PanelTitle>
                <p className="text-xs text-muted-foreground">
                  {account.platform === "instagram"
                    ? "Business or Creator · Facebook Page"
                    : account.accountType}
                </p>
              </div>
              <StatusPill
                tone={
                  account.status === "connected"
                    ? "success"
                    : account.status === "expired"
                      ? "warning"
                      : "neutral"
                }
              >
                {account.status === "connected"
                  ? "Connected"
                  : account.status === "expired"
                    ? "Expired"
                    : "Not connected"}
              </StatusPill>
            </div>
            <div className="flex flex-wrap items-center gap-3 py-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                SN
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {account.displayName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {account.accountType} · {account.audience.toLocaleString()}{" "}
                  {account.audienceLabel}
                </p>
              </div>
              {account.isDefault && (
                <StatusPill tone="primary">Default</StatusPill>
              )}
            </div>
            {account.connectedBy && (
              <div className="flex justify-between border-b pb-3 text-xs text-muted-foreground">
                <span>Connected by {account.connectedBy}</span>
                <span>{account.connectedOn}</span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {account.status === "expired" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    updateStatus(account.id, "connected");
                    setNotice(
                      `${platformMeta[account.platform].name} reconnected in demo mode. No authorization took place.`,
                    );
                  }}
                >
                  Reconnect account
                </Button>
              ) : account.status === "not_connected" ? (
                <Button
                  size="sm"
                  onClick={() => connectAccount(account.platform)}
                >
                  <Link2 aria-hidden /> Connect
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setNotice(
                      `Manage connection for ${account.displayName} · demo only.`,
                    )
                  }
                >
                  Manage connection
                </Button>
              )}
              {account.status === "connected" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateStatus(account.id, "not_connected");
                    setNotice(
                      `${account.displayName} disconnected in demo mode.`,
                    );
                  }}
                >
                  Disconnect
                </Button>
              )}
              {account.status === "connected" && !account.isDefault && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setDefault(account.id)}
                >
                  Make default
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {account.permissions.map((permission) => (
                <span key={permission}>✓ {permission}</span>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="flex flex-col items-start justify-between gap-4 border-dashed sm:flex-row sm:items-center">
        <div>
          <PanelTitle className="text-base">Make room for more.</PanelTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect another brand or account to your Studio North workspace.
          </p>
        </div>
        <Button variant="outline" onClick={() => setConnectOpen(true)}>
          Connect account
        </Button>
      </Panel>
      <Panel className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          <PanelTitle className="text-base">
            Official platform authorization
          </PanelTitle>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Origin never stores your social account password. You can revoke
          access at any time.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["TikTok", "Pinterest", "Threads"].map((name) => (
            <StatusPill key={name}>{name} · Coming soon</StatusPill>
          ))}
        </div>
      </Panel>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect an account</DialogTitle>
            <DialogDescription>
              Choose a platform to connect to Studio North. This demo does not
              perform authorization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {LIVE_PLATFORMS.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => connectAccount(platform)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"
              >
                <PlatformTile platform={platform} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {platformMeta[platform].name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {platform === "linkedin"
                      ? "Company Page · Page admin required"
                      : platform === "instagram"
                        ? "Business or Creator + Facebook Page"
                        : "Official account authorization"}
                  </span>
                </span>
                <ArrowUpRight
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentUsedSlots} of {workspace.plan.accountSlots} account slots
            used.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setConnectOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
