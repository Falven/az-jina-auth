import { requireServiceOrAdminAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { reportTokenUsage } from "@/src/lib/token-store";
import {
	extractTokenUsage,
	parseInput,
	usageRequestSchema,
} from "@/src/lib/validation";

/**
 * Report usage debit
 * @description Debit usage tokens from an active token account. Requires an allowlisted service principal token or admin user token.
 * @body UsageRequestSchema
 * @response 200:UsageResponseSchema:Usage reported
 * @auth bearer
 * @responseSet auth
 * @add 402:ErrorResponseSchema:Insufficient balance
 * @openapi
 */
export async function POST(request: Request) {
	return handleRoute(async () => {
		requireServiceOrAdminAuthorization(request);

		const payload = await parseJsonBody<unknown>(request);
		const input = parseInput(usageRequestSchema, payload);

		const usageTokens = extractTokenUsage(input);
		const updatedAccount = await reportTokenUsage(input.token, usageTokens);

		return {
			data: {
				ok: true,
				debited_tokens: usageTokens,
				wallet: updatedAccount.wallet,
			},
		};
	});
}
