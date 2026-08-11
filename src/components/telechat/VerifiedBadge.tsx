import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Blue TeleChat verification tick shown next to official account names. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Verified TeleChat account"
      className={cn("inline-block shrink-0 fill-sky-500 text-background", className)}
    />
  );
}
