import Replicate from "replicate";

const MODEL_ID =
  "fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86";

export function getReplicateClient() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }
  return new Replicate({ auth: token });
}

export interface GenerateImageOptions {
  imageBase64: string;
  rotate_yaw: number;
  rotate_pitch: number;
  pupil_x: number;
  pupil_y: number;
  crop_factor?: number;
  output_quality?: number;
  src_ratio?: number;
  sample_ratio?: number;
}

export async function generateImage(options: GenerateImageOptions): Promise<Buffer> {
  const replicate = getReplicateClient();

  const {
    imageBase64,
    rotate_yaw,
    rotate_pitch,
    pupil_x,
    pupil_y,
    crop_factor = 1.7,
    output_quality = 100,
    src_ratio = 1,
    sample_ratio = 1,
  } = options;

  // Convert base64 to data URI for Replicate
  const imageDataUri = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;

  console.log(`[Replicate] Generating image with yaw=${rotate_yaw}, pitch=${rotate_pitch}, pupil_x=${pupil_x}, pupil_y=${pupil_y}`);

  const output = await replicate.run(MODEL_ID, {
    input: {
      image: imageDataUri,
      rotate_yaw,
      rotate_pitch,
      pupil_x,
      pupil_y,
      crop_factor,
      output_quality,
      src_ratio,
      sample_ratio,
      output_format: "png",
    },
  });

  console.log(`[Replicate] Output type: ${typeof output}, isArray: ${Array.isArray(output)}`);

  // Handle array output (could be URLs or ReadableStreams)
  if (Array.isArray(output) && output.length > 0) {
    const item = output[0];

    // If it's a string URL
    if (typeof item === "string") {
      console.log(`[Replicate] Fetching image from URL: ${item.substring(0, 50)}...`);
      const response = await fetch(item);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[Replicate] Got image buffer of size: ${arrayBuffer.byteLength}`);
      return Buffer.from(arrayBuffer);
    }

    // If it's a ReadableStream
    if (item instanceof ReadableStream) {
      console.log(`[Replicate] Reading from ReadableStream...`);
      const reader = item.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`[Replicate] Got image buffer of size: ${result.length}`);
      return Buffer.from(result);
    }
  }

  // If it's a single string URL
  if (typeof output === "string") {
    console.log(`[Replicate] Fetching from string URL`);
    const response = await fetch(output);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // If it's a single ReadableStream
  if (output instanceof ReadableStream) {
    console.log(`[Replicate] Reading from single ReadableStream...`);
    const reader = output.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(result);
  }

  console.error(`[Replicate] Unexpected output:`, output);
  throw new Error(`Unexpected output format from Replicate API`);
}
