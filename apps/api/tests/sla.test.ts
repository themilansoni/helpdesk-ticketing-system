import { describe, it, expect } from "vitest";
import { computeSla, formatDuration } from "@helpdesk/shared";

describe("SLA calculation", () => {
  it("reports healthy when well within the resolution window", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T01:00:00Z");
    const result = computeSla(
      {
        createdAt,
        slaFirstResponseDeadline: new Date("2026-01-01T04:00:00Z"),
        slaResolutionDeadline: new Date("2026-01-02T00:00:00Z"),
        firstRespondedAt: null,
        resolvedAt: null,
        isClosed: false,
      },
      now
    );
    expect(result.overallHealth).toBe("healthy");
    expect(result.resolutionHealth).toBe("healthy");
  });

  it("reports at_risk once 80% of the resolution window has elapsed", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const deadline = new Date("2026-01-01T10:00:00Z"); // 10h window
    const now = new Date("2026-01-01T08:30:00Z"); // 85% elapsed
    const result = computeSla(
      {
        createdAt,
        slaFirstResponseDeadline: null,
        slaResolutionDeadline: deadline,
        firstRespondedAt: null,
        resolvedAt: null,
        isClosed: false,
      },
      now
    );
    expect(result.resolutionHealth).toBe("at_risk");
    expect(result.overallHealth).toBe("at_risk");
  });

  it("reports breached once the deadline has passed with no resolution", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const deadline = new Date("2026-01-01T04:00:00Z");
    const now = new Date("2026-01-01T05:00:00Z");
    const result = computeSla(
      {
        createdAt,
        slaFirstResponseDeadline: null,
        slaResolutionDeadline: deadline,
        firstRespondedAt: null,
        resolvedAt: null,
        isClosed: false,
      },
      now
    );
    expect(result.resolutionHealth).toBe("breached");
    expect(result.overallHealth).toBe("breached");
    expect(result.resolutionMsRemaining).toBeLessThan(0);
  });

  it("marks a ticket resolved after its deadline as breached even though it is now closed", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const deadline = new Date("2026-01-01T04:00:00Z");
    const resolvedAt = new Date("2026-01-01T06:00:00Z");
    const result = computeSla({
      createdAt,
      slaFirstResponseDeadline: null,
      slaResolutionDeadline: deadline,
      firstRespondedAt: resolvedAt,
      resolvedAt,
      isClosed: true,
    });
    expect(result.resolutionHealth).toBe("breached");
  });

  it("marks a ticket resolved before its deadline as healthy, never breached, regardless of current time", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const deadline = new Date("2026-01-01T04:00:00Z");
    const resolvedAt = new Date("2026-01-01T02:00:00Z");
    const farFuture = new Date("2026-06-01T00:00:00Z");
    const result = computeSla(
      {
        createdAt,
        slaFirstResponseDeadline: null,
        slaResolutionDeadline: deadline,
        firstRespondedAt: resolvedAt,
        resolvedAt,
        isClosed: true,
      },
      farFuture
    );
    expect(result.resolutionHealth).toBe("healthy");
  });

  it("formats durations for the SLA countdown", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(90 * 60000)).toBe("1h 30m");
    expect(formatDuration(-30 * 60000)).toBe("-30m");
  });
});
