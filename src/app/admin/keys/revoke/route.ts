import { requireDashboardAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { revokeTokenAccount, toDashboardUser } from "@/src/lib/token-store";
import { adminRevokeKeySchema, parseInput } from "@/src/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    requireDashboardAuthorization(request);

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
