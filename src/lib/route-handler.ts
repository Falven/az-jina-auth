import { NextResponse } from "next/server";

import { toErrorResponse } from "./errors";

export const handleRoute = async <T>(handler: () => Promise<T>) => {
  try {
    const body = await handler();
    return NextResponse.json(body);
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
};
