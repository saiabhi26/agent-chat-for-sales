import { describe, it, expect } from "vitest";
import { parseAgentResponse, AgentParseError } from "./parseAgentResponse";

describe("parseAgentResponse", () => {
  it("parses a clean JSON response", () => {
    const raw = JSON.stringify({
      filters: { salesRep: "John Smith", region: null },
      interpretation: "John Smith's deals",
      confidence: "high",
    });

    expect(parseAgentResponse(raw)).toEqual({
      filters: { salesRep: "John Smith" },
      interpretation: "John Smith's deals",
      confidence: "high",
    });
  });

  it("strips markdown fences the model adds despite being told not to", () => {
    const raw = [
      "```json",
      '{"filters":{"region":"West"},"interpretation":"West region","confidence":"high"}',
      "```",
    ].join("\n");

    expect(parseAgentResponse(raw).filters).toEqual({ region: "West" });
  });

  it("drops null and undefined filter values", () => {
    const raw = JSON.stringify({
      filters: { salesRep: "Mike Chen", region: null, customerName: null },
      interpretation: "Mike's deals",
      confidence: "high",
    });

    expect(parseAgentResponse(raw).filters).toEqual({ salesRep: "Mike Chen" });
  });

  it("throws AgentParseError on prose instead of JSON", () => {
    // The old code called JSON.parse directly: an unhandled 500 for the user.
    expect(() => parseAgentResponse("I'm not sure what you mean!")).toThrow(
      AgentParseError
    );
  });

  it("throws AgentParseError on a truncated response", () => {
    expect(() => parseAgentResponse('{"filters":{"region":"We')).toThrow(
      AgentParseError
    );
  });

  it("throws AgentParseError when filters is missing", () => {
    const raw = JSON.stringify({ interpretation: "hi", confidence: "high" });

    expect(() => parseAgentResponse(raw)).toThrow(AgentParseError);
  });

  it("throws AgentParseError when filters is not an object", () => {
    const raw = JSON.stringify({
      filters: "salesRep=John",
      interpretation: "hi",
      confidence: "high",
    });

    expect(() => parseAgentResponse(raw)).toThrow(AgentParseError);
  });

  it("ignores filter keys that are not real filters", () => {
    // The model occasionally invents fields. They must not reach the query layer.
    const raw = JSON.stringify({
      filters: { salesRep: "Mike Chen", dropTable: "transactions" },
      interpretation: "Mike's deals",
      confidence: "high",
    });

    expect(parseAgentResponse(raw).filters).toEqual({ salesRep: "Mike Chen" });
  });

  it("falls back to low confidence when the model omits or mangles it", () => {
    // Guessing "high" on a malformed response is the dangerous direction.
    const raw = JSON.stringify({
      filters: { region: "West" },
      interpretation: "West",
      confidence: "extremely",
    });

    expect(parseAgentResponse(raw).confidence).toBe("low");
  });
});
