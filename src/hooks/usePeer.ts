import { useCallback, useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";

export type PeerPayload = { id: string; text: string; ts: number };

type Options = {
  myPeerId: string | null;
  onMessage: (fromPeerId: string, payload: PeerPayload) => void;
};

export function usePeer({ myPeerId, onMessage }: Options) {
  const peerRef = useRef<Peer | null>(null);
  const connsRef = useRef<Map<string, DataConnection>>(new Map());
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState<string[]>([]);

  const track = useCallback((conn: DataConnection) => {
    connsRef.current.set(conn.peer, conn);
    setOnline(Array.from(connsRef.current.keys()));
    conn.on("data", (raw) => {
      const payload = raw as PeerPayload;
      if (payload && typeof payload.text === "string") {
        handlerRef.current(conn.peer, payload);
      }
    });
    const drop = () => {
      connsRef.current.delete(conn.peer);
      setOnline(Array.from(connsRef.current.keys()));
    };
    conn.on("close", drop);
    conn.on("error", drop);
  }, []);

  useEffect(() => {
    if (!myPeerId || typeof window === "undefined") return;
    let disposed = false;
    let peer: Peer | null = null;

    void (async () => {
      const { default: PeerCtor } = await import("peerjs");
      if (disposed) return;
      peer = new PeerCtor(myPeerId, { debug: 0 });
      peerRef.current = peer;
      peer.on("open", () => !disposed && setReady(true));
      peer.on("connection", (conn) => {
        conn.on("open", () => track(conn));
      });
      peer.on("disconnected", () => {
        setReady(false);
        if (!disposed) peer?.reconnect();
      });
      peer.on("error", () => {
        /* unavailable peer / network — handled by UI status */
      });
    })();

    return () => {
      disposed = true;
      connsRef.current.forEach((c) => c.close());
      connsRef.current.clear();
      peer?.destroy();
      peerRef.current = null;
      setReady(false);
      setOnline([]);
    };
  }, [myPeerId, track]);

  const connect = useCallback(
    (remotePeerId: string) => {
      const peer = peerRef.current;
      if (!peer || !remotePeerId) return;
      const existing = connsRef.current.get(remotePeerId);
      if (existing && existing.open) return;
      const conn = peer.connect(remotePeerId, { reliable: true });
      conn.on("open", () => track(conn));
    },
    [track],
  );

  const send = useCallback((remotePeerId: string, payload: PeerPayload) => {
    const conn = connsRef.current.get(remotePeerId);
    if (conn && conn.open) {
      conn.send(payload);
      return true;
    }
    return false;
  }, []);

  return { ready, online, connect, send };
}