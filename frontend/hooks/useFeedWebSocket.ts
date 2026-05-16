"use client";

import { useEffect, useRef } from "react";
import { getAccessToken } from "@/lib/auth";
import { feedWebSocketUrl, type FeedWsMessage } from "@/lib/feed-realtime";

export function useFeedWebSocket(
  onMessage: (msg: FeedWsMessage) => void,
  onOpen?: () => void,
) {
  const handlerRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  handlerRef.current = onMessage;
  onOpenRef.current = onOpen;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempt = 0;

    async function connect() {
      const token = await getAccessToken();
      if (!token || cancelled) return;

      const url = feedWebSocketUrl(token);
      ws = new WebSocket(url);

      ws.onopen = () => {
        retryAttempt = 0;
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as FeedWsMessage;
          if (data.type === "pong") return;
          handlerRef.current(data);
        } catch {
          // ignore malformed payloads
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          retryAttempt += 1;
          const delay = Math.min(3000 * retryAttempt, 30000);
          retryTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);
}
