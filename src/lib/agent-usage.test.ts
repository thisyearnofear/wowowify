import { describe, expect, it } from "vitest";
import {
  getAgentDailyMax,
  getAgentRateLimitMax,
} from "@/lib/agent-usage";

describe("agent usage limits", () => {
  it("defaults to studio-friendly rate limits in all mode", () => {
    const prior = process.env.TOKA_DEPLOYMENT;
    delete process.env.AGENT_RATE_LIMIT_MAX;
    delete process.env.AGENT_DAILY_MAX;
    delete process.env.TOKA_DEPLOYMENT;
    expect(getAgentRateLimitMax()).toBe(20);
    expect(getAgentDailyMax()).toBeNull();
    process.env.TOKA_DEPLOYMENT = prior;
  });

  it("tightens ASP defaults during free launch", () => {
    const priorDeployment = process.env.TOKA_DEPLOYMENT;
    const priorRate = process.env.AGENT_RATE_LIMIT_MAX;
    const priorDaily = process.env.AGENT_DAILY_MAX;
    process.env.TOKA_DEPLOYMENT = "asp";
    delete process.env.AGENT_RATE_LIMIT_MAX;
    delete process.env.AGENT_DAILY_MAX;
    expect(getAgentRateLimitMax()).toBe(10);
    expect(getAgentDailyMax()).toBe(100);
    process.env.TOKA_DEPLOYMENT = priorDeployment;
    process.env.AGENT_RATE_LIMIT_MAX = priorRate;
    process.env.AGENT_DAILY_MAX = priorDaily;
  });

  it("honors explicit env overrides", () => {
    const priorRate = process.env.AGENT_RATE_LIMIT_MAX;
    const priorDaily = process.env.AGENT_DAILY_MAX;
    process.env.AGENT_RATE_LIMIT_MAX = "5";
    process.env.AGENT_DAILY_MAX = "250";
    expect(getAgentRateLimitMax()).toBe(5);
    expect(getAgentDailyMax()).toBe(250);
    process.env.AGENT_RATE_LIMIT_MAX = priorRate;
    process.env.AGENT_DAILY_MAX = priorDaily;
  });
});
