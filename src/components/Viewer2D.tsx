"use client";

import { Card } from "@/components/ui/card";
import type { Step } from "@/lib/constants";

interface GeneratedImage {
  step: Step;
  imageBase64: string;
  index?: number;
}

interface Viewer2DProps {
  images: GeneratedImage[];
  xSteps: number;
  ySteps: number;
}

export function Viewer2D({ images, xSteps, ySteps }: Viewer2DProps) {
  // Sort images by index so they display in correct grid order
  const sortedImages = [...images].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  return (
    <Card className="aspect-square bg-neutral-950 p-0 overflow-hidden">
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${xSteps}, 1fr)`,
          gridTemplateRows: `repeat(${ySteps}, 1fr)`,
        }}
      >
        {sortedImages.map((image, i) => (
          <div key={i} className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${image.imageBase64}`}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
