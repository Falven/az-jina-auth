import { createHash, randomBytes } from "node:crypto";

import { HttpError } from "./errors";
import { getEnv } from "./env";
import { getTokensContainer } from "./cosmos";
import type {
  CustomRateLimits,
  JinaDashboardUser,
  TokenAccountDocument,
  TokenMetadata,
  TokenWallet,
} from "./types";

const nowIso = () => new Date().toISOString();

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
};

const normalizeWallet = (value: unknown): TokenWallet => {
  const source = asRecord(value) ?? {};

  const totalBalance = toNumber(source.total_balance, 0);
  const totalUsed = toNumber(source.total_used, 0);

  if (totalUsed > 0) {
    return {
      total_balance: totalBalance,
      total_used: totalUsed,
    };
  }

  return {
    total_balance: totalBalance,
  };
};

const normalizeMetadata = (value: unknown): TokenMetadata => {
  const source = asRecord(value) ?? {};
  const metadata: TokenMetadata = { ...source };

  if (typeof metadata.speed_level === "number") {
    metadata.speed_level = String(metadata.speed_level);
  }

  if (typeof metadata.speed_level !== "string") {
    metadata.speed_level = getEnv().defaultSpeedLevel;
  }

  return metadata;
};

const normalizeCustomRateLimits = (value: unknown): CustomRateLimits | undefined => {
  const source = asRecord(value);
  if (!source) {
    return undefined;
  }

  const normalized: CustomRateLimits = {};

  for (const [key, rawRules] of Object.entries(source)) {
    if (!Array.isArray(rawRules)) {
      continue;
    }

    const rules = rawRules
      .map((candidate) => {
        const record = asRecord(candidate);
        if (!record) {
          return undefined;
        }

        const occurrence = toNumber(record.occurrence, NaN);
        const periodSeconds = toNumber(record.periodSeconds, NaN);
        if (!Number.isFinite(occurrence) || !Number.isFinite(periodSeconds)) {
          return undefined;
        }

        return {
          occurrence,
          periodSeconds,
          effectiveFrom: typeof record.effectiveFrom === "string" ? record.effectiveFrom : undefined,
          expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : undefined,
        };
      })
      .filter((rule): rule is NonNullable<typeof rule> => rule !== undefined);

    if (rules.length > 0) {
      normalized[key] = rules;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeTokenAccount = (token: string, raw: Record<string, unknown>): TokenAccountDocument => {
  const id = typeof raw.id === "string" && raw.id.length > 0 ? raw.id : token;
  const statusRaw = typeof raw.status === "string" ? raw.status : "active";
  const status = statusRaw === "revoked" ? "revoked" : "active";
  const wallet = normalizeWallet(raw.wallet);

  return {
    id,
    _id: typeof raw._id === "string" && raw._id.length > 0 ? raw._id : id,
    _etag: typeof raw._etag === "string" && raw._etag.length > 0 ? raw._etag : undefined,
    token_hash: typeof raw.token_hash === "string" && raw.token_hash.length > 0 ? raw.token_hash : hashToken(token),
    status,
    user_id: typeof raw.user_id === "string" && raw.user_id.length > 0 ? raw.user_id : token,
    full_name: typeof raw.full_name === "string" && raw.full_name.length > 0 ? raw.full_name : token,
    wallet,
    metadata: normalizeMetadata(raw.metadata),
    customRateLimits: normalizeCustomRateLimits(raw.customRateLimits),
    createdAt: typeof raw.createdAt === "string" && raw.createdAt.length > 0 ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" && raw.updatedAt.length > 0 ? raw.updatedAt : nowIso(),
    revokedAt: typeof raw.revokedAt === "string" ? raw.revokedAt : undefined,
  };
};

const resolveStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("code" in error && typeof (error as { code?: unknown }).code === "number") {
    return (error as { code: number }).code;
  }

  if ("statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number") {
    return (error as { statusCode: number }).statusCode;
  }

  return undefined;
};

const readTokenRecord = async (token: string): Promise<TokenAccountDocument | undefined> => {
  const container = getTokensContainer();

  try {
    const { resource } = await container.item(token, token).read<Record<string, unknown>>();
    if (!resource) {
      return undefined;
    }

    return normalizeTokenAccount(token, resource);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 404) {
      return undefined;
    }

    throw error;
  }
};

const queryTokenRecord = async (token: string): Promise<TokenAccountDocument | undefined> => {
  const container = getTokensContainer();
  const { resources } = await container.items
    .query<Record<string, unknown>>({
      query: "SELECT TOP 1 * FROM c WHERE c.id = @token OR c._id = @token",
      parameters: [{ name: "@token", value: token }],
    })
    .fetchAll();

  const resource = resources[0];
  if (!resource) {
    return undefined;
  }

  return normalizeTokenAccount(token, resource);
};

const upsertTokenRecord = async (record: TokenAccountDocument): Promise<TokenAccountDocument> => {
  const container = getTokensContainer();
  const { resource } = await container.items.upsert(record);
  const resolved = (resource ?? record) as Record<string, unknown>;

  return normalizeTokenAccount(record.id, resolved);
};

export const generateOpaqueToken = (): string => {
  const suffix = randomBytes(24).toString("base64url");
  return `jina_${suffix}`;
};

export const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const toDashboardUser = (account: TokenAccountDocument): JinaDashboardUser => {
  return {
    user_id: account.user_id,
    full_name: account.full_name,
    wallet: account.wallet,
    metadata: account.metadata,
    customRateLimits: account.customRateLimits,
  };
};

export const getTokenAccount = async (token: string): Promise<TokenAccountDocument | undefined> => {
  const byId = await readTokenRecord(token);
  if (byId) {
    return byId;
  }

  return queryTokenRecord(token);
};

export const getTokenAccountOrThrow = async (token: string): Promise<TokenAccountDocument> => {
  const existing = await getTokenAccount(token);
  if (existing) {
    return existing;
  }

  throw new HttpError(401, "invalid_api_key", "Invalid API key");
};

export const assertActiveTokenAccount = async (token: string): Promise<TokenAccountDocument> => {
  const account = await getTokenAccountOrThrow(token);

  if (account.status !== "active") {
    throw new HttpError(401, "revoked_api_key", "This API key is revoked");
  }

  return account;
};

export type CreateTokenAccountInput = {
  token?: string;
  userId?: string;
  fullName?: string;
  speedLevel?: string;
  balance?: number;
  metadata?: TokenMetadata;
  customRateLimits?: CustomRateLimits;
};

export const createTokenAccount = async (
  input: CreateTokenAccountInput,
): Promise<{ token: string; account: TokenAccountDocument }> => {
  const env = getEnv();
  const token = input.token ?? generateOpaqueToken();
  const existing = await getTokenAccount(token);
  if (existing) {
    throw new HttpError(409, "token_exists", "Token already exists");
  }

  const now = nowIso();
  const speedLevel = input.speedLevel ?? env.defaultSpeedLevel;
  const metadata: TokenMetadata = {
    ...(input.metadata ?? {}),
    speed_level: speedLevel,
  };

  const account: TokenAccountDocument = {
    id: token,
    _id: token,
    token_hash: hashToken(token),
    status: "active",
    user_id: input.userId ?? `user_${token.slice(0, 8)}`,
    full_name: input.fullName ?? input.userId ?? `user_${token.slice(0, 8)}`,
    wallet: {
      total_balance: input.balance ?? 0,
      total_used: 0,
    },
    metadata,
    customRateLimits: input.customRateLimits,
    createdAt: now,
    updatedAt: now,
  };

  const saved = await upsertTokenRecord(account);
  return { token, account: saved };
};

export const revokeTokenAccount = async (token: string): Promise<TokenAccountDocument> => {
  const existing = await getTokenAccountOrThrow(token);

  const revoked: TokenAccountDocument = {
    ...existing,
    status: "revoked",
    revokedAt: nowIso(),
    updatedAt: nowIso(),
  };

  return upsertTokenRecord(revoked);
};

export const topupTokenAccount = async (token: string, amount: number): Promise<TokenAccountDocument> => {
  const existing = await getTokenAccountOrThrow(token);

  const updatedTotalUsed = typeof existing.wallet.total_used === "number" ? existing.wallet.total_used : 0;
  const updated: TokenAccountDocument = {
    ...existing,
    wallet: {
      total_balance: existing.wallet.total_balance + amount,
      total_used: updatedTotalUsed,
    },
    updatedAt: nowIso(),
  };

  return upsertTokenRecord(updated);
};

export const reportTokenUsage = async (
  token: string,
  usageTokens: number,
): Promise<TokenAccountDocument> => {
  const container = getTokensContainer();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await assertActiveTokenAccount(token);

    if (usageTokens <= 0) {
      return existing;
    }

    if (existing.wallet.total_balance < usageTokens) {
      throw new HttpError(402, "insufficient_balance", "Insufficient balance");
    }

    if (!existing._etag) {
      throw new HttpError(
        500,
        "missing_etag",
        "Token document is missing _etag required for usage updates",
      );
    }

    const totalUsed = typeof existing.wallet.total_used === "number" ? existing.wallet.total_used : 0;
    const nextDoc: TokenAccountDocument = {
      ...existing,
      wallet: {
        total_balance: existing.wallet.total_balance - usageTokens,
        total_used: totalUsed + usageTokens,
      },
      updatedAt: nowIso(),
    };

    try {
      const { resource } = await container.item(token, token).replace(nextDoc, {
        accessCondition: {
          type: "IfMatch",
          condition: existing._etag,
        },
      });

      return normalizeTokenAccount(token, (resource ?? nextDoc) as Record<string, unknown>);
    } catch (error) {
      const statusCode = resolveStatusCode(error);
      if (statusCode === 412) {
        continue;
      }

      throw error;
    }
  }

  throw new HttpError(
    409,
    "concurrency_conflict",
    "Failed to update usage due to concurrent writes. Retry the request.",
  );
};
