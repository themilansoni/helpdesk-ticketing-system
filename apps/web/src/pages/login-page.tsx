import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LifeBuoy, Ticket, Gauge, BookOpen, Laptop } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { useCompanyBranding } from "@/hooks/use-reference-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "admin@helpdesk.local" },
  { role: "Technician", email: "technician@helpdesk.local" },
  { role: "Manager", email: "manager@helpdesk.local" },
  { role: "Employee", email: "employee@helpdesk.local" },
];

const FEATURES = [
  { icon: Ticket, label: "Track every ticket", description: "From request to resolution, in one queue." },
  { icon: Gauge, label: "Stay on top of SLAs", description: "Automatic breach warnings before they happen." },
  { icon: Laptop, label: "Manage your assets", description: "Know who has what, and when it was issued." },
  { icon: BookOpen, label: "Self-serve knowledge base", description: "Let employees solve the easy ones themselves." },
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

function BrandPanel({ companyName, companyLogo }: { companyName: string; companyLogo: string }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-primary to-indigo-900 p-10 text-white lg:flex">
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-drift-reverse pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl"
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <LifeBuoy className="h-5 w-5" />
            </div>
          )}
          <span className="text-sm font-semibold">{companyName}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/90">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          All systems operational
        </div>
      </div>

      <div className="relative space-y-8">
        <div>
          <h2 className="text-3xl font-bold leading-tight">IT support your team will actually enjoy using.</h2>
          <p className="mt-3 max-w-md text-sm text-white/70">
            {companyName}'s internal help desk for tracking tickets, managing assets, and keeping SLAs on track — all
            in one place.
          </p>
        </div>

        <ul className="space-y-4">
          {FEATURES.map((f) => (
            <li key={f.label} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <f.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-white/60">{f.description}</p>
              </div>
            </li>
          ))}
        </ul>
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel companyName={companyName} companyLogo={companyLogo} />

      <div className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="mb-3 h-12 w-12 rounded-xl object-contain shadow-md"
              />
            ) : (
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <LifeBuoy className="h-6 w-6" />
              </div>
            )}
            <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
            <p className="text-sm text-muted-foreground">Internal IT Service Management Platform</p>
          </div>

          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Sign in to your account</p>
              <p className="text-xs text-muted-foreground">Welcome back. Enter your work email to continue.</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@helpdesk.local"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-4 rounded-lg border border-border bg-white p-3 text-xs">
            <p className="mb-2 font-semibold text-muted-foreground">Demo accounts (password: Passw0rd!123)</p>
            <ul className="space-y-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.email} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{acc.role}</span>
                  <button
                    type="button"
                    className="font-mono text-primary hover:underline"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword("Passw0rd!123");
                    }}
                  >
                    {acc.email}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
