import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";

type SSEHandlers = {
  onTransaction?: (data: unknown) => void;
  onAnalytics?: (data: unknown) => void;
  onDrift?: (data: unknown) => void;
};

export function useSSE(handlers: SSEHandlers) {
  const handlersRef = useRef(handlers);

  // Keep the ref current without re-subscribing: the EventSource effect below
  // runs once, but must always call the latest handlers.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/api/sse`);

    es.addEventListener("transaction", (e) => {
      handlersRef.current.onTransaction?.(JSON.parse(e.data));
    });

    es.addEventListener("analytics", (e) => {
      handlersRef.current.onAnalytics?.(JSON.parse(e.data));
    });

    es.addEventListener("drift", (e) => {
      handlersRef.current.onDrift?.(JSON.parse(e.data));
    });

    // No onerror handler: EventSource reconnects automatically, and closing
    // the stream here would permanently kill it on the first transient blip.

    return () => {
      es.close();
    };
  }, []);
}