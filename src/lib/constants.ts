import type { Step, GenerateStepsOptions, GenerateStepsResult } from "./types";

/**
 * Default configuration values
 */
export const DEFAULTS = {
  X_STEPS: 5,
  Y_STEPS: 5,
  ROTATE_BOUND: 20,
  PUPIL_BOUND: 15,
  CROP_FACTOR: 1.7,
  OUTPUT_QUALITY: 100,
  TEXTURE_SIZE: 1024,
  MESH_QUALITY: 0.9,
} as const;

/**
 * Cost per image generation (in USD)
 */
const COST_PER_IMAGE = 0.00098;

/**
 * Round a number to specified precision
 */
function round(value: number, precision = 100): number {
  return Math.round(value * precision) / precision;
}

/**
 * Generate step configurations for head rotation grid
 */
export function generateSteps(options: GenerateStepsOptions): GenerateStepsResult {
  const {
    xSteps,
    ySteps,
    prefix,
    rotateBound = DEFAULTS.ROTATE_BOUND,
    pupilBound = DEFAULTS.PUPIL_BOUND,
  } = options;

  const steps: Step[][] = [];

  for (let y = 0; y < ySteps; y++) {
    const row: Step[] = [];
    for (let x = 0; x < xSteps; x++) {
      const xNorm = xSteps > 1 ? x / (xSteps - 1) : 0.5;
      const yNorm = ySteps > 1 ? y / (ySteps - 1) : 0.5;

      const rotate_yaw = round(-rotateBound + xNorm * rotateBound * 2);
      const rotate_pitch = round(-rotateBound + yNorm * rotateBound * 2);
      const pupil_x = round(-pupilBound + xNorm * pupilBound * 2);
      const pupil_y = round(-pupilBound + yNorm * pupilBound * 2);

      const filename = `${prefix}_y${rotate_yaw}_p${rotate_pitch}_px${pupil_x}_py${pupil_y}.png`;

      row.push({
        filename,
        rotate_yaw,
        rotate_pitch,
        pupil_x,
        pupil_y,
        crop_factor: DEFAULTS.CROP_FACTOR,
        output_quality: DEFAULTS.OUTPUT_QUALITY,
        src_ratio: 1,
        sample_ratio: 1,
      });
    }
    steps.push(row);
  }

  return { steps, prefix, xSteps, ySteps };
}

/**
 * Calculate estimated cost for generation
 */
export function calculateCost(xSteps: number, ySteps: number): number {
  return xSteps * ySteps * COST_PER_IMAGE;
}

// Re-export Step type for convenience
export type { Step } from "./types";
