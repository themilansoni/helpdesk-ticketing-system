import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <p className="text-lg font-semibold">Page not found</p>
      <p className="max-w-sm text-sm text-muted-foreground">The page you're looking for doesn't exist or may have been moved.</p>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
