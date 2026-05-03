import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error);
      else setSuccessMsg("Check your email to confirm your account, then sign in.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-primary/20"
            style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}
          >
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "signin" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Not configured warning */}
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card mb-4 p-4 border border-yellow-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Supabase not configured</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your <code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code> and{" "}
                  <code className="bg-muted px-1 rounded">VITE_SUPABASE_ANON_KEY</code> environment variables to enable authentication.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Card */}
        <div className="glass-card p-8">
          {/* Mode toggle */}
          <div className="flex rounded-2xl bg-muted/60 p-1 mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                className="flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-200"
                style={
                  mode === m
                    ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                    : { color: "hsl(var(--muted-foreground))" }
                }
                data-testid={`tab-${m}`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-muted/60 border border-border rounded-2xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  data-testid="input-email"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted/60 border border-border rounded-2xl pl-9 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  data-testid="input-password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  <p className="text-xs text-destructive">{error}</p>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5"
                >
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{successMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading || !isConfigured}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-primary-foreground transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: "hsl(var(--primary))" }}
              data-testid="button-submit"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                mode === "signin" ? "Sign In" : "Create Account"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
