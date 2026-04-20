import { ImageService } from "./image-service";
import { logger } from "../logger";

/**
 * Valid interface types for services
 */
export type InterfaceType = "web" | "farcaster" | "telegram";

/**
 * Singleton ImageService instance shared across all interface types.
 * All interfaces use the same ImageService — this is a lazy singleton accessor.
 */
let serviceInstance: ImageService | null = null;

export function getImageService(interfaceType: InterfaceType = "web"): ImageService {
  if (!serviceInstance) {
    logger.info(`Creating ImageService instance for ${interfaceType} interface`);
    serviceInstance = new ImageService();
  } else {
    logger.info(`Reusing ImageService instance for ${interfaceType} interface`);
  }
  return serviceInstance;
}
