import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Ticket,
  Gauge,
  BookOpen,
  Laptop,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Wrench,
  Users,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { useCompanyBranding } from "@/hooks/use-reference-data";
import { BrandLogo } from "@/components/common/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "admin@helpdesk.local", icon: ShieldCheck },
  { role: "Technician", email: "technician@helpdesk.local", icon: Wrench },
  { role: "Manager", email: "manager@helpdesk.local", icon: Users },
  { role: "Employee", email: "employee@helpdesk.local", icon: UserCircle },
];

const FEATURES = [
  { icon: Ticket, label: "Ticket tracking" },
  { icon: Gauge, label: "SLA monitoring" },
  { icon: Laptop, label: "Asset management" },
  { icon: BookOpen, label: "Knowledge base" },
];

const PREVIEW_TICKETS = [
  { id: "HD-2318", title: "VPN connection dropping", tone: "bg-rose-400" },
  { id: "HD-2317", title: "Laptop replacement request", tone: "bg-amber-400" },
  { id: "HD-2315", title: "Shared drive access", tone: "bg-emerald-400" },
];

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="font-mono text-sm text-white/80">
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      <span className="mx-1.5 text-white/40">&middot;</span>
      {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
    </div>
  );
}

function ProductPreviewCard() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="ml-1.5 text-[11px] font-medium text-white/40">Ticket Dashboard</span>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      </div>
      <div className="space-y-1.5">
        {PREVIEW_TICKETS.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.05] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.tone}`} />
              <span className="truncate text-xs text-white/80">{t.title}</span>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-white/35">{t.id}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-1">
        {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-teal-400/70 to-cyan-300/70" style={{ height: `${h * 0.3}px` }} />
        ))}
      </div>
    </div>
  );
}

function BrandPanel({ companyName, companyLogo }: { companyName: string; companyLogo: string }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-900 p-10 text-white lg:flex">
      <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 text-white/[0.06]" />
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-drift-reverse pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo companyName={companyName} companyLogo={companyLogo} className="h-9 w-9" iconClassName="h-5 w-5" tone="dark" />
          <span className="text-sm font-semibold tracking-tight">{companyName}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          All systems operational
        </div>
      </div>

      <div className="relative grid flex-1 grid-cols-1 items-center gap-10 py-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Internal IT Service Platform
          </span>
          <h2 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            IT support your team will{" "}
            <span className="bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">actually enjoy</span> using.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            {companyName}'s internal help desk for tracking tickets, managing assets, and keeping SLAs on track — all
            in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1.5 pl-2 pr-3.5 backdrop-blur-sm"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                  <f.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-medium text-white/85">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden xl:block">
          <ProductPreviewCard />
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 pt-4">
        <LiveClock />
        <span className="text-xs text-white/50">HelpDesk Pro v1.0.0</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const { companyName, companyLogo } = useCompanyBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[3fr_2fr]">
      <BrandPanel companyName={companyName} companyLogo={companyLogo} />

      <div className="relative flex items-center justify-center overflow-hidden bg-slate-50 p-4">
        <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 text-slate-300/60" />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-[32rem] w-[32rem] -translate-y-1/3 translate-x-1/3 rounded-full bg-teal-500/10 blur-3xl"
        />

        <div className="relative w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <BrandLogo
              companyName={companyName}
              companyLogo={companyLogo}
              className="mb-3 h-12 w-12 rounded-xl bg-teal-600 text-white shadow-md"
              iconClassName="h-6 w-6"
            />
            <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
            <p className="text-sm text-muted-foreground">Internal IT Service Management Platform</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-xl shadow-slate-900/5">
            <p className="text-lg font-semibold text-foreground">Sign in to your account</p>
            <p className="mt-1 text-sm text-muted-foreground">Welcome back. Enter your work email to continue.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@helpdesk.local"
                    className="h-10 rounded-xl pl-9 focus-visible:ring-teal-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 rounded-xl pl-9 focus-visible:ring-teal-500"
                  />
                </div>
              </div>
              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="group h-10 w-full rounded-xl bg-teal-600 hover:bg-teal-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-white/70 p-4 text-xs backdrop-blur-sm">
            <p className="mb-2.5 font-semibold text-muted-foreground">Demo accounts &middot; password Passw0rd!123</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-secondary"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("Passw0rd!123");
                  }}
                >
                  <acc.icon className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                  <span className="truncate text-muted-foreground">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
