import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  companyName: string;
  companyLogo: string;
  className?: string;
  iconClassName?: string;
  tone?: "light" | "dark";
}

export function BrandLogo({ companyName, companyLogo, className, iconClassName = "h-4 w-4", tone = "light" }: BrandLogoProps) {
  if (companyLogo) {
    return (
      <img
        src={companyLogo}
        alt={companyName}
        className={cn("h-8 w-8 rounded-lg object-contain p-1", tone === "dark" ? "bg-white/10 ring-1 ring-white/20" : "bg-secondary", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg",
        tone === "dark"
          ? "bg-gradient-to-br from-white/25 to-white/5 text-white ring-1 ring-white/20"
          : "bg-primary text-primary-foreground",
        className
      )}
    >
      <LifeBuoy className={iconClassName} />
    </div>
  );
}
