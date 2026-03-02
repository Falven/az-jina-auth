import { requireDashboardAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { reportTokenUsage } from "@/src/lib/token-store";
import { extractTokenUsage, parseInput, usageRequestSchema } from "@/src/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    requireDashboardAuthorization(request);

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
