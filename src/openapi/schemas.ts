import { z } from "zod";

export const TokenRequestSchema = z.object({
  token: z.string().trim().min(1, "token is required"),
});

export const UsageRequestSchema = z
  .object({
    token: z.string().trim().min(1, "token is required"),
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

const RateLimitRuleSchema = z.object({
  occurrence: z.number().int().positive(),
  periodSeconds: z.number().int().positive(),
  effectiveFrom: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

const CustomRateLimitsSchema = z.record(z.array(RateLimitRuleSchema));

const TokenWalletSchema = z
  .object({
    total_balance: z.number().finite(),
    total_used: z.number().finite().optional(),
  })
  .passthrough();

export const TokenAccountSchema = z
  .object({
    user_id: z.string(),
    full_name: z.string(),
    wallet: TokenWalletSchema,
    metadata: z.record(z.unknown()),
    customRateLimits: CustomRateLimitsSchema.optional(),
  })
  .passthrough();

export const ErrorResponseSchema = z.object({
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .passthrough(),
});

export const AuthorizationResponseSchema = z.object({
  data: TokenAccountSchema,
});

export const UsageResponseSchema = z.object({
  data: z.object({
    ok: z.boolean(),
    debited_tokens: z.number().finite(),
    wallet: TokenWalletSchema,
  }),
});

export const AdminTokenAccountResponseSchema = z.object({
  data: z.object({
    token: z.string(),
    account: TokenAccountSchema,
  }),
});

export const AdminCreateKeyRequestSchema = z
  .object({
    token: z.string().trim().min(1).optional(),
    user_id: z.string().trim().min(1).optional(),
    full_name: z.string().trim().min(1).optional(),
    speed_level: z.string().trim().min(1).optional(),
    balance: z.number().finite().nonnegative().optional(),
    metadata: z.record(z.unknown()).optional(),
    customRateLimits: CustomRateLimitsSchema.optional(),
  })
  .passthrough();

export const AdminTopupRequestSchema = z.object({
  token: z.string().trim().min(1, "token is required"),
  amount: z.number().finite().positive(),
});

export const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  timestamp: z.string().datetime(),
});
