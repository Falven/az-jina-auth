import { CosmosClient, type Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

import { getEnv } from "./env";
import { HttpError } from "./errors";

const TOKENS_CONTAINER = "jinaEmbeddingsTokenAccounts";

let cachedClient: CosmosClient | undefined;
let cachedContainer: Container | undefined;

const createCosmosClient = (): CosmosClient => {
  const env = getEnv();

  if (!env.cosmosEnabled) {
    throw new HttpError(503, "cosmos_disabled", "Cosmos DB integration is disabled");
  }

  if (env.cosmosEndpoint === "") {
    throw new HttpError(500, "cosmos_endpoint_missing", "COSMOS_ENDPOINT is not configured");
  }

  if (env.cosmosAuthMode === "aad") {
    const credential = new DefaultAzureCredential({
      managedIdentityClientId: env.cosmosClientId,
    });

    return new CosmosClient({
      endpoint: env.cosmosEndpoint,
      aadCredentials: credential,
    });
  }

  if (env.cosmosKey === "") {
    throw new HttpError(500, "cosmos_key_missing", "COSMOS_KEY is required in key auth mode");
  }

  return new CosmosClient({
    endpoint: env.cosmosEndpoint,
    key: env.cosmosKey,
  });
};

export const getTokensContainer = (): Container => {
  if (cachedContainer) {
    return cachedContainer;
  }

  const env = getEnv();

  if (!cachedClient) {
    cachedClient = createCosmosClient();
  }

  cachedContainer = cachedClient.database(env.cosmosDb).container(TOKENS_CONTAINER);
  return cachedContainer;
};
