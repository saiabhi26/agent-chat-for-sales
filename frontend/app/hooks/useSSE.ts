import { useEffect, useRef } from "react";

type SSEHandlers = {
  onTransaction?: (data: unknown) => void;
  onAnalytics?: (data: unknown) => void;
  onDrift?: (data: unknown) => void;
};

export function useSSE(handlers: SSEHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const es = new EventSource("http://localhost:3001/api/sse");

    es.addEventListener("transaction", (e) => {
      handlersRef.current.onTransaction?.(JSON.parse(e.data));
    });

    es.addEventListener("analytics", (e) => {
      handlersRef.current.onAnalytics?.(JSON.parse(e.data));
    });

    es.addEventListener("drift", (e) => {
      handlersRef.current.onDrift?.(JSON.parse(e.data));
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, []);
}