import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

// Note: The depth estimation will be done client-side using @huggingface/transformers
// This route is kept for potential server-side processing if needed in the future

interface DepthRequest {
  images: { step: { filename: string }; imageBase64: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: DepthRequest = await request.json();
    const { images } = body;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    // For now, we'll return the images as-is
    // Depth estimation will be done client-side using HuggingFace transformers
    // This is more efficient as it uses the browser's compute resources

    return NextResponse.json({
      success: true,
      message: "Depth estimation should be done client-side for better performance",
      imageCount: images.length,
    });
  } catch (error) {
    console.error("Depth estimation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Depth estimation failed" },
      { status: 500 }
    );
  }
}
