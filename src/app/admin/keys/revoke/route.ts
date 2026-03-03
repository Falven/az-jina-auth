import { requireAdminAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { revokeTokenAccount, toDashboardUser } from "@/src/lib/token-store";
import { adminRevokeKeySchema, parseInput } from "@/src/lib/validation";

/**
 * Revoke token account
 * @description Revoke an existing token account. Requires an admin user token.
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
		const input = parseInput(adminRevokeKeySchema, payload);

		const account = await revokeTokenAccount(input.token);

		return {
			data: {
				token: input.token,
				account: toDashboardUser(account),
			},
		};
	});
}
