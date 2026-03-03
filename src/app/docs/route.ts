import { ApiReference } from "@scalar/nextjs-api-reference";
import { requireTenantUserAuthorization } from "@/src/lib/auth";

const docsHandler = ApiReference({
	theme: "kepler",
	layout: "modern",
	darkMode: false,
	url: "/openapi.json",
	pageTitle: "az-jina-auth API Docs",
	metaData: {
		title: "az-jina-auth API Docs",
		description:
			"Interactive OpenAPI reference for the DataControl Jina-compatible auth service.",
	},
});

export async function GET(request: Request) {
	requireTenantUserAuthorization(request);
	return docsHandler();
}
