import { NextResponse } from "next/server";


/**
 * Health check
 * @description Service health response.
 * @response 200:HealthResponseSchema:Service health response
 * @responseSet none
 * @openapi
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "az-jina-auth",
    timestamp: new Date().toISOString(),
  });
}
