import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";
import MonthView from "@/pages/MonthView";
import WeekView from "@/pages/WeekView";
import DayView from "@/pages/DayView";
import YearView from "@/pages/YearView";
import SettingsPage from "@/pages/SettingsPage";
import BookingPage from "@/pages/BookingPage";
import NotFound from "@/pages/not-found";
import { useEventsStore } from "@/store/eventsStore";
import { useAvailabilityStore } from "@/store/availabilityStore";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { NewEventModal } from "@/components/NewEventModal";
import { ShareSidebar } from "@/components/ShareSidebar";
import { SettingsModal } from "@/components/SettingsModal";
import { PeoplePanel } from "@/components/PeoplePanel";
import { JumpToDateModal } from "@/components/JumpToDateModal";
import { SearchResultsOverlay } from "@/components/SearchResultsOverlay";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#3B82F6",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#0f172a",
    colorNeutral: "#e2e8f0",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white/80 backdrop-blur-2xl rounded-3xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-black/10 border border-white/50",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-bold",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-600 text-xs font-semibold uppercase tracking-wide",
    footerActionLink: "text-blue-500 font-semibold hover:text-blue-600",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-blue-500",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-red-700",
    logoBox: "w-12 h-12",
    logoImage: "w-12 h-12 rounded-2xl",
    socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50 rounded-xl",
    formButtonPrimary: "bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold",
    formFieldInput: "border-slate-200 rounded-xl bg-slate-50 text-slate-900",
    footerAction: "border-t border-slate-100",
    dividerLine: "bg-slate-200",
    alert: "bg-red-50 border-red-200 rounded-xl",
    otpCodeFieldInput: "border-slate-200 rounded-xl",
    formFieldRow: "",
    main: "",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg px-4 py-8">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg px-4 py-8">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function LandingPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center mesh-bg p-8 text-center">
      <div className="mb-10">
        <div
          className="w-20 h-20 rounded-[28px] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/30"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}
        >
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="4" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
            <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-3 text-lg max-w-sm mx-auto">
          Your intelligent calendar, beautifully designed.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate("/sign-in")}
          className="px-8 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}
        >
          Sign In
        </button>
        <button
          onClick={() => navigate("/sign-up")}
          className="px-8 py-3 rounded-2xl bg-white/60 dark:bg-white/10 backdrop-blur border border-white/50 dark:border-white/20 text-foreground text-sm font-semibold hover:bg-white/80 dark:hover:bg-white/20 transition-colors"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}

// ── Google Calendar connect banner ───────────────────────────────────────────
function GoogleConnectBanner({ userId }: { userId: string }) {
  const { user } = useUser();
  const { connections, openSettings } = useSettingsStore();
  const dismissKey = `gcal-banner-dismissed-${userId}`;
  const [visible, setVisible] = useState(() => !localStorage.getItem(dismissKey));

  const hasGoogleOAuth = user?.externalAccounts.some(
    (a) => a.provider === "google",
  );
  const alreadyConnected = connections.some((c) => c.provider === "google");

  const dismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setVisible(false);
  };

  if (!hasGoogleOAuth || alreadyConnected || !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="gcal-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="overflow-hidden flex-shrink-0"
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 text-sm"
            style={{
              background: "linear-gradient(90deg, rgba(59,130,246,0.10) 0%, rgba(139,92,246,0.08) 100%)",
              borderBottom: "1px solid rgba(59,130,246,0.15)",
            }}
          >
            {/* Google icon */}
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground">Connect Google Calendar</span>
              <span className="text-muted-foreground ml-1.5">
                Import your existing events from Google.
              </span>
            </div>

            <button
              onClick={() => { openSettings("accounts"); dismiss(); }}
              className="flex-shrink-0 px-3 py-1 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}
            >
              Connect
            </button>
            <button
              onClick={dismiss}
              className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CalendarApp() {
  const { user, isLoaded } = useUser();
  const { fetchWeekEvents, fetchConnections } = useEventsStore();
  const { isShareMode, toggleShareMode } = useAvailabilityStore();
  const { isNewEventOpen, openNewEvent, closeNewEvent, isJumpOpen, openJump, closeJump, searchQuery, clearSearch, focusSearch } = useUIStore();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user) {
      fetchWeekEvents(user.id);
      fetchConnections(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (el?.isContentEditable) return;

      if (e.key === "Escape") {
        if (searchQuery)    { clearSearch();     return; }
        if (isJumpOpen)     { closeJump();       return; }
        if (isNewEventOpen) { closeNewEvent();   return; }
        if (isShareMode)    { toggleShareMode(); return; }
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (e.key === "g" || e.key === "G") { openJump();  return; }
      if (e.key === "s" || e.key === "S") {
        toggleShareMode();
        if (!isShareMode) navigate("/week");
      }
      if (e.key === "c" || e.key === "C") openNewEvent();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isNewEventOpen, isJumpOpen, isShareMode, searchQuery, openNewEvent, closeNewEvent, openJump, closeJump, toggleShareMode, navigate, clearSearch, focusSearch]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <div className="flex h-screen overflow-hidden mesh-bg">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden min-w-0">
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 relative">
          {/* Google Calendar connect banner — shown once after Google sign-in */}
          <GoogleConnectBanner userId={user.id} />
          {/* Natural-language search results overlay */}
          <SearchResultsOverlay />
          <Switch>
            <Route path="/" component={MonthView} />
            <Route path="/month" component={MonthView} />
            <Route path="/week" component={WeekView} />
            <Route path="/day" component={DayView} />
            <Route path="/year" component={YearView} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>

          <NewEventModal />
          <SettingsModal />
          <PeoplePanel />
          <JumpToDateModal />
        </main>

        <ShareSidebar />
      </div>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your calendar",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started with Calendar",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <ThemeProvider>
            <Switch>
              <Route path="/book/:hash">
                {(params: { hash: string }) => <BookingPage hash={params.hash} />}
              </Route>
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route>
                <CalendarApp />
                <Toaster />
              </Route>
            </Switch>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
