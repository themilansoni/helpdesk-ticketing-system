import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  companyName: string;
  companyLogo: string;
  /** Tailwind height utility, e.g. "h-9", "h-12". Width follows automatically. */
  heightClass?: string;
  iconClassName?: string;
  tone?: "light" | "dark";
  className?: string;
}

export function BrandLogo({
  companyName,
  companyLogo,
  heightClass = "h-8",
  iconClassName = "h-4 w-4",
  tone = "light",
  className,
}: BrandLogoProps) {
  if (companyLogo) {
    // A real uploaded logo is rendered at its natural aspect ratio (no forced
    // square box) so wordmark-style logos aren't squeezed into an icon slot.
    return <img src={companyLogo} alt={companyName} className={cn(heightClass, "w-auto max-w-[240px] object-contain", className)} />;
  }
  return (
    <div
      className={cn(
        heightClass,
        "aspect-square flex items-center justify-center rounded-lg",
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
