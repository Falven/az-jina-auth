import { requireAdminAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { toDashboardUser, topupTokenAccount } from "@/src/lib/token-store";
import { adminTopupKeySchema, parseInput } from "@/src/lib/validation";

/**
 * Top up token account balance
 * @description Increase the balance for an existing token account. Requires an admin user token.
 * @body AdminTopupRequestSchema
 * @response 200:AdminTokenAccountResponseSchema:Token account topped up
 * @auth bearer
 * @responseSet auth
 * @openapi
 */
export async function POST(request: Request) {
	return handleRoute(async () => {
		requireAdminAuthorization(request);

		const payload = await parseJsonBody<unknown>(request);
		const input = parseInput(adminTopupKeySchema, payload);

		const account = await topupTokenAccount(input.token, input.amount);

		return {
			data: {
				token: input.token,
				account: toDashboardUser(account),
			},
		};
	});
}
