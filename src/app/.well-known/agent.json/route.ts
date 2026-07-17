import { NextResponse } from "next/server";
import { getAgentCapabilityCard } from "@/lib/agent-capability-card";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return NextResponse.json(getAgentCapabilityCard(), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
