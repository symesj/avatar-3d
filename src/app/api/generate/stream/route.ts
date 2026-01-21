import { NextRequest } from "next/server";
import { generateImage } from "@/lib/replicate";
import { generateSteps, calculateCost, DEFAULTS } from "@/lib/constants";
import type { GenerateStreamRequest } from "@/lib/types";

export const maxDuration = 300;

const CONCURRENCY = 8;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeSSE(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest): Promise<Response> {
  const body: GenerateStreamRequest = await request.json();
  const {
    imageBase64,
    xSteps = DEFAULTS.X_STEPS,
    ySteps = DEFAULTS.Y_STEPS,
    prefix = "avatar",
  } = body;

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

  const { steps } = generateSteps({ xSteps, ySteps, prefix });
  const totalImages = xSteps * ySteps;
  const cost = calculateCost(xSteps, ySteps);
  const flatSteps = steps.flat();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encodeSSE({
          type: "config",
          config: { xSteps, ySteps, prefix, totalImages, estimatedCost: cost },
        })
      );

      let completedCount = 0;
      let currentIndex = 0;

      const processNext = async (): Promise<void> => {
        while (currentIndex < flatSteps.length) {
          const myIndex = currentIndex++;
          const step = flatSteps[myIndex];
          let retries = 0;

          while (retries < MAX_RETRIES) {
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

              completedCount++;
              controller.enqueue(
                encodeSSE({
                  type: "progress",
                  completed: completedCount,
                  total: totalImages,
                  index: myIndex,
                  step,
                  imageBase64: imageBuffer.toString("base64"),
                })
              );
              break;
            } catch (err) {
              const is429 = err instanceof Error && err.message.includes("429");
              if (is429 && retries < MAX_RETRIES - 1) {
                const waitTime = Math.min(
                  INITIAL_BACKOFF_MS * Math.pow(2, retries),
                  60000
                );
                await delay(waitTime);
                retries++;
              } else {
                console.error(`[Stream] Error generating image ${myIndex}:`, err);
                completedCount++;
                break;
              }
            }
          }
        }
      };

      try {
        const workers = Array(Math.min(CONCURRENCY, flatSteps.length))
          .fill(null)
          .map(() => processNext());

        await Promise.all(workers);
        controller.enqueue(encodeSSE({ type: "complete" }));
      } catch (error) {
        controller.enqueue(
          encodeSSE({
            type: "error",
            error: error instanceof Error ? error.message : "Generation failed",
          })
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
