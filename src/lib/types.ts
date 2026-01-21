/**
 * Shared types for the Avatar 3D application
 */

/**
 * Step configuration for head rotation generation
 */
export interface Step {
  filename: string;
  rotate_yaw: number;
  rotate_pitch: number;
  pupil_x: number;
  pupil_y: number;
  crop_factor: number;
  output_quality: number;
  src_ratio: number;
  sample_ratio: number;
}

/**
 * Generated image with step metadata
 */
export interface GeneratedImage {
  step: Step;
  imageBase64: string;
  depthBase64?: string;
  index?: number;
}

/**
 * Generation status states
 */
export type GenerationStatus =
  | "idle"
  | "preprocessing"
  | "generating"
  | "generating3d"
  | "complete"
  | "error";

/**
 * Generation mode options
 */
export type GenerationMode = "cursor" | "3d-model";

/**
 * Configuration for step generation
 */
export interface GenerateStepsOptions {
  xSteps: number;
  ySteps: number;
  prefix: string;
  rotateBound?: number;
  pupilBound?: number;
}

/**
 * Result of step generation
 */
export interface GenerateStepsResult {
  steps: Step[][];
  prefix: string;
  xSteps: number;
  ySteps: number;
}

/**
 * API request types
 */
export interface PreprocessRequest {
  imageBase64: string;
  fullBody?: boolean;
  stylePrompt?: string;
}

export interface Generate3DRequest {
  imageBase64: string;
  textureSize?: number;
  meshQuality?: number;
}

export interface GenerateStreamRequest {
  imageBase64: string;
  xSteps?: number;
  ySteps?: number;
  prefix?: string;
}

/**
 * API response types
 */
export interface ApiErrorResponse {
  error: string;
}

export interface PreprocessResponse {
  success: boolean;
  imageBase64: string;
}

export interface Generate3DResponse {
  success: boolean;
  glbBase64: string;
  glbUrl?: string;
}

/**
 * SSE event types for streaming generation
 */
export interface StreamConfigEvent {
  type: "config";
  config: {
    xSteps: number;
    ySteps: number;
    prefix: string;
    totalImages: number;
    estimatedCost: number;
  };
}

export interface StreamProgressEvent {
  type: "progress";
  completed: number;
  total: number;
  index: number;
  step: Step;
  imageBase64: string;
}

export interface StreamCompleteEvent {
  type: "complete";
}

export interface StreamErrorEvent {
  type: "error";
  error: string;
}

export type StreamEvent =
  | StreamConfigEvent
  | StreamProgressEvent
  | StreamCompleteEvent
  | StreamErrorEvent;
