import { z } from "zod";

const rawEnvSchema = z.object({
	JINA_AUTH_ENTRA_TENANT_ID: z.string().optional(),
	JINA_AUTH_ENTRA_ISSUER: z.string().optional(),
	JINA_AUTH_ENTRA_AUDIENCES: z.string().optional(),
	JINA_AUTH_ADMIN_ROLE: z.string().optional(),
	JINA_AUTH_SERVICE_APP_IDS: z.string().optional(),
	COSMOS_ENDPOINT: z.string().optional(),
	COSMOS_DB: z.string().optional(),
	COSMOS_CLIENT_ID: z.string().optional(),
	JINA_AUTH_DEFAULT_SPEED_LEVEL: z.string().optional(),
	JINA_AUTH_AUTHZ_RPM: z.string().optional(),
});

export type AppEnv = {
	entraTenantId: string;
	entraIssuer: string;
	entraAudiences: string[];
	adminRole: string;
	serviceAppIds: string[];
	cosmosEndpoint: string;
	cosmosDb: string;
	cosmosClientId?: string;
	defaultSpeedLevel: string;
	authzRequestsPerMinute: number;
};

let cachedEnv: AppEnv | undefined;

type ParseCommaSeparatedValuesOptions = {
	lowercase?: boolean;
};

const parsePositiveNumber = (raw: string | undefined, fallback: number) => {
	const parsed = Number(raw);
	if (Number.isFinite(parsed) && parsed >= 0) {
		return parsed;
	}

	return fallback;
};

const parseCommaSeparatedValues = (
	raw: string | undefined,
	options: ParseCommaSeparatedValuesOptions = {},
): string[] => {
	if (!raw) {
		return [];
	}

	const { lowercase = false } = options;

	return raw
		.split(",")
		.map((value) => value.trim())
		.map((value) => (lowercase ? value.toLowerCase() : value))
		.filter((value) => value.length > 0);
};

export const getEnv = (): AppEnv => {
	if (cachedEnv !== undefined) {
		return cachedEnv;
	}

	const parsed = rawEnvSchema.parse(process.env);

	const cosmosEndpoint = parsed.COSMOS_ENDPOINT?.trim() ?? "";
	if (cosmosEndpoint === "") {
		throw new Error(
			"COSMOS_ENDPOINT is required. Cosmos DB is mandatory and uses managed identity auth.",
		);
	}

	cachedEnv = {
		entraTenantId: parsed.JINA_AUTH_ENTRA_TENANT_ID?.trim() ?? "",
		entraIssuer: parsed.JINA_AUTH_ENTRA_ISSUER?.trim() ?? "",
		entraAudiences: parseCommaSeparatedValues(parsed.JINA_AUTH_ENTRA_AUDIENCES),
		adminRole: parsed.JINA_AUTH_ADMIN_ROLE?.trim() || "az_jina_auth_admin",
		serviceAppIds: parseCommaSeparatedValues(parsed.JINA_AUTH_SERVICE_APP_IDS, {
			lowercase: true,
		}),
		cosmosEndpoint,
		cosmosDb: parsed.COSMOS_DB?.trim() || "reader",
		cosmosClientId: parsed.COSMOS_CLIENT_ID?.trim() || undefined,
		defaultSpeedLevel: parsed.JINA_AUTH_DEFAULT_SPEED_LEVEL?.trim() || "2",
		authzRequestsPerMinute: parsePositiveNumber(parsed.JINA_AUTH_AUTHZ_RPM, 0),
	};

	return cachedEnv;
};
