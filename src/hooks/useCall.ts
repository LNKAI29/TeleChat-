import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaConnection, Peer } from "peerjs";

export type CallState = {
  status: "idle" | "calling" | "incoming" | "active";
  video: boolean;
  peerId: string | null;
};

/** Voice and video calling over WebRTC (PeerJS). */
export function useCall(myPeerId: string | null) {
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const incomingRef = useRef<MediaConnection | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  const [state, setState] = useState<CallState>({ status: "idle", video: false, peerId: null });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);

  const cleanup = useCallback(() => {
    callRef.current?.close();
    callRef.current = null;
    incomingRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraTrackRef.current = null;
    setSharingScreen(false);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setState({ status: "idle", video: false, peerId: null });
  }, []);

  useEffect(() => {
    if (!myPeerId || typeof window === "undefined") return;
    let disposed = false;
    let peer: Peer | null = null;

    void (async () => {
      const { default: PeerCtor } = await import("peerjs");
      if (disposed) return;
      peer = new PeerCtor(`tc-${myPeerId}`, { debug: 0 });
      peerRef.current = peer;
      peer.on("open", () => !disposed && setReady(true));
      peer.on("call", (call) => {
        incomingRef.current = call;
        const wantsVideo = (call.metadata as { video?: boolean } | undefined)?.video === true;
        setState({ status: "incoming", video: wantsVideo, peerId: call.peer });
      });
      peer.on("disconnected", () => {
        if (!disposed) peer?.reconnect();
      });
      peer.on("error", () => setReady(false));
    })();

    return () => {
      disposed = true;
      cleanup();
      peer?.destroy();
      peerRef.current = null;
      setReady(false);
    };
  }, [myPeerId, cleanup]);

  const attach = useCallback(
    (call: MediaConnection, video: boolean) => {
      callRef.current = call;
      call.on("stream", (stream) => {
        setRemoteStream(stream);
        setState((prev) => ({ ...prev, status: "active", video }));
      });
      call.on("close", () => cleanup());
      call.on("error", () => cleanup());
    },
    [cleanup],
  );

  const startCall = useCallback(
    async (remotePeerId: string, video: boolean) => {
      const peer = peerRef.current;
      if (!peer) throw new Error("Calling is not ready yet");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setState({ status: "calling", video, peerId: `tc-${remotePeerId}` });
      const call = peer.call(`tc-${remotePeerId}`, stream, { metadata: { video } });
      attach(call, video);
    },
    [attach],
  );

  const answer = useCallback(async () => {
    const call = incomingRef.current;
    if (!call) return;
    const video = state.video;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;
    setLocalStream(stream);
    call.answer(stream);
    attach(call, video);
  }, [attach, state.video]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
    return !(track?.enabled ?? true);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
    return !(track?.enabled ?? true);
  }, []);

  /** Swaps the outgoing video track between the camera and the shared screen. */
  const senderFor = () => {
    const pc = (callRef.current as unknown as { peerConnection?: RTCPeerConnection } | null)
      ?.peerConnection;
    return pc?.getSenders().find((s) => s.track?.kind === "video") ?? null;
  };

  const stopScreenShare = useCallback(async () => {
    const sender = senderFor();
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    const camera = cameraTrackRef.current;
    if (sender && camera) await sender.replaceTrack(camera);
    setSharingScreen(false);
  }, []);

  const shareScreen = useCallback(async () => {
    if (screenStreamRef.current) {
      await stopScreenShare();
      return false;
    }
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = display.getVideoTracks()[0];
    if (!track) return false;

    const sender = senderFor();
    if (!sender) {
      display.getTracks().forEach((t) => t.stop());
      throw new Error("Screen sharing needs an active video call");
    }
    cameraTrackRef.current = cameraTrackRef.current ?? sender.track ?? null;
    await sender.replaceTrack(track);
    screenStreamRef.current = display;
    track.addEventListener("ended", () => void stopScreenShare());
    setSharingScreen(true);
    return true;
  }, [stopScreenShare]);

  return {
    ready,
    state,
    localStream,
    remoteStream,
    sharingScreen,
    startCall,
    answer,
    hangUp: cleanup,
    toggleMute,
    toggleCamera,
    shareScreen,
  };
}