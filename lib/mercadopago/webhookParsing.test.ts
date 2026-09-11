import { describe, expect, it } from "vitest";
import { parseMercadoPagoWebhookEvent, webhookResourceType } from "./webhookParsing";

describe("parseMercadoPagoWebhookEvent", () => {
  it("parses a payment notification envelope", () => {
    const raw = JSON.stringify({ id: 12345, type: "payment", action: "payment.created", data: { id: "999" }, live_mode: false });
    const event = parseMercadoPagoWebhookEvent(raw);
    expect(event).toEqual({ id: 12345, type: "payment", action: "payment.created", data: { id: "999" }, live_mode: false });
  });

  it("accepts the older `topic` field in place of `type`", () => {
    const raw = JSON.stringify({ topic: "payment", data: { id: "999" } });
    const event = parseMercadoPagoWebhookEvent(raw);
    expect(event).not.toBeNull();
    expect(webhookResourceType(event!)).toBe("payment");
  });

  it("returns null for malformed JSON", () => {
    expect(parseMercadoPagoWebhookEvent("not json")).toBeNull();
  });

  it("returns null when data.id is missing", () => {
    expect(parseMercadoPagoWebhookEvent(JSON.stringify({ type: "payment" }))).toBeNull();
  });
});
