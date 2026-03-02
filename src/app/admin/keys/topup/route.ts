import { requireDashboardAuthorization } from "@/src/lib/auth";
import { parseJsonBody } from "@/src/lib/http";
import { handleRoute } from "@/src/lib/route-handler";
import { topupTokenAccount, toDashboardUser } from "@/src/lib/token-store";
import { adminTopupKeySchema, parseInput } from "@/src/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    requireDashboardAuthorization(request);

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
