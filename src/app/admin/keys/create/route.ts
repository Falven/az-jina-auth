import { requireAdminAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { createTokenAccount, toDashboardUser } from "@/src/lib/token-store";
import {
	adminCreateKeySchema,
	parseInput,
	toCustomRateLimits,
} from "@/src/lib/validation";

/**
 * Create token account
 * @description Create a new token account. Requires an admin user token.
 * @body AdminCreateKeyRequestSchema
 * @response 200:AdminTokenAccountResponseSchema:Token account created
 * @auth bearer
 * @responseSet auth
 * @add 409:ErrorResponseSchema:Token already exists
 * @openapi
 */
export async function POST(request: Request) {
	return handleRoute(async () => {
		requireAdminAuthorization(request);

		const payload = await parseJsonBody<unknown>(request);
		const input = parseInput(adminCreateKeySchema, payload);

		const created = await createTokenAccount({
			token: input.token,
			userId: input.user_id,
			fullName: input.full_name,
			speedLevel: input.speed_level,
			balance: input.balance,
			metadata: input.metadata,
			customRateLimits: toCustomRateLimits(input.customRateLimits),
		});

		return {
			data: {
				token: created.token,
				account: toDashboardUser(created.account),
			},
		};
	});
}
