import { NextRequest, NextResponse } from "next/server";
import {
  getReplicateClient,
  toDataUri,
  fetchAsBuffer,
  MODELS,
} from "@/lib/replicate";
import type { Generate3DRequest, Generate3DResponse, ApiErrorResponse } from "@/lib/types";
import { DEFAULTS } from "@/lib/constants";

export const maxDuration = 300;

export async function POST(
  request: NextRequest
): Promise<NextResponse<Generate3DResponse | ApiErrorResponse>> {
  try {
    const body: Generate3DRequest = await request.json();
    const {
      imageBase64,
      textureSize = DEFAULTS.TEXTURE_SIZE,
      meshQuality = DEFAULTS.MESH_QUALITY,
    } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const replicate = getReplicateClient();

    const output = await replicate.run(MODELS.TRELLIS, {
      input: {
        seed: 0,
        images: [toDataUri(imageBase64)],
        texture_size: textureSize,
        mesh_simplify: meshQuality,
        generate_color: true,
        generate_model: true,
        randomize_seed: true,
        generate_normal: true,
        ss_sampling_steps: 12,
        slat_sampling_steps: 12,
        ss_guidance_strength: 7.5,
        slat_guidance_strength: 3,
      },
    });

    const outputObj = output as Record<string, unknown>;
    const glbUrl = outputObj.model_file as string;

    if (!glbUrl) {
      throw new Error("No 3D model found in output");
    }

    const glbBuffer = await fetchAsBuffer(glbUrl);

    return NextResponse.json({
      success: true,
      glbBase64: glbBuffer.toString("base64"),
      glbUrl,
    });
  } catch (error) {
    console.error("[Generate3D] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "3D generation failed" },
      { status: 500 }
    );
  }
}
