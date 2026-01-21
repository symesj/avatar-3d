"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, FileImage, Code, FileCode } from "lucide-react";
import type { GeneratedImage } from "@/lib/types";

interface ExportModalProps {
  images: GeneratedImage[];
  xSteps: number;
  ySteps: number;
  isOpen: boolean;
  onClose: () => void;
  glbBase64?: string | null;
}

export function ExportModal({
  images,
  xSteps,
  ySteps,
  isOpen,
  onClose,
  glbBase64,
}: ExportModalProps) {
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const downloadGlb = () => {
    if (!glbBase64) return;
    
    const binaryString = atob(glbBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "model/gltf-binary" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "avatar-3d.glb";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateEmbedCode = () => {
    const imagesJson = JSON.stringify(
      images.map((img, index) => ({
        index,
        base64: img.imageBase64,
      }))
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Avatar</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #1a1a1a;
    }
    .container {
      position: relative;
      width: min(500px, 90vw);
      aspect-ratio: 1;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <img class="avatar" id="avatar" alt="3D Avatar">
  </div>
  <script>
    const images = ${imagesJson};
    const xSteps = ${xSteps};
    const ySteps = ${ySteps};
    const avatar = document.getElementById('avatar');
    const container = document.getElementById('container');

    const loadedImages = images.map(img => {
      const imgEl = new Image();
      imgEl.src = 'data:image/png;base64,' + img.base64;
      return imgEl;
    });

    avatar.src = loadedImages[0].src;

    let lastUpdate = 0;
    const throttleMs = 16;

    container.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) return;
      lastUpdate = now;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const xIndex = Math.min(Math.floor(x * xSteps), xSteps - 1);
      const yIndex = Math.min(Math.floor(y * ySteps), ySteps - 1);
      const imageIndex = yIndex * xSteps + xIndex;

      if (loadedImages[imageIndex]) {
        avatar.src = loadedImages[imageIndex].src;
      }
    });
  </script>
</body>
</html>`;
  };

  const generateReactCode = () => {
    return `"use client";

import { useState, useCallback } from "react";

const IMAGES = [
${images.map((_, i) => `  "/avatar-frames/frame-${i}.png",`).join("\n")}
];

const X_STEPS = ${xSteps};
const Y_STEPS = ${ySteps};

export function Avatar3D() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const xIndex = Math.min(Math.floor(x * X_STEPS), X_STEPS - 1);
    const yIndex = Math.min(Math.floor(y * Y_STEPS), Y_STEPS - 1);
    const imageIndex = yIndex * X_STEPS + xIndex;

    setCurrentIndex(imageIndex);
  }, []);

  return (
    <div
      className="relative w-[300px] aspect-square cursor-none"
      onMouseMove={handleMouseMove}
    >
      <img
        src={IMAGES[currentIndex]}
        alt="3D Avatar"
        className="w-full h-full object-cover rounded-lg"
      />
    </div>
  );
}`;
  };

  const downloadHtml = async () => {
    setExporting(true);
    try {
      const html = generateEmbedCode();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "avatar-3d.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const downloadImages = async () => {
    setExporting(true);
    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const a = document.createElement("a");
        a.href = `data:image/png;base64,${image.imageBase64}`;
        a.download = `frame-${i.toString().padStart(3, "0")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 100));
      }
    } finally {
      setExporting(false);
    }
  };

  const copyReactCode = () => {
    navigator.clipboard.writeText(generateReactCode());
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Export Your Avatar</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GLB Export - Show if 3D model exists */}
          {glbBase64 && (
            <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-medium flex items-center gap-2">
                <Box className="h-4 w-4" />
                3D Model (GLB)
              </h3>
              <p className="text-sm text-muted-foreground">
                Download the actual 3D model file. Use in Blender, Unity, Unreal, 
                or any 3D software. Can be embedded in websites with Three.js.
              </p>
              <Button onClick={downloadGlb}>
                <Box className="h-4 w-4 mr-2" />
                Download GLB File
              </Button>
            </div>
          )}

          {/* Frame-based exports - Show if images exist */}
          {images.length > 0 && (
            <>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Standalone HTML File
                </h3>
                <p className="text-sm text-muted-foreground">
                  Download a self-contained HTML file with all images embedded.
                  Perfect for quick demos or embedding in websites.
                </p>
                <Button onClick={downloadHtml} variant="outline" disabled={exporting}>
                  {exporting ? "Exporting..." : "Download HTML File"}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Download All Frames
                </h3>
                <p className="text-sm text-muted-foreground">
                  Download all {images.length} image frames separately. Use these
                  with your own implementation or video editing software.
                </p>
                <Button onClick={downloadImages} variant="outline" disabled={exporting}>
                  {exporting ? "Downloading..." : `Download ${images.length} Images`}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  React Component Code
                </h3>
                <p className="text-sm text-muted-foreground">
                  Copy a React component that you can use in your Next.js/React
                  project. You&apos;ll need to save the frames as separate files.
                </p>
                <Button onClick={copyReactCode} variant="outline">
                  Copy React Code
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Generated Configuration</h4>
                <div className="text-xs font-mono space-y-1">
                  <p>Grid: {xSteps} x {ySteps}</p>
                  <p>Total Frames: {images.length}</p>
                </div>
              </div>
            </>
          )}

          {/* Show message if only GLB and no frames */}
          {glbBase64 && images.length === 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your 3D model is ready to download. Import it into any 3D software
                or use Three.js to display it on the web.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
