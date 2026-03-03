import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { requireTenantUserAuthorization } from "@/src/lib/auth";

export async function GET(request: Request) {
	requireTenantUserAuthorization(request);

	const filePath = join(process.cwd(), "public", "openapi.json");
	const openApiDocument = await readFile(filePath, "utf8");

	return new Response(openApiDocument, {
		status: 200,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
