import { z } from "zod";

const parseTruthy = (value: string | undefined) => {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const rawEnvSchema = z.object({
  JINA_AUTH_DASHBOARD_API_KEY: z.string().optional(),
  COSMOS_ENABLED: z.string().optional(),
  COSMOS_ENDPOINT: z.string().optional(),
  COSMOS_KEY: z.string().optional(),
  COSMOS_DB: z.string().optional(),
  COSMOS_AUTH_MODE: z.string().optional(),
  COSMOS_CLIENT_ID: z.string().optional(),
  JINA_AUTH_BOOTSTRAP_MACHINE_TOKEN: z.string().optional(),
  JINA_AUTH_BOOTSTRAP_MACHINE_USER_ID: z.string().optional(),
  JINA_AUTH_BOOTSTRAP_MACHINE_FULL_NAME: z.string().optional(),
  JINA_AUTH_BOOTSTRAP_MACHINE_SPEED_LEVEL: z.string().optional(),
  JINA_AUTH_BOOTSTRAP_MACHINE_BALANCE: z.string().optional(),
  JINA_AUTH_DEFAULT_SPEED_LEVEL: z.string().optional(),
  JINA_AUTH_AUTHZ_RPM: z.string().optional(),
});

export type AppEnv = {
  dashboardApiKey: string;
  cosmosEnabled: boolean;
  cosmosEndpoint: string;
  cosmosKey: string;
  cosmosDb: string;
  cosmosAuthMode: "key" | "aad";
  cosmosClientId?: string;
  bootstrapMachineToken?: string;
  bootstrapMachineUserId: string;
  bootstrapMachineFullName: string;
  bootstrapMachineSpeedLevel: string;
  bootstrapMachineBalance: number;
  defaultSpeedLevel: string;
  authzRequestsPerMinute: number;
};

let cachedEnv: AppEnv | undefined;

const resolveCosmosAuthMode = (rawMode: string | undefined, cosmosKey: string): "key" | "aad" => {
  const normalized = rawMode?.trim().toLowerCase();

  if (normalized === "aad" || normalized === "msi" || normalized === "managedidentity") {
    return "aad";
  }

  if (normalized === "key") {
    return "key";
  }

  return cosmosKey === "" ? "aad" : "key";
};

const parsePositiveNumber = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return fallback;
};

export const getEnv = (): AppEnv => {
  if (cachedEnv !== undefined) {
    return cachedEnv;
  }

  const parsed = rawEnvSchema.parse(process.env);

  const dashboardApiKey = parsed.JINA_AUTH_DASHBOARD_API_KEY?.trim() ?? "";
  const cosmosEndpoint = parsed.COSMOS_ENDPOINT?.trim() ?? "";
  const cosmosKey = parsed.COSMOS_KEY?.trim() ?? "";
  const cosmosAuthMode = resolveCosmosAuthMode(parsed.COSMOS_AUTH_MODE, cosmosKey);
  const cosmosEnabled = parsed.COSMOS_ENABLED !== undefined
    ? parseTruthy(parsed.COSMOS_ENABLED)
    : (cosmosEndpoint !== "" && (cosmosKey !== "" || cosmosAuthMode === "aad"));

  cachedEnv = {
    dashboardApiKey,
    cosmosEnabled,
    cosmosEndpoint,
    cosmosKey,
    cosmosDb: parsed.COSMOS_DB?.trim() || "reader",
    cosmosAuthMode,
    cosmosClientId: parsed.COSMOS_CLIENT_ID?.trim() || undefined,
    bootstrapMachineToken: parsed.JINA_AUTH_BOOTSTRAP_MACHINE_TOKEN?.trim() || undefined,
    bootstrapMachineUserId: parsed.JINA_AUTH_BOOTSTRAP_MACHINE_USER_ID?.trim() || "datacontrol-mcp",
    bootstrapMachineFullName: parsed.JINA_AUTH_BOOTSTRAP_MACHINE_FULL_NAME?.trim() || "DataControl MCP",
    bootstrapMachineSpeedLevel: parsed.JINA_AUTH_BOOTSTRAP_MACHINE_SPEED_LEVEL?.trim() || "2",
    bootstrapMachineBalance: parsePositiveNumber(parsed.JINA_AUTH_BOOTSTRAP_MACHINE_BALANCE, 1_000_000),
    defaultSpeedLevel: parsed.JINA_AUTH_DEFAULT_SPEED_LEVEL?.trim() || "2",
    authzRequestsPerMinute: parsePositiveNumber(parsed.JINA_AUTH_AUTHZ_RPM, 0),
  };

  return cachedEnv;
};
