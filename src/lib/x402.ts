import { NextResponse } from "next/server";

export interface X402Challenge {
  scheme: "x402";
  price: string;
  currency: string;
  network: string;
  payTo: string;
  resource: string;
}

export function checkAgentPayment(request: Request): Response | null {
  if (process.env.X402_ENABLED !== "true") return null;

  const payment =
    request.headers.get("x-payment") || request.headers.get("X-PAYMENT");
  const stubAccept = process.env.X402_STUB_ACCEPT === "true";

  if (!payment) {
    const challenge: X402Challenge = {
      scheme: "x402",
      price: process.env.X402_PRICE_USDC || "0.01",
      currency: "USDC",
      network: process.env.X402_NETWORK || "x-layer",
      payTo: process.env.X402_PAYTO_ADDRESS || "",
      resource: "POST /api/agent",
    };
    return NextResponse.json(
      {
        error: "Payment Required",
        x402: challenge,
      },
      {
        status: 402,
        headers: {
          "X-Payment-Required": "x402",
        },
      },
    );
  }

  if (stubAccept) return null;

  const expected = process.env.X402_DEV_TOKEN;
  if (expected && payment === expected) return null;

  return NextResponse.json({ error: "Invalid or unverified payment" }, { status: 402 });
}
