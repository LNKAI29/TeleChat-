import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Mic,
  MicOff,
  MoreHorizontal,
  Phone,
  PhoneOff,
  MonitorUp,
  ShieldCheck,
  UserPlus,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initialsOf, type Profile } from "@/lib/telechat/types";
import { playRingtone } from "@/lib/telechat/ringtone";
import type { CallState } from "@/hooks/useCall";

type Props = {
  state: CallState;
  peer: Profile | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAnswer: () => void;
  onHangUp: () => void;
  onToggleMute: () => boolean;
  onToggleCamera: () => boolean;
  onShareScreen: () => Promise<boolean> | void;
  sharingScreen: boolean;
};

const two = (n: number) => n.toString().padStart(2, "0");

function TrayButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-2.5 outline-none">
      <span
        className={cn(
          "flex size-[68px] items-center justify-center rounded-full transition-all duration-200 active:scale-95",
          danger
            ? "bg-destructive text-destructive-foreground"
            : active
              ? "bg-foreground text-background"
              : "bg-foreground/10 text-foreground",
        )}
      >
        {children}
      </span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </button>
  );
}

export function CallOverlay({
  state,
  peer,
  localStream,
  remoteStream,
  onAnswer,
  onHangUp,
  onToggleMute,
  onToggleCamera,
  onShareScreen,
  sharingScreen,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream, state.status]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
    if (audioRef.current && remoteStream) audioRef.current.srcObject = remoteStream;
  }, [remoteStream, state.status]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = speaker ? 1 : 0.35;
  }, [speaker, remoteStream]);

  useEffect(() => {
    if (state.status !== "incoming" && state.status !== "calling") return;
    const handle = playRingtone(state.status === "incoming" ? "incoming" : "outgoing");
    return () => handle.stop();
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "active") {
      setSeconds(0);
      return;
    }
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === "idle") {
      setMuted(false);
      setCamOff(false);
    }
  }, [state.status]);

  if (state.status === "idle") return null;

  const name = peer?.display_name || peer?.username || "TeleChat";
  const status =
    state.status === "incoming"
      ? `Incoming ${state.video ? "video" : "voice"} call`
      : state.status === "calling"
        ? "Ringing …"
        : `${two(Math.floor(seconds / 60))}:${two(seconds % 60)}`;

  const videoActive = state.video && state.status === "active";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0b0f14] animate-in fade-in duration-200">
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {videoActive ? (
        <>
          <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 size-full object-cover" />
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="absolute top-[calc(env(safe-area-inset-top)+6rem)] right-4 h-44 w-28 rounded-3xl border border-white/15 object-cover shadow-2xl"
          />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 to-transparent" />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, currentColor 1.5px, transparent 2px), radial-gradient(circle at 68% 62%, currentColor 1.5px, transparent 2px)",
            backgroundSize: "56px 56px, 84px 84px",
            color: "white",
          }}
        />
      )}

      {/* Top bar */}
      <div className="relative flex items-start justify-between px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          onClick={onHangUp}
          aria-label="Minimise call"
          className="flex size-12 items-center justify-center rounded-full bg-foreground/10 text-foreground"
        >
          <ChevronDown className="size-6" />
        </button>
        <div className="flex-1 px-2 text-center">
          <p className="truncate text-[22px] leading-tight font-semibold text-foreground">{name}</p>
          <p className="mt-1 text-[15px] text-muted-foreground tabular-nums">{status}</p>
        </div>
        <button
          onClick={() => toast("Group calls are coming soon.")}
          aria-label="Add participant"
          className="flex size-12 items-center justify-center rounded-full bg-foreground/10 text-foreground"
        >
          <UserPlus className="size-6" />
        </button>
      </div>

      {!videoActive ? (
        <div className="relative flex flex-1 items-center justify-center px-6">
          <span className="relative flex items-center justify-center">
            {state.status !== "active" ? (
              <span className="absolute size-64 animate-ping rounded-full bg-primary/10 [animation-duration:2.4s]" />
            ) : null}
            <Avatar className="size-56 shadow-2xl">
              <AvatarImage src={peer?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-6xl">{peer ? initialsOf(peer) : "?"}</AvatarFallback>
            </Avatar>
          </span>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <p className="relative mb-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
        <ShieldCheck className="size-3.5" /> End-to-end encrypted
      </p>

      <div className="relative px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {state.status === "incoming" ? (
          <div className="mx-auto flex max-w-md items-center justify-between rounded-[2rem] bg-foreground/[0.06] px-10 py-8">
            <button
              onClick={onHangUp}
              aria-label="Decline call"
              className="flex size-[76px] items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-transform active:scale-95"
            >
              <PhoneOff className="size-8" />
            </button>
            <button
              onClick={onAnswer}
              aria-label="Answer call"
              className="flex size-[76px] animate-bounce items-center justify-center rounded-full bg-emerald-500 text-white transition-transform [animation-duration:1.6s] active:scale-95"
            >
              <Phone className="size-8" />
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-[2rem] bg-foreground/[0.06] px-4 py-7">
            <div className="grid grid-cols-3 gap-y-7">
              <TrayButton label="Speaker" active={speaker} onClick={() => setSpeaker((s) => !s)}>
                {speaker ? <Volume2 className="size-7" /> : <VolumeX className="size-7" />}
              </TrayButton>
              <TrayButton
                label="Video"
                active={state.video && !camOff}
                onClick={() => setCamOff(onToggleCamera())}
              >
                {state.video && !camOff ? <Video className="size-7" /> : <VideoOff className="size-7" />}
              </TrayButton>
              <TrayButton label="Mute" active={muted} onClick={() => setMuted(onToggleMute())}>
                {muted ? <MicOff className="size-7" /> : <Mic className="size-7" />}
              </TrayButton>

              <TrayButton label="More" onClick={() => toast("More call options are coming soon.")}>
                <MoreHorizontal className="size-7" />
              </TrayButton>
              <TrayButton
                label={sharingScreen ? "Stop share" : "Share screen"}
                active={sharingScreen}
                onClick={() => {
                  void (async () => {
                    try {
                      await onShareScreen();
                    } catch {
                      toast.error("Screen sharing needs an active video call.");
                    }
                  })();
                }}
              >
                <MonitorUp className="size-7" />
              </TrayButton>
              <TrayButton label="End" danger onClick={onHangUp}>
                <PhoneOff className="size-7" />
              </TrayButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
