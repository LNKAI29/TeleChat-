import { useRef, useState } from "react";
import { Camera, Copy, LogOut, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fileToDataUrl } from "@/lib/telechat/image";
import { initialsOf, type Profile } from "@/lib/telechat/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile;
  onUpdated: (patch: Partial<Profile>) => void;
};

export function ProfileSheet({ open, onOpenChange, profile, onUpdated }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [about, setAbout] = useState(profile.about ?? "");
  const [busy, setBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const patchProfile = async (patch: Partial<Profile>) => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onUpdated(patch);
    toast.success("Profile updated");
  };

  const pickImage = async (file: File | undefined, kind: "avatar_url" | "cover_url") => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file, kind === "avatar_url" ? 320 : 1200, 0.8);
      await patchProfile({ [kind]: dataUrl } as Partial<Profile>);
    } catch {
      toast.error("Could not process that image.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full overflow-y-auto overscroll-contain border-border bg-card p-0 [&>button:first-of-type]:hidden sm:max-w-md"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Your profile</SheetTitle>
        </SheetHeader>

        <SheetClose
          className="absolute top-3 left-3 z-30 flex size-9 items-center justify-center rounded-full bg-background/70 backdrop-blur transition-transform hover:scale-105"
          aria-label="Close profile"
        >
          <X className="size-4" />
        </SheetClose>

        <div className="relative">
          <div
            className="h-40 w-full bg-cover bg-center"
            style={{
              backgroundImage: profile.cover_url
                ? `url(${profile.cover_url})`
                : "var(--brand-gradient)",
            }}
          />
          <button
            onClick={() => coverInput.current?.click()}
            className="absolute top-3 right-3 z-30 rounded-full bg-background/70 p-2 backdrop-blur transition-transform hover:scale-105"
            aria-label="Change cover image"
          >
            <Camera className="size-4" />
          </button>
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickImage(e.target.files?.[0], "cover_url")}
          />

          <div className="absolute -bottom-10 left-6">
            <button
              onClick={() => avatarInput.current?.click()}
              className="group relative rounded-full"
              aria-label="Change profile picture"
            >
              <Avatar className="size-20 border-4 border-card">
                <AvatarImage src={profile.avatar_url ?? undefined} alt="Your profile picture" />
                <AvatarFallback className="text-lg">{initialsOf(profile)}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5" />
              </span>
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickImage(e.target.files?.[0], "avatar_url")}
            />
          </div>
        </div>

        <div className="space-y-5 px-6 pt-14 pb-8">
          <div>
            <p className="text-lg font-semibold">{profile.display_name || profile.username}</p>
            <p className="text-sm text-primary">@{profile.username}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dn">Display name</Label>
            <Input
              id="dn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="about">About</Label>
            <Textarea
              id="about"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              className="rounded-xl"
            />
          </div>

          <Button
            disabled={busy}
            onClick={() => patchProfile({ display_name: displayName.trim(), about })}
            className="h-11 w-full rounded-xl"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>

          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Your permanent chat ID</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="truncate text-xs">{profile.peer_id}</code>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(profile.peer_id ?? "");
                  toast.success("Chat ID copied");
                }}
                className="ml-auto text-muted-foreground transition-colors hover:text-primary"
                aria-label="Copy chat ID"
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => supabase.auth.signOut()}
            className="h-11 w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}