import { z } from "zod";

import { HttpError } from "./errors";
import type { CustomRateLimits } from "./types";

const tokenSchema = z.string().trim().min(1, "token is required");

const rateLimitRuleSchema = z.object({
  occurrence: z.number().int().positive(),
  periodSeconds: z.number().int().positive(),
  effectiveFrom: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

const customRateLimitsSchema = z.record(z.array(rateLimitRuleSchema));

export const tokenRequestSchema = z.object({
  token: tokenSchema,
});

export const usageRequestSchema = z
  .object({
    token: tokenSchema,
    usage: z
      .object({
        total_tokens: z.number().finite().nonnegative().optional(),
      })
      .optional(),
    total_tokens: z.number().finite().nonnegative().optional(),
    token_count: z.number().finite().nonnegative().optional(),
    tokens: z.number().finite().nonnegative().optional(),
  })
  .passthrough();

export const adminCreateKeySchema = z
  .object({
    token: tokenSchema.optional(),
    user_id: z.string().trim().min(1).optional(),
    full_name: z.string().trim().min(1).optional(),
    speed_level: z.string().trim().min(1).optional(),
    balance: z.number().finite().nonnegative().optional(),
    metadata: z.record(z.unknown()).optional(),
    customRateLimits: customRateLimitsSchema.optional(),
  })
  .passthrough();

export const adminRevokeKeySchema = z.object({
  token: tokenSchema,
});

export const adminTopupKeySchema = z.object({
  token: tokenSchema,
  amount: z.number().finite().positive(),
});

export const adminGetKeySchema = z.object({
  token: tokenSchema,
});

export const parseInput = <T>(schema: z.Schema<T>, payload: unknown): T => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new HttpError(400, "invalid_request", "Request validation failed", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return result.data;
};

export const extractTokenUsage = (payload: z.infer<typeof usageRequestSchema>): number => {
  if (typeof payload.usage?.total_tokens === "number") {
    return payload.usage.total_tokens;
  }

  if (typeof payload.total_tokens === "number") {
    return payload.total_tokens;
  }

  if (typeof payload.token_count === "number") {
    return payload.token_count;
  }

  if (typeof payload.tokens === "number") {
    return payload.tokens;
  }

  return 0;
};

export const toCustomRateLimits = (
  input: z.infer<typeof customRateLimitsSchema> | undefined,
): CustomRateLimits | undefined => {
  if (!input) {
    return undefined;
  }

  return input;
};
