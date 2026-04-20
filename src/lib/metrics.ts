import { logger } from "./logger";

let totalRequests = 0;
let failedRequests = 0;
let lastReset = new Date().toISOString();

// Reset counters every 24 hours
const resetInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Reset counters periodically
setInterval(() => {
  totalRequests = 0;
  failedRequests = 0;
  lastReset = new Date().toISOString();

  logger.info("Metrics counters reset", {
    totalRequests,
    failedRequests,
    lastReset,
  });
}, resetInterval);

// Function to increment total requests
export function incrementTotalRequests(): void {
  totalRequests++;
  logger.info("Total requests incremented", { totalRequests });
}

// Function to increment failed requests
export function incrementFailedRequests(): void {
  failedRequests++;
  logger.info("Failed requests incremented", { failedRequests });
}

// Function to get metrics
export function getMetrics(): {
  totalRequests: number;
  failedRequests: number;
  lastReset: string;
} {
  return {
    totalRequests,
    failedRequests,
    lastReset,
  };
}

// Re-export ImageRecord and getImageHistory from image-history for backward compatibility
// These were previously in this file but have been consolidated
export type { ImageRecord } from "./image-history";
export { getImageHistory } from "./image-history";
