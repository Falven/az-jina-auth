import { requireAdminAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { getTokenAccountOrThrow, toDashboardUser } from "@/src/lib/token-store";
import { adminGetKeySchema, parseInput } from "@/src/lib/validation";

/**
 * Get token account
 * @description Fetch an existing token account. Requires an admin user token.
 * @body TokenRequestSchema
 * @response 200:AdminTokenAccountResponseSchema:Token account returned
 * @auth bearer
 * @responseSet auth
 * @openapi
 */
export async function POST(request: Request) {
	return handleRoute(async () => {
		requireAdminAuthorization(request);

		const payload = await parseJsonBody<unknown>(request);
		const input = parseInput(adminGetKeySchema, payload);

		const account = await getTokenAccountOrThrow(input.token);

		return {
			data: {
				token: input.token,
				account: toDashboardUser(account),
			},
		};
	});
}
