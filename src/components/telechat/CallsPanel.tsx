import { PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/lib/telechat/calls";

type Props = {
  calls: CallLog[];
  onClear: () => void;
  onCallBack: (peerId: string, video: boolean) => void;
};

const when = (ts: number) => {
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

const duration = (s: number) =>
  s <= 0 ? "" : ` · ${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

export function CallsPanel({ calls, onClear, onCallBack }: Props) {
  return (
    <div className="h-full bg-sidebar">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <h1 className="text-lg font-bold">Calls</h1>
        {calls.length ? (
          <button
            onClick={onClear}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-sidebar-accent"
          >
            Clear
          </button>
        ) : null}
      </header>

      {calls.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          No calls yet. Voice and video call history shows up here.
        </p>
      ) : null}

      {calls.map((c) => {
        const Icon = c.missed ? PhoneMissed : c.direction === "in" ? PhoneIncoming : PhoneOutgoing;
        return (
          <button
            key={c.id}
            onClick={() => onCallBack(c.peerId, c.video)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sidebar-accent"
          >
            <Avatar className="size-11">
              <AvatarImage src={c.avatar ?? undefined} alt="" />
              <AvatarFallback>{c.peerName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.peerName}</span>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  c.missed ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {when(c.at)}
                {duration(c.seconds)}
              </span>
            </span>
            <Video className={cn("size-5", c.video ? "text-primary" : "text-muted-foreground/40")} />
          </button>
        );
      })}
    </div>
  );
}
