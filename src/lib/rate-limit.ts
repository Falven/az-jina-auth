import { HttpError } from "./errors";

const windows = new Map<string, { startedAt: number; count: number }>();

export const enforceRateLimit = (
  key: string,
  requestsPerMinute: number,
): void => {
  if (requestsPerMinute <= 0) {
    return;
  }

  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now - existing.startedAt >= 60_000) {
    windows.set(key, { startedAt: now, count: 1 });
    return;
  }

  if (existing.count >= requestsPerMinute) {
    throw new HttpError(429, "rate_limited", "Rate limit exceeded");
  }

  existing.count += 1;
  windows.set(key, existing);
};
