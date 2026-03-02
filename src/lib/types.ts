export type TokenStatus = "active" | "revoked";

export type RateLimitRule = {
  occurrence: number;
  periodSeconds: number;
  effectiveFrom?: string;
  expiresAt?: string;
};

export type CustomRateLimits = Record<string, RateLimitRule[]>;

export type TokenWallet = {
  total_balance: number;
  total_used?: number;
};

export type TokenMetadata = Record<string, unknown>;

export type TokenAccountDocument = {
  id: string;
  _id: string;
  token_hash: string;
  status: TokenStatus;
  user_id: string;
  full_name: string;
  wallet: TokenWallet;
  metadata: TokenMetadata;
  customRateLimits?: CustomRateLimits;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
};

export type JinaDashboardUser = {
  user_id: string;
  full_name: string;
  wallet: TokenWallet;
  metadata: TokenMetadata;
  customRateLimits?: CustomRateLimits;
};
