import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

interface AvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
}

export function Avatar({ firstName, lastName, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className
      )}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
