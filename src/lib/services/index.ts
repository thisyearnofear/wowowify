import { ImageService } from "./image-service";
import { getImageService } from "./service-factory";
export type { InterfaceType } from "./service-factory";

// ImageService is exported both as a class (for static methods like validateOverlayMode)
// and as a singleton accessor (getImageService) for command processing
export { ImageService, getImageService };
