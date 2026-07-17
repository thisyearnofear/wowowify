import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/metrics";
import { getAgentUsageSnapshot } from "@/lib/agent-usage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { totalRequests, failedRequests, lastReset } = await getMetrics();
  const agentUsage = await getAgentUsageSnapshot();
  const url = new URL(request.url);

  if (url.searchParams.get("format") === "json") {
    return NextResponse.json({
      totalRequests,
      failedRequests,
      lastReset,
      agentUsage,
    });
  }

  const metrics = [
    "# HELP api_requests_total Total number of API requests",
    "# TYPE api_requests_total counter",
    `api_requests_total ${totalRequests}`,
    "# HELP api_requests_failed_total Total number of failed API requests",
    "# TYPE api_requests_failed_total counter",
    `api_requests_failed_total ${failedRequests}`,
    "# HELP api_last_reset_timestamp Last time the counters were reset",
    "# TYPE api_last_reset_timestamp gauge",
    `api_last_reset_timestamp ${lastReset}`,
  ].join("\n");

  return new NextResponse(metrics, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
