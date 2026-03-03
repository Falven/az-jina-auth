import { Buffer } from "node:buffer";
import { getEnv } from "./env";
import { HttpError } from "./errors";

type ClaimsMap = Record<string, string[]>;

type PrincipalContext = {
	claims: ClaimsMap;
	roles: Set<string>;
	rolesLower: Set<string>;
	tenantId?: string;
	issuer?: string;
	audience?: string;
	appId?: string;
	isServicePrincipal: boolean;
};

type MsClientPrincipalClaim = {
	typ?: unknown;
	val?: unknown;
};

type MsClientPrincipal = {
	claims?: unknown;
};

const CLAIM_ROLE_TYPES = [
	"roles",
	"role",
	"http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
];

const CLAIM_TENANT_ID_TYPES = [
	"tid",
	"http://schemas.microsoft.com/identity/claims/tenantid",
];

const CLAIM_APP_ID_TYPES = ["appid", "azp"];
const CLAIM_ID_TYPE_TYPES = ["idtyp"];
const CLAIM_USER_HINT_TYPES = ["preferred_username", "upn", "email"];
const CLAIM_ISSUER_TYPES = ["iss"];
const CLAIM_AUDIENCE_TYPES = ["aud"];

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}

	return undefined;
};

const decodeClientPrincipalHeader = (
	headerValue: string,
): MsClientPrincipal | undefined => {
	const candidates = [headerValue];

	try {
		candidates.push(Buffer.from(headerValue, "base64").toString("utf8"));
	} catch {
		// Header may already be plain JSON if it is forwarded by a local proxy.
	}

	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate) as unknown;
			const record = asRecord(parsed);
			if (record) {
				return record as MsClientPrincipal;
			}
		} catch {
			// Continue trying fallback candidate payloads.
		}
	}

	return undefined;
};

const addClaimValue = (
	claims: ClaimsMap,
	rawType: unknown,
	rawValue: unknown,
) => {
	if (typeof rawType !== "string" || typeof rawValue !== "string") {
		return;
	}

	const claimType = rawType.trim().toLowerCase();
	const claimValue = rawValue.trim();
	if (claimType === "" || claimValue === "") {
		return;
	}

	const existing = claims[claimType];
	if (existing) {
		existing.push(claimValue);
		return;
	}

	claims[claimType] = [claimValue];
};

const toClaimsMap = (principal: MsClientPrincipal): ClaimsMap => {
	const claims: ClaimsMap = {};
	if (!Array.isArray(principal.claims)) {
		return claims;
	}

	for (const item of principal.claims) {
		const record = asRecord(item) as MsClientPrincipalClaim | undefined;
		if (!record) {
			continue;
		}

		addClaimValue(claims, record.typ, record.val);
	}

	return claims;
};

const getClaimValues = (claims: ClaimsMap, keys: string[]): string[] => {
	for (const key of keys) {
		const values = claims[key.toLowerCase()];
		if (values && values.length > 0) {
			return values;
		}
	}

	return [];
};

const getFirstClaim = (
	claims: ClaimsMap,
	keys: string[],
): string | undefined => {
	const values = getClaimValues(claims, keys);
	return values[0];
};

const toRoleSets = (roles: string[]) => {
	const roleSet = new Set<string>();
	const roleLowerSet = new Set<string>();

	for (const role of roles) {
		roleSet.add(role);
		roleLowerSet.add(role.toLowerCase());
	}

	return { roleSet, roleLowerSet };
};

const resolvePrincipal = (request: Request): PrincipalContext => {
	const header = request.headers.get("x-ms-client-principal");
	if (!header) {
		throw new HttpError(
			401,
			"unauthorized",
			"Missing validated Entra principal. Configure App Service or APIM authentication.",
		);
	}

	const principal = decodeClientPrincipalHeader(header);
	if (!principal) {
		throw new HttpError(
			401,
			"unauthorized",
			"Invalid Entra principal header format",
		);
	}

	const claims = toClaimsMap(principal);
	const roles = getClaimValues(claims, CLAIM_ROLE_TYPES);
	const { roleSet, roleLowerSet } = toRoleSets(roles);
	const appId = getFirstClaim(claims, CLAIM_APP_ID_TYPES);
	const idType = getFirstClaim(claims, CLAIM_ID_TYPE_TYPES)?.toLowerCase();
	const userHint = getFirstClaim(claims, CLAIM_USER_HINT_TYPES);
	const isServicePrincipal =
		idType === "app" || (appId !== undefined && userHint === undefined);

	return {
		claims,
		roles: roleSet,
		rolesLower: roleLowerSet,
		tenantId: getFirstClaim(claims, CLAIM_TENANT_ID_TYPES),
		issuer: getFirstClaim(claims, CLAIM_ISSUER_TYPES),
		audience: getFirstClaim(claims, CLAIM_AUDIENCE_TYPES),
		appId,
		isServicePrincipal,
	};
};

const assertTenantIssuerAudience = (principal: PrincipalContext) => {
	const env = getEnv();

	if (env.entraTenantId && principal.tenantId !== env.entraTenantId) {
		throw new HttpError(403, "forbidden_tenant", "Token tenant is not allowed");
	}

	if (
		env.entraIssuer &&
		principal.issuer &&
		!principal.issuer.startsWith(env.entraIssuer)
	) {
		throw new HttpError(403, "forbidden_issuer", "Token issuer is not allowed");
	}

	if (
		env.entraAudience &&
		principal.audience &&
		principal.audience !== env.entraAudience
	) {
		throw new HttpError(
			403,
			"forbidden_audience",
			"Token audience is not allowed",
		);
	}
};

const hasAdminRole = (principal: PrincipalContext): boolean => {
	const adminRole = getEnv().adminRole;
	return principal.rolesLower.has(adminRole.toLowerCase());
};

const assertTenantUserPrincipal = (principal: PrincipalContext) => {
	assertTenantIssuerAudience(principal);

	if (principal.isServicePrincipal) {
		throw new HttpError(
			403,
			"forbidden_user_required",
			"Signed-in user identity is required",
		);
	}
};

const isAllowedServicePrincipal = (principal: PrincipalContext): boolean => {
	const env = getEnv();
	if (!principal.isServicePrincipal || !principal.appId) {
		return false;
	}

	if (env.serviceAppIds.length === 0) {
		throw new HttpError(
			500,
			"service_app_ids_missing",
			"JINA_AUTH_SERVICE_APP_IDS is not configured",
		);
	}

	return env.serviceAppIds.includes(principal.appId.toLowerCase());
};

export const requireTenantUserAuthorization = (request: Request): void => {
	const principal = resolvePrincipal(request);
	assertTenantUserPrincipal(principal);
};

export const requireAdminAuthorization = (request: Request): void => {
	const principal = resolvePrincipal(request);
	assertTenantUserPrincipal(principal);

	if (!hasAdminRole(principal)) {
		throw new HttpError(
			403,
			"forbidden_admin_role_missing",
			"Admin role is required",
		);
	}
};

export const requireServiceOrAdminAuthorization = (request: Request): void => {
	const principal = resolvePrincipal(request);
	assertTenantIssuerAudience(principal);

	if (isAllowedServicePrincipal(principal)) {
		return;
	}

	if (!principal.isServicePrincipal && hasAdminRole(principal)) {
		return;
	}

	throw new HttpError(
		403,
		"forbidden_caller",
		"Caller is not authorized for this endpoint",
	);
};
