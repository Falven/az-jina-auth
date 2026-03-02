import { HttpError } from "./errors";

export const parseJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON");
  }
};

export const parseBearerToken = (authorizationHeader: string | null): string | undefined => {
  if (authorizationHeader === null || authorizationHeader.trim() === "") {
    return undefined;
  }

  const [scheme, ...rest] = authorizationHeader.trim().split(/\s+/);
  if (rest.length === 0) {
    return scheme;
  }

  if (scheme.toLowerCase() !== "bearer") {
    return undefined;
  }

  const token = rest.join(" ").trim();
  return token === "" ? undefined : token;
};

const toBytes = (value: string) => new TextEncoder().encode(value);

export const secureCompare = (left: string, right: string): boolean => {
  const leftBytes = toBytes(left);
  const rightBytes = toBytes(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let mismatched = 0;
  for (let i = 0; i < leftBytes.length; i += 1) {
    mismatched |= leftBytes[i] ^ rightBytes[i];
  }

  return mismatched === 0;
};
