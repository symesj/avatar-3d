import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/replicate";
import { generateSteps, calculateCost } from "@/lib/constants";

export const maxDuration = 300; // 5 minutes max for generation

interface GenerateRequest {
  imageBase64: string;
  xSteps?: number;
  ySteps?: number;
  prefix?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { imageBase64, xSteps = 5, ySteps = 5, prefix = "avatar" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Server not configured. Missing API token." },
        { status: 500 }
      );
    }

    // Generate steps configuration
    const { steps } = generateSteps({
      X_STEPS: xSteps,
      Y_STEPS: ySteps,
      PREFIX: prefix,
    });

    const totalImages = xSteps * ySteps;
    const cost = calculateCost(xSteps, ySteps);

    // Generate all images
    const generatedImages: { step: typeof steps[0][0]; imageBase64: string }[] = [];
    let completed = 0;

    // Process images in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const flatSteps = steps.flat();

    for (let i = 0; i < flatSteps.length; i += BATCH_SIZE) {
      const batch = flatSteps.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (step) => {
          try {
            const imageBuffer = await generateImage({
              imageBase64,
              rotate_yaw: step.rotate_yaw,
              rotate_pitch: step.rotate_pitch,
              pupil_x: step.pupil_x,
              pupil_y: step.pupil_y,
              crop_factor: step.crop_factor,
              output_quality: step.output_quality,
            });

            completed++;
            console.log(`Generated ${completed}/${totalImages} images`);

            return {
              step,
              imageBase64: imageBuffer.toString("base64"),
            };
          } catch (error) {
            console.error(`Error generating image for step:`, step, error);
            throw error;
          }
        })
      );

      generatedImages.push(...batchResults);
    }

    return NextResponse.json({
      success: true,
      images: generatedImages,
      config: {
        xSteps,
        ySteps,
        prefix,
        totalImages,
        estimatedCost: cost,
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
