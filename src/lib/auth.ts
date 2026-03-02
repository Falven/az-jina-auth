import { HttpError } from "./errors";
import { getEnv } from "./env";
import { parseBearerToken, secureCompare } from "./http";

export const requireDashboardAuthorization = (request: Request): void => {
  const env = getEnv();

  if (env.dashboardApiKey === "") {
    throw new HttpError(
      500,
      "dashboard_api_key_missing",
      "JINA_AUTH_DASHBOARD_API_KEY is not configured",
    );
  }

  const providedToken = parseBearerToken(request.headers.get("authorization"));
  if (!providedToken || !secureCompare(providedToken, env.dashboardApiKey)) {
    throw new HttpError(401, "unauthorized", "Invalid dashboard API key");
  }
};
