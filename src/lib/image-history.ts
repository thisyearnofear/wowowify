import { logger } from "./logger";
import {
  getRedisClient,
  executeWithTimeout,
  getInMemoryData,
  setInMemoryData,
} from "./redis";

// --- Image Record Type (was in metrics.ts) ---

export interface ImageRecord {
  id: string;
  resultUrl: string;
  groveUri?: string;
  groveUrl?: string;
  timestamp: string;
}

// In-memory storage for individual image lookups (used as fallback when Redis is unavailable)
const imageHistory: Record<
  string,
  { resultUrl: string; groveUri?: string; groveUrl?: string; timestamp: number }
> = {};

// Redis key prefix for individual image lookups
const IMAGE_HISTORY_PREFIX = "image_history:";

/**
 * Store an image URL in the history
 */
export async function storeImageUrl(
  id: string,
  resultUrl: string,
  groveUri?: string,
  groveUrl?: string
): Promise<void> {
  // Skip if both resultUrl and groveUrl are empty
  if (!resultUrl && !groveUrl) {
    logger.warn(
      "Skipping storing image URL - both resultUrl and groveUrl are empty",
      { id }
    );
    return;
  }

  // Build the record for the history list (used by gallery)
  const imageRecord: ImageRecord = {
    id,
    resultUrl,
    groveUri: groveUri || "",
    groveUrl: groveUrl || "",
    timestamp: new Date().toISOString(),
  };

  // Build the lookup data for individual image retrieval
  const data = {
    resultUrl,
    groveUri,
    groveUrl,
    timestamp: Date.now(),
  };

  try {
    // Try to store in Redis first
    if (process.env.REDIS_URL) {
      const redis = getRedisClient();
      const key = `${IMAGE_HISTORY_PREFIX}${id}`;

      // 1. Store in Redis list for gallery/history retrieval (lpush + ltrim)
      try {
        await executeWithTimeout(
          () => redis.lpush("image_history", JSON.stringify(imageRecord)),
          5000
        );
        await executeWithTimeout(
          () => redis.ltrim("image_history", 0, 999), // Keep the most recent 1000 images
          3000
        );
        logger.info("Stored image URL in Redis history list", { id });
      } catch (listError) {
        logger.warn("Failed to store in Redis list, continuing with key storage", {
          error: listError instanceof Error ? listError.message : String(listError),
          id,
        });
      }

      // 2. Store by key for individual image lookup
      await executeWithTimeout(
        () => redis.set(key, JSON.stringify(data), "EX", 86400), // Expire after 24 hours
        2000
      );

      logger.info(`Stored image URL in Redis history: ${id}`);
    } else {
      // Fallback to in-memory storage
      imageHistory[id] = data;

      // Also push to in-memory list for gallery
      const inMemoryHistory = getInMemoryData("image_history") || [];
      inMemoryHistory.unshift(imageRecord);
      if (inMemoryHistory.length > 1000) {
        inMemoryHistory.length = 1000;
      }
      setInMemoryData("image_history", inMemoryHistory);

      // Clean up old entries (older than 24 hours)
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      Object.keys(imageHistory).forEach((k) => {
        if (now - imageHistory[k].timestamp > oneDayMs) {
          delete imageHistory[k];
        }
      });

      logger.info(`Stored image URL in memory history: ${id}`);
    }
  } catch (error) {
    // Fallback to in-memory storage if Redis fails entirely
    imageHistory[id] = data;

    // Also push to in-memory list for gallery
    try {
      const inMemoryHistory = getInMemoryData("image_history") || [];
      inMemoryHistory.unshift(imageRecord);
      if (inMemoryHistory.length > 1000) {
        inMemoryHistory.length = 1000;
      }
      setInMemoryData("image_history", inMemoryHistory);
    } catch (memError) {
      logger.warn("Failed to store in in-memory history list", {
        error: memError instanceof Error ? memError.message : String(memError),
      });
    }

    logger.warn(
      `Failed to store image URL in Redis, using memory fallback: ${id}`,
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Retrieve image history (list of recent images)
 * Migrated from metrics.ts — single source of truth for image history queries
 */
export async function getImageHistory(
  limit: number = 100
): Promise<ImageRecord[]> {
  try {
    let records: string[] = [];
    let useInMemory = false;

    try {
      const redis = getRedisClient();
      records = await executeWithTimeout(
        () => redis.lrange("image_history", 0, limit - 1),
        5000,
        []
      );
      logger.info("Raw image history retrieved from Redis", {
        count: records.length,
      });
    } catch (error) {
      logger.warn("Failed to retrieve from Redis, using in-memory fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      useInMemory = true;
    }

    if (useInMemory || records.length === 0) {
      const inMemoryHistory = getInMemoryData("image_history") || [];
      logger.info("Using in-memory history fallback", {
        count: inMemoryHistory.length,
      });
      const slicedHistory = inMemoryHistory.slice(0, limit) as ImageRecord[];
      logger.info("Parsed in-memory history", {
        count: slicedHistory.length,
        withGroveUri: slicedHistory.filter(
          (r) => r && typeof r === "object" && "groveUri" in r && !!r.groveUri
        ).length,
        withGroveUrl: slicedHistory.filter(
          (r) => r && typeof r === "object" && "groveUrl" in r && !!r.groveUrl
        ).length,
      });
      return slicedHistory;
    }

    const parsedRecords = records
      .map((record: string) => {
        try {
          return JSON.parse(record);
        } catch (e) {
          logger.error("Failed to parse image record", {
            error: e instanceof Error ? e.message : String(e),
            record: record.substring(0, 100),
          });
          return null;
        }
      })
      .filter(Boolean)
      .filter((record) => {
        return (
          record.id &&
          (record.resultUrl || (record.groveUri && record.groveUrl))
        );
      });

    parsedRecords.sort((a, b) => {
      if (a.groveUrl && !b.groveUrl) return -1;
      if (!a.groveUrl && b.groveUrl) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    logger.info("Parsed image history", {
      count: parsedRecords.length,
      withGroveUri: parsedRecords.filter((r) => r.groveUri).length,
      withGroveUrl: parsedRecords.filter((r) => r.groveUrl).length,
    });

    return parsedRecords;
  } catch (error) {
    logger.error("Failed to retrieve image history", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get an image URL from the history by ID
 */
export async function getImageUrl(id: string): Promise<{
  resultUrl: string;
  groveUri?: string;
  groveUrl?: string;
} | null> {
  try {
    // Try to get from Redis first
    if (process.env.REDIS_URL) {
      const redis = getRedisClient();
      const key = `${IMAGE_HISTORY_PREFIX}${id}`;

      const data = await executeWithTimeout(
        () => redis.get(key),
        2000, // 2 second timeout
        null
      );

      if (data) {
        logger.info(`Retrieved image URL from Redis history: ${id}`);
        return JSON.parse(data);
      }
    }

    // Fallback to in-memory storage
    const entry = imageHistory[id];
    if (entry) {
      logger.info(`Retrieved image URL from memory history: ${id}`);
      return {
        resultUrl: entry.resultUrl,
        groveUri: entry.groveUri,
        groveUrl: entry.groveUrl,
      };
    }

    return null;
  } catch (error) {
    // Fallback to in-memory storage if Redis fails
    logger.warn(
      `Failed to get image URL from Redis, using memory fallback: ${id}`,
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );

    const entry = imageHistory[id];
    if (!entry) {
      return null;
    }

    return {
      resultUrl: entry.resultUrl,
      groveUri: entry.groveUri,
      groveUrl: entry.groveUrl,
    };
  }
}
