"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import { Viewer3D } from "@/components/Viewer3D";
import { Viewer2D } from "@/components/Viewer2D";
import { ExportModal } from "@/components/ExportModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { calculateCost, type Step } from "@/lib/constants";
import { Loader2, Sparkles, Box, Square, User, Download } from "lucide-react";
import Image from "next/image";

interface GeneratedImage {
  step: Step;
  imageBase64: string;
  depthBase64?: string;
  index?: number;
}

type GenerationStatus = "idle" | "generating" | "complete" | "error";

export default function Home() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [xSteps, setXSteps] = useState(5);
  const [ySteps, setYSteps] = useState(5);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [viewerMode, setViewerMode] = useState<"2d" | "3d">("2d");

  const estimatedCost = calculateCost(xSteps, ySteps);
  const totalImages = xSteps * ySteps;

  const handleImageSelect = useCallback((base64: string, preview: string) => {
    setImageBase64(base64);
    setPreviewUrl(preview);
    setGeneratedImages([]);
    setStatus("idle");
    setProgress(0);
    toast.success("Image uploaded");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageBase64) return;

    setStatus("generating");
    setProgress(0);
    setGeneratedImages([]);

    const toastId = toast.loading("Starting generation...");

    try {
      const response = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          xSteps,
          ySteps,
          prefix: "avatar",
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      const images: GeneratedImage[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "progress") {
              const pct = (data.completed / data.total) * 100;
              setProgress(pct);
              images.push({
                step: data.step,
                imageBase64: data.imageBase64,
                index: data.index,
              });
              setGeneratedImages([...images]);
              toast.loading(`Generating... ${Math.round(pct)}%`, { id: toastId });
            } else if (data.type === "complete") {
              setStatus("complete");
              setProgress(100);
              setViewerMode("3d");
              toast.success(`${images.length} frames generated`, { id: toastId });
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setStatus("error");
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error("Generation failed", { id: toastId, description: message });
    }
  }, [imageBase64, xSteps, ySteps]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left Column - Upload & Settings */}
          <div className="space-y-4">
            <Card className="p-4 gap-1">
              <h1 className="font-semibold text-lg">3d Avatar Generator</h1>
              <p className="text-sm text-muted-foreground">
                Generate interactive eye-tracking avatars from any photo.
              </p>
            </Card>

            <ImageUpload
              onImageSelect={handleImageSelect}
              disabled={status === "generating"}
            />

            <Card className="p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Horizontal</span>
                    <Badge variant="secondary" className="font-mono text-xs">{xSteps}</Badge>
                  </div>
                  <Slider
                    value={[xSteps]}
                    onValueChange={([value]) => setXSteps(value)}
                    min={3}
                    max={10}
                    step={1}
                    disabled={status === "generating"}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vertical</span>
                    <Badge variant="secondary" className="font-mono text-xs">{ySteps}</Badge>
                  </div>
                  <Slider
                    value={[ySteps]}
                    onValueChange={([value]) => setYSteps(value)}
                    min={3}
                    max={10}
                    step={1}
                    disabled={status === "generating"}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{totalImages} frames</span>
                  <span className="font-mono">${estimatedCost.toFixed(3)}</span>
                </div>

                <div className="relative pt-1">
                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={!imageBase64 || status === "generating"}
                  >
                    {status === "generating" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                  {status === "generating" && (
                    <Progress value={progress} className="h-1 absolute -bottom-2 left-0 right-0" />
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between h-8">
              <div className="flex gap-1">
                <Button
                  variant={viewerMode === "2d" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewerMode("2d")}
                  className="h-7 px-2.5 text-xs"
                >
                  <Square className="h-3 w-3 mr-1" />
                  2D
                </Button>
                <Button
                  variant={viewerMode === "3d" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewerMode("3d")}
                  className="h-7 px-2.5 text-xs"
                >
                  <Box className="h-3 w-3 mr-1" />
                  3D
                </Button>
              </div>
              {status === "complete" && generatedImages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExport(true)}
                  className="h-7 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              )}
            </div>

            <div className="relative">
              {generatedImages.length > 0 ? (
                viewerMode === "3d" ? (
                  <Viewer3D
                    images={generatedImages}
                    xSteps={xSteps}
                    ySteps={ySteps}
                  />
                ) : (
                  <Viewer2D
                    images={generatedImages}
                    xSteps={xSteps}
                    ySteps={ySteps}
                  />
                )
              ) : previewUrl ? (
                <Card className="aspect-square overflow-hidden relative">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  {status === "generating" && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                      <p className="text-sm text-white">Processing... {Math.round(progress)}%</p>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="aspect-square flex items-center justify-center border-dashed">
                  <div className="text-center text-muted-foreground p-6">
                    <User className="h-8 w-8 mx-auto mb-2 stroke-[1.5]" />
                    <p className="text-sm">Upload an image to start</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExport && (
        <ExportModal
          images={generatedImages}
          xSteps={xSteps}
          ySteps={ySteps}
          isOpen={showExport}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
