export const X_STEPS = 10;
export const Y_STEPS = 10;
export const ROTATE_BOUND = 20;
export const PUPIL_BOUND = 15;
export const FPS = 60;

function round(value: number, precision = 100) {
  return Math.round(value * precision) / precision;
}

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

export interface GenerateStepsOptions {
  X_STEPS: number;
  Y_STEPS: number;
  PREFIX: string;
  ROTATE_BOUND?: number;
  PUPIL_BOUND?: number;
}

export function generateSteps(options: GenerateStepsOptions) {
  const {
    X_STEPS,
    Y_STEPS,
    PREFIX,
    ROTATE_BOUND: rotateBound = ROTATE_BOUND,
    PUPIL_BOUND: pupilBound = PUPIL_BOUND,
  } = options;

  const steps: Step[][] = [];

  for (let y = 0; y < Y_STEPS; y++) {
    const row: Step[] = [];
    for (let x = 0; x < X_STEPS; x++) {
      const rotate_yaw = round(
        -rotateBound + (x / (X_STEPS - 1 || 1)) * (rotateBound * 2)
      );
      const rotate_pitch = round(
        -rotateBound + (y / (Y_STEPS - 1 || 1)) * (rotateBound * 2)
      );
      const pupil_x = round(
        -pupilBound + (x / (X_STEPS - 1 || 1)) * (pupilBound * 2)
      );
      const pupil_y = round(
        -pupilBound + (y / (Y_STEPS - 1 || 1)) * (pupilBound * 2)
      );

      const filename = `${PREFIX}_y${rotate_yaw}_p${rotate_pitch}_px${pupil_x}_py${pupil_y}.png`;

      row.push({
        filename,
        rotate_yaw,
        rotate_pitch,
        pupil_x,
        pupil_y,
        crop_factor: 1.7,
        output_quality: 100,
        src_ratio: 1,
        sample_ratio: 1,
      });
    }
    steps.push(row);
  }

  return {
    steps,
    PREFIX,
    X_STEPS,
    Y_STEPS,
  };
}

export function calculateCost(xSteps: number, ySteps: number): number {
  return xSteps * ySteps * 0.00098;
}
