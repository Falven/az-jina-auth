import { getEnv } from "@/src/lib/env";
import { requireDashboardAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { handleRoute } from "@/src/lib/route-handler";
import { assertActiveTokenAccount, toDashboardUser } from "@/src/lib/token-store";
import { parseInput, tokenRequestSchema } from "@/src/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    requireDashboardAuthorization(request);

    const payload = await parseJsonBody<unknown>(request);
    const input = parseInput(tokenRequestSchema, payload);

    const env = getEnv();
    enforceRateLimit(`authorization:${input.token}`, env.authzRequestsPerMinute);

    const account = await assertActiveTokenAccount(input.token);

    return {
      data: toDashboardUser(account),
    };
  });
}
