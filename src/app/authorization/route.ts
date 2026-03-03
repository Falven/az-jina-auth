import { requireServiceOrAdminAuthorization } from "@/src/lib/auth";
import { getEnv } from "@/src/lib/env";
import { parseJsonBody } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { handleRoute } from "@/src/lib/route-handler";
import {
	assertActiveTokenAccount,
	toDashboardUser,
} from "@/src/lib/token-store";
import { parseInput, tokenRequestSchema } from "@/src/lib/validation";

/**
 * Authorize token
 * @description Resolve an active token account. Requires an allowlisted service principal token or admin user token.
 * @body TokenRequestSchema
 * @response 200:AuthorizationResponseSchema:Token account resolved
 * @auth bearer
 * @responseSet auth
 * @openapi
 */
export async function POST(request: Request) {
	return handleRoute(async () => {
		requireServiceOrAdminAuthorization(request);

		const payload = await parseJsonBody<unknown>(request);
		const input = parseInput(tokenRequestSchema, payload);

		const env = getEnv();
		enforceRateLimit(
			`authorization:${input.token}`,
			env.authzRequestsPerMinute,
		);

		const account = await assertActiveTokenAccount(input.token);

		return {
			data: toDashboardUser(account),
		};
	});
}
