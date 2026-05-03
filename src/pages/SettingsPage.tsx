import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Link2,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  RefreshCcw,
  Globe,
  Laptop,
  Smartphone,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { useClerk, useUser } from "@clerk/react";
import { useEventsStore } from "@/store/eventsStore";

const PROVIDERS = [
  {
    key: "google",
    label: "Google Calendar",
    description: "Sync Google Calendar events",
    icon: Globe,
    iconColor: "#4285F4",
    bgColor: "rgba(66, 133, 244, 0.08)",
    borderColor: "rgba(66, 133, 244, 0.2)",
  },
  {
    key: "microsoft",
    label: "Microsoft Outlook",
    description: "Sync Outlook and Exchange events",
    icon: Laptop,
    iconColor: "#00A4EF",
    bgColor: "rgba(0, 164, 239, 0.08)",
    borderColor: "rgba(0, 164, 239, 0.2)",
  },
  {
    key: "icloud",
    label: "Apple iCloud",
    description: "Sync iCloud Calendar events",
    icon: Smartphone,
    iconColor: "#555",
    bgColor: "rgba(85, 85, 85, 0.08)",
    borderColor: "rgba(85, 85, 85, 0.2)",
  },
] as const;

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { connections, isLoadingConnections, fetchConnections, fetchWeekEvents } = useEventsStore();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<number | null>(null);
  const [nylasConfigured, setNylasConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      fetchConnections(user.id);
      checkNylasConfig();
    }
  }, [user]);

  const checkNylasConfig = async () => {
    try {
      const res = await fetch("/api/nylas/status");
      const data = await res.json() as { configured: boolean };
      setNylasConfigured(data.configured);
    } catch {
      setNylasConfigured(false);
    }
  };

  const handleConnect = async (provider: string) => {
    if (!user) return;
    setConnecting(provider);
    try {
      const res = await fetch(
        `/api/nylas/auth?userId=${encodeURIComponent(user.id)}&provider=${provider}&email=${encodeURIComponent(user.primaryEmailAddress?.emailAddress ?? "")}`
      );
      const data = await res.json() as { authUrl?: string; error?: string };
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error ?? "Failed to start calendar connection.");
      }
    } catch {
      alert("Failed to connect — check your Nylas configuration.");
    }
    setConnecting(null);
  };

  const handleDisconnect = async (connectionId: number) => {
    if (!user) return;
    setDisconnecting(connectionId);
    try {
      await fetch(`/api/calendar/connections/${connectionId}`, { method: "DELETE" });
      await fetchConnections(user.id);
      await fetchWeekEvents(user.id);
    } catch {
      alert("Failed to disconnect calendar.");
    }
    setDisconnecting(null);
  };

  const getConnection = (providerKey: string) =>
    connections.find((c) => c.provider === providerKey);

  return (
    <div className="flex flex-col h-full page-transition overflow-auto" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6 max-w-2xl">

        {/* Account */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Account
          </h2>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user?.primaryEmailAddress?.emailAddress ?? user?.firstName ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Signed in</p>
              </div>
              <button
                onClick={() => signOut()}
                className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                data-testid="button-sign-out"
              >
                Sign out
              </button>
            </div>
          </GlassCard>
        </section>

        {/* Nylas config warning */}
        {nylasConfigured === false && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard className="p-4 border border-yellow-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Nylas not configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add <code className="bg-muted px-1 rounded">NYLAS_API_KEY</code> and{" "}
                    <code className="bg-muted px-1 rounded">NYLAS_CLIENT_ID</code> to enable calendar connections.
                    Get your keys at{" "}
                    <a
                      href="https://dashboard.nylas.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      dashboard.nylas.com
                    </a>.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Calendar connections */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Calendars
            </h2>
            {isLoadingConnections && (
              <RefreshCcw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            )}
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {PROVIDERS.map((provider, i) => {
                const conn = getConnection(provider.key);
                const isConnected = !!conn;
                const isConnecting = connecting === provider.key;
                const isDisconnecting = disconnecting === conn?.id;

                return (
                  <motion.div
                    key={provider.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <GlassCard
                      className="p-4"
                      data-testid={`provider-card-${provider.key}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: provider.bgColor, border: `1px solid ${provider.borderColor}` }}
                        >
                          <provider.icon className="w-5 h-5" style={{ color: provider.iconColor }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{provider.label}</p>
                          {isConnected ? (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {conn.email ?? "Connected"} • since {new Date(conn.connectedAt).toLocaleDateString()}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                          )}
                        </div>

                        {/* Action */}
                        {isConnected ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-xs font-medium">Connected</span>
                            </div>
                            <button
                              onClick={() => conn && handleDisconnect(conn.id)}
                              disabled={isDisconnecting}
                              className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                              data-testid={`button-disconnect-${provider.key}`}
                            >
                              {isDisconnecting ? (
                                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleConnect(provider.key)}
                            disabled={isConnecting || nylasConfigured === false}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                            data-testid={`button-connect-${provider.key}`}
                          >
                            {isConnecting ? (
                              <>
                                <RefreshCcw className="w-3 h-3 animate-spin" />
                                Connecting…
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                Connect
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Nylas info */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            About Calendar Sync
          </h2>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <Link2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Powered by Nylas</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calendar sync is handled by Nylas, which provides a single unified API for Google Calendar,
                  Outlook, Exchange, and iCloud. Your events are fetched in real-time with full timezone support.
                </p>
                <a
                  href="https://www.nylas.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  Learn more <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}
