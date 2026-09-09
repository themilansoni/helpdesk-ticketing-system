import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LifeBuoy } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
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
  );
}
