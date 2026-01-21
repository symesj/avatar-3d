"use client";

import { useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { GeneratedImage } from "@/lib/types";

interface Viewer3DProps {
  images: GeneratedImage[];
  xSteps: number;
  ySteps: number;
}

export function Viewer3D({ images: rawImages, xSteps, ySteps }: Viewer3DProps) {
  const images = useMemo(
    () => [...rawImages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
    [rawImages]
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    images: [] as ImageBitmap[],
    ctx: null as CanvasRenderingContext2D | null,
    currentIndex: -1,
    xSteps,
    ySteps,
    ready: false,
    loadedCount: 0,
  });

  // Update steps in ref when props change
  useEffect(() => {
    stateRef.current.xSteps = xSteps;
    stateRef.current.ySteps = ySteps;
  }, [xSteps, ySteps]);

  // Load images when they change
  useEffect(() => {
    if (images.length === 0) return;

    let cancelled = false;
    const state = stateRef.current;
    state.ready = false;
    state.loadedCount = 0;

    // Show loading indicator
    if (loadingRef.current) {
      loadingRef.current.style.display = "flex";
      loadingRef.current.textContent = "Loading...";
    }

    const loadImages = async () => {
      const bitmapPromises = images.map(async (image) => {
        const blob = await fetch(`data:image/png;base64,${image.imageBase64}`).then(
          (r) => r.blob()
        );
        return createImageBitmap(blob);
      });

      const loadedBitmaps = await Promise.all(bitmapPromises);
      if (cancelled) return;

      state.images = loadedBitmaps;
      state.loadedCount = loadedBitmaps.length;

      if (canvasRef.current && containerRef.current) {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;

        const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          state.ctx = ctx;

          const centerIdx = Math.floor(loadedBitmaps.length / 2);
          const img = loadedBitmaps[centerIdx];
          if (img) {
            ctx.drawImage(img, 0, 0, container.clientWidth, container.clientHeight);
            state.currentIndex = centerIdx;
          }
        }
      }

      state.ready = true;

      // Hide loading indicator
      if (loadingRef.current) {
        loadingRef.current.style.display = "none";
      }
    };

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [images]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const state = stateRef.current;
      if (!containerRef.current || !canvasRef.current || !state.ready) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.scale(dpr, dpr);
        state.ctx = ctx;

        const currentImg = state.images[state.currentIndex];
        if (currentImg) {
          ctx.drawImage(currentImg, 0, 0, container.clientWidth, container.clientHeight);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mouse handler for cursor tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = stateRef.current;
      if (!state.ready || state.images.length === 0 || !state.ctx) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const xIdx = Math.min(
        Math.max(0, Math.floor(x * state.xSteps)),
        state.xSteps - 1
      );
      const yIdx = Math.min(
        Math.max(0, Math.floor(y * state.ySteps)),
        state.ySteps - 1
      );
      const imageIndex = yIdx * state.xSteps + xIdx;

      if (
        imageIndex === state.currentIndex ||
        imageIndex < 0 ||
        imageIndex >= state.images.length
      )
        return;
      state.currentIndex = imageIndex;

      const img = state.images[imageIndex];
      if (img) {
        state.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      }
    };

    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <Card className="aspect-square p-0 overflow-hidden">
      <div ref={containerRef} className="w-full h-full bg-zinc-900 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />
        <div
          ref={loadingRef}
          className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-900 text-white text-sm"
        >
          Loading...
        </div>
      </div>
    </Card>
  );
}
