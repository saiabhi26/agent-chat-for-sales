"use client";

import { useState } from "react";
import { ChatMessage, DriftAlert } from "@/app/types";
import { queryAgent, submitCorrection } from "@/lib/api";

type Props = {
  onResults: (filters: Record<string, string>) => void;
  driftAlert: DriftAlert | null;
};

export default function ChatAgent({ onResults, driftAlert }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content:
        'Hi! Ask me anything about your sales data. Try "Show me John\'s deals" or "West region transactions".',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  function addMessage(msg: Omit<ChatMessage, "id">) {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: crypto.randomUUID() },
    ]);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const query = input.trim();
    setInput("");
    setLastQuery(query);
    addMessage({ role: "user", content: query });
    setLoading(true);

    try {
      const result = await queryAgent(query);

      if (result.confidence === "low") {
        addMessage({
          role: "agent",
          content: `I'm reading this as: ${result.interpretation}. Is that right?`,
          awaitingConfirmation: true,
          pendingFilters: result.filters,
        });
      } else {
        addMessage({
          role: "agent",
          content: `${result.interpretation} — found ${result.results.length} transaction(s).`,
        });
        onResults(result.filters as Record<string, string>);
      }
    } catch {
      addMessage({ role: "agent", content: "Something went wrong. Try again." });
    }

    setLoading(false);
  }

  async function handleConfirm(msg: ChatMessage, confirmed: boolean) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, awaitingConfirmation: false } : m
      )
    );

    if (confirmed && msg.pendingFilters) {
      onResults(msg.pendingFilters as Record<string, string>);
      addMessage({ role: "agent", content: "Got it! Filters applied." });
    } else {
      addMessage({
        role: "agent",
        content: "No problem. Can you rephrase what you meant?",
      });
    }
  }

  async function handleCorrection() {
    const corrected = prompt(
      `I searched for "${lastQuery}". Who did you actually mean?`
    );
    if (!corrected) return;

    await submitCorrection(lastQuery, corrected, "sales rep");
    addMessage({
      role: "agent",
      content: `Got it. I'll remember that "${lastQuery}" means "${corrected}" next time.`,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {driftAlert && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg mb-3">
          {driftAlert.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-80">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p>{msg.content}</p>
              {msg.awaitingConfirmation && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleConfirm(msg, true)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-xs"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleConfirm(msg, false)}
                    className="bg-red-400 text-white px-3 py-1 rounded text-xs"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about your sales data..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 text-gray-900 bg-white"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          Send
        </button>
        <button
          onClick={handleCorrection}
          className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm"
          title="Correct last query"
        >
          ✏️
        </button>
      </div>
    </div>
  );
}