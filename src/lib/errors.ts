export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isHttpError = (value: unknown): value is HttpError => {
  return value instanceof HttpError;
};

export const toErrorResponse = (error: unknown) => {
  if (isHttpError(error)) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        message: error instanceof Error ? error.message : "Unexpected internal error",
      },
    },
  };
};
