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
  ShieldCheck,
  Wrench,
  Users,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { useCompanyBranding } from "@/hooks/use-reference-data";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/common/brand-logo";
import { ProductLogo } from "@/components/common/product-logo";
import { ThemeToggle } from "@/components/common/theme-toggle";
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

const BASE_BARS = [40, 65, 50, 80, 60, 95, 70];

const LIVE_TIPS = [
  "Tickets auto-route by keyword, instantly",
  "SLA breaches trigger alerts before they happen",
  "Role-based access, enforced on every request",
  "One search across the whole knowledge base",
];

const HEADLINE = "Relax, we will do IT for you!!!";

function TypewriterHeadline() {
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (chars >= HEADLINE.length) return;
    const id = setTimeout(() => setChars((c) => c + 1), 45);
    return () => clearTimeout(id);
  }, [chars]);

  return (
    <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-950 xl:text-5xl">
      {HEADLINE.slice(0, chars)}
      <span className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[0.12em] animate-pulse bg-gradient-to-b from-teal-500 to-cyan-500 align-middle" />
    </h2>
  );
}

function LiveTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % LIVE_TIPS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
      </span>
      <span key={index} className="animate-fade-in-up">
        {LIVE_TIPS[index]}
      </span>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="font-mono text-sm text-slate-500">
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      <span className="mx-1.5 text-slate-300">&middot;</span>
      {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
    </div>
  );
}

function ProductPreviewCard() {
  const [bars, setBars] = useState(BASE_BARS);
  const [activeRow, setActiveRow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => prev.map((h) => Math.min(100, Math.max(20, h + (Math.random() * 24 - 12)))));
      setActiveRow((i) => (i + 1) % PREVIEW_TICKETS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-slate-200" />
        <span className="h-2 w-2 rounded-full bg-slate-200" />
        <span className="h-2 w-2 rounded-full bg-slate-200" />
        <span className="ml-1.5 text-[11px] font-medium text-slate-400">Ticket Dashboard</span>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>
      <div className="space-y-1.5">
        {PREVIEW_TICKETS.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors duration-700",
              i === activeRow ? "bg-teal-50 ring-1 ring-teal-200" : "bg-slate-50"
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.tone}`} />
              <span className="truncate text-xs text-slate-700">{t.title}</span>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-slate-400">{t.id}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-teal-500 to-cyan-400 transition-all duration-700 ease-out"
            style={{ height: `${h * 0.3}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function BrandPanel({ companyName }: { companyName: string }) {
  return (
    <div className="relative hidden flex-col overflow-hidden bg-white text-slate-950 lg:flex">
      <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 -z-10 text-slate-200" />

      <div className="relative flex items-center justify-between px-10 pt-8">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
          <ProductLogo className="h-5 w-5 text-teal-600" />
          HelpDesk Pro
        </span>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          All systems operational
        </div>
      </div>

      <div className="relative grid flex-1 grid-cols-1 items-center gap-10 px-10 py-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <TypewriterHeadline />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
            {companyName}'s internal help desk for tracking tickets, managing assets, and keeping SLAs on track — all
            in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-2 pr-3.5"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <f.icon className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <span className="text-xs font-medium text-slate-700">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <LiveTicker />
          </div>
        </div>

        <div className="hidden xl:block">
          <ProductPreviewCard />
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-slate-200 px-10 py-4">
        <LiveClock />
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <ProductLogo className="h-3.5 w-3.5" />
          HelpDesk Pro v1.0.0
        </span>
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
      <BrandPanel companyName={companyName} />

      <div className="relative flex items-center justify-center overflow-hidden bg-background p-4">
        <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 text-slate-300/60 dark:text-white/[0.06]" />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-[32rem] w-[32rem] -translate-y-1/3 translate-x-1/3 rounded-full bg-teal-500/10 blur-3xl"
        />

        <ThemeToggle className="absolute right-4 top-4" />

        <div className="relative w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-900/5">
            <div className="mb-6 flex flex-col items-center text-center">
              <BrandLogo
                companyName={companyName}
                companyLogo={companyLogo}
                heightClass="h-16"
                className="mb-3 rounded-xl shadow-sm"
                iconClassName="h-7 w-7"
              />
              <p className="text-xs text-muted-foreground">Internal IT Service Management Platform</p>
            </div>

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

          <div className="mt-4 rounded-2xl border border-border bg-card/70 p-4 text-xs backdrop-blur-sm">
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

          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              Secured by enterprise-grade authentication
            </div>
            <p className="text-xs text-muted-foreground">
              Need access? <span className="font-medium text-foreground">Contact your IT administrator</span> to get an account.
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
