import { NextRequest, NextResponse } from "next/server";
import {
  getReplicateClient,
  toDataUri,
  handleReplicateOutput,
  MODELS,
} from "@/lib/replicate";
import type { PreprocessRequest, PreprocessResponse, ApiErrorResponse } from "@/lib/types";

export const maxDuration = 120;

const BASE_STYLE =
  "3D animated Pixar-style character, Disney Pixar animation style, smooth skin, big expressive eyes, soft lighting, front facing, looking directly at camera, neutral expression, centered on pure black background";

function buildPrompt(fullBody: boolean, stylePrompt?: string): string {
  const customAddition = stylePrompt ? `, ${stylePrompt}` : "";

  if (fullBody) {
    return `Transform this person into a full body ${BASE_STYLE}. Show the complete body from head to feet, natural relaxed standing pose, arms at sides. Full body visible${customAddition}. Keep the same facial features and likeness but as a 3D animated cartoon character.`;
  }

  return `Transform this person into a ${BASE_STYLE}${customAddition}. Keep the same facial features and likeness but as a 3D animated cartoon character.`;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<PreprocessResponse | ApiErrorResponse>> {
  try {
    const body: PreprocessRequest = await request.json();
    const { imageBase64, fullBody = false, stylePrompt } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const replicate = getReplicateClient();
    const prompt = buildPrompt(fullBody, stylePrompt);

    const output = await replicate.run(MODELS.NANO_BANANA_PRO, {
      input: {
        prompt,
        image_input: [toDataUri(imageBase64)],
        resolution: "2K",
        aspect_ratio: fullBody ? "9:16" : "1:1",
        output_format: "png",
        safety_filter_level: "block_only_high",
      },
    });

    const resultBuffer = await handleReplicateOutput(output);

    return NextResponse.json({
      success: true,
      imageBase64: resultBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("[Preprocess] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preprocessing failed" },
      { status: 500 }
    );
  }
}
