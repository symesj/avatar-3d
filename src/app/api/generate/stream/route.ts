import { NextRequest } from "next/server";
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
  const body: GenerateRequest = await request.json();
  const { imageBase64, xSteps = 5, ySteps = 5, prefix = "avatar" } = body;

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: "No image provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Server not configured. Missing API token." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { steps } = generateSteps({
    X_STEPS: xSteps,
    Y_STEPS: ySteps,
    PREFIX: prefix,
  });

  const totalImages = xSteps * ySteps;
  const cost = calculateCost(xSteps, ySteps);
  const flatSteps = steps.flat();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial config
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "config",
            config: { xSteps, ySteps, prefix, totalImages, estimatedCost: cost },
          })}\n\n`
        )
      );

      try {
        // Process images in parallel with controlled concurrency
        const CONCURRENCY = 8;
        let completedCount = 0;
        let currentIndex = 0;
        const results: { index: number; step: typeof flatSteps[0]; imageBase64: string }[] = [];

        // Helper to delay execution
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Worker function that processes images from the queue with retry
        const processNext = async (): Promise<void> => {
          while (currentIndex < flatSteps.length) {
            const myIndex = currentIndex++;
            const step = flatSteps[myIndex];

            let retries = 0;
            const maxRetries = 5;

            while (retries < maxRetries) {
              try {
                const imageBuffer = await generateImage({
                  imageBase64,
                  rotate_yaw: step.rotate_yaw,
                  rotate_pitch: step.rotate_pitch,
                  pupil_x: step.pupil_x,
                  pupil_y: step.pupil_y,
                  crop_factor: step.crop_factor,
                  output_quality: step.output_quality,
                  src_ratio: step.src_ratio,
                  sample_ratio: step.sample_ratio,
                });

                const resultBase64 = imageBuffer.toString("base64");
                completedCount++;

                // Store result for ordered output
                results.push({ index: myIndex, step, imageBase64: resultBase64 });

                // Send progress update immediately
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "progress",
                      completed: completedCount,
                      total: totalImages,
                      index: myIndex,
                      step,
                      imageBase64: resultBase64,
                    })}\n\n`
                  )
                );
                break; // Success, exit retry loop
              } catch (err) {
                const is429 = err instanceof Error && err.message.includes("429");
                if (is429 && retries < maxRetries - 1) {
                  // Exponential backoff: 5s, 10s, 20s, 40s
                  const waitTime = Math.min(5000 * Math.pow(2, retries), 60000);
                  console.log(`[Rate limit] Image ${myIndex} hit 429, retrying in ${waitTime}ms (attempt ${retries + 1})`);
                  await delay(waitTime);
                  retries++;
                } else {
                  console.error(`Error generating image ${myIndex}:`, err);
                  completedCount++;
                  break; // Give up on this image
                }
              }
            }
          }
        };

        // Start parallel workers - reduced to 4 to avoid rate limits
        const workers = Array(Math.min(CONCURRENCY, flatSteps.length))
          .fill(null)
          .map(() => processNext());

        await Promise.all(workers);

        // Send completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
            })}\n\n`
          )
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Generation failed",
            })}\n\n`
          )
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
