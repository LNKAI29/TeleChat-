import {
  Bell,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  Palette,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf, type Profile } from "@/lib/telechat/types";
import { getSecurityState, setAppLockEnabled, setPin } from "@/lib/telechat/security";
import { PinModal } from "./PinModal";

type Props = {
  me: Profile;
  onOpenProfile: () => void;
  onSignOut: () => void;
  notifications: boolean;
  onNotifications: (value: boolean) => void;
  readReceipts: boolean;
  onReadReceipts: (value: boolean) => void;
};

export function SettingsPanel({
  me,
  onOpenProfile,
  onSignOut,
  notifications,
  onNotifications,
  readReceipts,
  onReadReceipts,
}: Props) {
  const [securityState, setSecurityState] = useState(getSecurityState());
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const toggleAppLock = (enabled: boolean) => {
    if (enabled && !securityState.pin) {
      setPinModalOpen(true);
    } else {
      setAppLockEnabled(enabled);
      setSecurityState(getSecurityState());
      toast.success(enabled ? "App Lock enabled" : "App Lock disabled");
    }
  };

  const rows = [
    { icon: UserRound, label: "Profile", hint: "Name, about, username", action: onOpenProfile },
    {
      icon: ImageIcon,
      label: "Photo & cover",
      hint: "Update your display picture",
      action: onOpenProfile,
    },
    {
      icon: KeyRound,
      label: "Change password",
      hint: "Send a reset link to your email",
      action: async () => {
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email;
        if (!email) return;
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        toast.success("Password reset link sent to your email.");
      },
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-sidebar">
      <div className="relative">
        <div
          className="h-32 w-full"
          style={{
            background: me.cover_url ? `url(${me.cover_url}) center/cover` : "var(--brand-gradient)",
          }}
        />
        <button onClick={onOpenProfile} className="absolute -bottom-8 left-5">
          <Avatar className="size-20 ring-4 ring-sidebar">
            <AvatarImage src={me.avatar_url ?? undefined} alt="Your profile picture" />
            <AvatarFallback className="text-xl">{initialsOf(me)}</AvatarFallback>
          </Avatar>
        </button>
      </div>

      <div className="mt-11 px-5">
        <p className="text-lg font-semibold">{me.display_name || me.username}</p>
        <p className="text-sm text-muted-foreground">@{me.username}</p>
        <p className="mt-1 text-sm text-muted-foreground">{me.about}</p>
      </div>

      <div className="mt-6 space-y-1 px-3">
        {rows.map((row) => (
          <button
            key={row.label}
            onClick={() => void row.action()}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-sidebar-accent"
          >
            <row.icon className="size-5 text-primary" />
            <span className="flex-1">
              <span className="block text-sm font-medium">{row.label}</span>
              <span className="block text-xs text-muted-foreground">{row.hint}</span>
            </span>
          </button>
        ))}

        <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <Lock className="size-5 text-primary" />
          <span className="flex-1 text-sm font-medium">App Lock (PIN)</span>
          <Switch checked={securityState.isAppLockEnabled} onCheckedChange={toggleAppLock} />
        </div>

        <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <Bell className="size-5 text-primary" />
          <span className="flex-1 text-sm font-medium">Notifications</span>
          <Switch checked={notifications} onCheckedChange={onNotifications} />
        </div>

        <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <ShieldCheck className="size-5 text-primary" />
          <span className="flex-1 text-sm font-medium">Read receipts</span>
          <Switch checked={readReceipts} onCheckedChange={onReadReceipts} />
        </div>

        <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-muted-foreground">
          <Video className="size-5 text-primary" />
          <span className="flex-1 text-sm">Voice & video calls enabled</span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-muted-foreground">
          <Palette className="size-5 text-primary" />
          <span className="flex-1 text-sm">TeleChat dark theme</span>
        </div>

        <button
          onClick={onSignOut}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-5" />
          <span className="text-sm font-medium">Log out</span>
        </button>

        {/* Branding Footer */}
        <div className="my-8 flex flex-col items-center justify-center gap-1.5 opacity-80">
          <img src="/splash.png" alt="TeleChat" className="size-10 object-contain" />
          <p className="text-xs font-semibold tracking-wide text-foreground">TeleChat</p>
          <p className="text-[11px] font-medium text-muted-foreground">From LNK Official</p>
        </div>
      </div>

      <PinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        mode="setup"
        onSuccess={(pin) => {
          setPin(pin);
          setAppLockEnabled(true, pin);
          setSecurityState(getSecurityState());
          setPinModalOpen(false);
          toast.success("App Lock enabled with Security PIN");
        }}
      />
    </div>
  );
}