import { useEffect, useRef, useState } from "react";
import { useTerminalStore } from "../store";
import { WS_SERVER } from "../lib/server";

type WsStatus = "connecting" | "connected" | "disconnected";

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const { updateTicks, setAuth, isAuthenticated } = useTerminalStore();

  useEffect(() => {

    const WS_URL = WS_SERVER;

    function connect() {
      setStatus("connecting");
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => setStatus("connected");

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          switch (msg.type) {
            case "ticks":
              updateTicks(msg.data);
              break;
            case "authenticated":
              setAuth(true, msg.data?.profile);
              break;
          }
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        setStatus("disconnected");
        setTimeout(connect, 3000);
      };

      socket.onerror = () => socket.close();
    }

    connect();
    return () => {
      ws.current?.close();
    };
  }, []);

  function subscribe(tokens: number[]) {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "subscribe", tokens }));
    }
  }

  function unsubscribe(tokens: number[]) {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "unsubscribe", tokens }));
    }
  }

  return { status, subscribe, unsubscribe, isAuthenticated };
}
