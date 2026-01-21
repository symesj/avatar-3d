/**
 * Local storage utilities for persisting user data
 */

const STORAGE_KEYS = {
  RENDERS: "avatar3d_renders",
  SETTINGS: "avatar3d_settings",
} as const;

export interface SavedRender {
  id: string;
  createdAt: number;
  mode: "cursor" | "3d-model";
  originalImageBase64: string;
  processedImageBase64: string;
  previewThumbnail: string; // Smaller thumbnail for gallery
  frameCount?: number;
  xSteps?: number;
  ySteps?: number;
  stylePrompt?: string;
  // Note: GLB not stored - too large for localStorage
}

export interface UserSettings {
  defaultMode: "cursor" | "3d-model";
  defaultXSteps: number;
  defaultYSteps: number;
  defaultTextureSize: number;
  defaultMeshQuality: number;
}

const MAX_RENDERS = 10; // Reduced to save localStorage space
const THUMBNAIL_SIZE = 200; // Slightly larger for better quality

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a thumbnail from a base64 image
 */
export async function createThumbnail(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64);
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      const ratio = Math.min(THUMBNAIL_SIZE / img.width, THUMBNAIL_SIZE / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(base64);
    img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  });
}

/**
 * Get all saved renders from local storage
 */
export function getSavedRenders(): SavedRender[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.RENDERS);
    if (!data) return [];
    return JSON.parse(data) as SavedRender[];
  } catch {
    return [];
  }
}

/**
 * Save a new render to local storage
 */
export async function saveRender(
  render: Omit<SavedRender, "id" | "createdAt" | "previewThumbnail">
): Promise<SavedRender> {
  const renders = getSavedRenders();

  const thumbnail = await createThumbnail(render.processedImageBase64);

  const newRender: SavedRender = {
    ...render,
    id: generateId(),
    createdAt: Date.now(),
    previewThumbnail: thumbnail,
  };

  // Add to beginning, limit total count
  const updatedRenders = [newRender, ...renders].slice(0, MAX_RENDERS);

  localStorage.setItem(STORAGE_KEYS.RENDERS, JSON.stringify(updatedRenders));

  return newRender;
}

/**
 * Delete a render from local storage
 */
export function deleteRender(id: string): void {
  const renders = getSavedRenders();
  const filtered = renders.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.RENDERS, JSON.stringify(filtered));
}

/**
 * Clear all renders from local storage
 */
export function clearAllRenders(): void {
  localStorage.removeItem(STORAGE_KEYS.RENDERS);
}

/**
 * Get user settings
 */
export function getUserSettings(): UserSettings | null {
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return null;
    return JSON.parse(data) as UserSettings;
  } catch {
    return null;
  }
}

/**
 * Save user settings
 */
export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/**
 * Image cache for preprocessed images (session only)
 */
const imageCache = new Map<string, string>();

/**
 * Generate a cache key from image content
 */
async function hashImage(base64: string): Promise<string> {
  // Simple hash using first/last chunks + length
  const sample = base64.slice(0, 100) + base64.slice(-100) + base64.length;
  return btoa(sample).slice(0, 32);
}

/**
 * Get cached preprocessed image
 */
export async function getCachedPreprocessed(
  originalBase64: string,
  stylePrompt: string,
  fullBody: boolean
): Promise<string | null> {
  const key = await hashImage(originalBase64 + stylePrompt + fullBody);
  return imageCache.get(key) || null;
}

/**
 * Cache a preprocessed image
 */
export async function cachePreprocessed(
  originalBase64: string,
  stylePrompt: string,
  fullBody: boolean,
  processedBase64: string
): Promise<void> {
  const key = await hashImage(originalBase64 + stylePrompt + fullBody);
  imageCache.set(key, processedBase64);

  // Limit cache size
  if (imageCache.size > 10) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }
}
