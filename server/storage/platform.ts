import { Platform } from "../types/platform";

export default function usePlatformStorage() {
  return useStorage<Platform>("platform");
}
