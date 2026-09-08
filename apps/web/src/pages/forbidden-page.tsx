import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" />
      <p className="text-lg font-semibold">Access denied</p>
      <p className="max-w-sm text-sm text-muted-foreground">You don't have permission to view this page. Contact an administrator if you believe this is a mistake.</p>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
