import type { SlaHealth } from "./constants.js";

export interface SlaInput {
  createdAt: string | Date;
  slaFirstResponseDeadline: string | Date | null;
  slaResolutionDeadline: string | Date | null;
  firstRespondedAt: string | Date | null;
  resolvedAt: string | Date | null;
  isClosed: boolean;
}

export interface SlaComputed {
  firstResponseHealth: SlaHealth;
  resolutionHealth: SlaHealth;
  resolutionPercentElapsed: number; // 0-100+ (can exceed 100 if breached)
  resolutionMsRemaining: number; // negative if breached
  overallHealth: SlaHealth;
}

const AT_RISK_THRESHOLD = 0.8; // 80% of the SLA window elapsed

function toDate(value: string | Date | null): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function computeHealth(
  createdAt: Date,
  deadline: Date | null,
  completedAt: Date | null,
  now: Date
): SlaHealth {
  if (!deadline) return "healthy";
  if (completedAt) {
    return completedAt > deadline ? "breached" : "healthy";
  }
  if (now > deadline) return "breached";
  const total = deadline.getTime() - createdAt.getTime();
  const elapsed = now.getTime() - createdAt.getTime();
  if (total <= 0) return "healthy";
  return elapsed / total >= AT_RISK_THRESHOLD ? "at_risk" : "healthy";
}

export function computeSla(input: SlaInput, now: Date = new Date()): SlaComputed {
  const createdAt = toDate(input.createdAt)!;
  const firstResponseDeadline = toDate(input.slaFirstResponseDeadline);
  const resolutionDeadline = toDate(input.slaResolutionDeadline);
  const firstRespondedAt = toDate(input.firstRespondedAt);
  const resolvedAt = toDate(input.resolvedAt);

  const firstResponseHealth = computeHealth(createdAt, firstResponseDeadline, firstRespondedAt, now);
  const resolutionHealth = input.isClosed
    ? computeHealth(createdAt, resolutionDeadline, resolvedAt, now)
    : computeHealth(createdAt, resolutionDeadline, resolvedAt, now);

  let resolutionPercentElapsed = 0;
  let resolutionMsRemaining = 0;
  if (resolutionDeadline) {
    const total = resolutionDeadline.getTime() - createdAt.getTime();
    const reference = resolvedAt ?? now;
    const elapsed = reference.getTime() - createdAt.getTime();
    resolutionPercentElapsed = total > 0 ? Math.round((elapsed / total) * 100) : 0;
    resolutionMsRemaining = resolutionDeadline.getTime() - reference.getTime();
  }

  const overallHealth: SlaHealth =
    firstResponseHealth === "breached" || resolutionHealth === "breached"
      ? "breached"
      : firstResponseHealth === "at_risk" || resolutionHealth === "at_risk"
        ? "at_risk"
        : "healthy";

  return {
    firstResponseHealth,
    resolutionHealth,
    resolutionPercentElapsed,
    resolutionMsRemaining,
    overallHealth,
  };
}

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  const sign = ms < 0 ? "-" : "";
  if (days > 0) return `${sign}${days}d ${hours}h`;
  if (hours > 0) return `${sign}${hours}h ${mins}m`;
  return `${sign}${mins}m`;
}
