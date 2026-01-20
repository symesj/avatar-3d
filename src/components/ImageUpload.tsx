"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  onImageSelect: (imageBase64: string, previewUrl: string) => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelect, disabled }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        const base64Data = base64.split(",")[1];
        onImageSelect(base64Data, base64);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    disabled,
  });

  return (
    <Card
      {...getRootProps()}
      className={`cursor-pointer transition-colors ${
        isDragActive ? "border-primary bg-primary/5" : "border-dashed"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <CardContent className="flex items-center justify-center p-4 h-[100px]">
        <input {...getInputProps()} />
        {preview ? (
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 flex-shrink-0">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover rounded-md"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Image selected</p>
              <p className="text-xs">Click or drop to replace</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-center">
            {isDragActive ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
            <div className="text-sm">
              {isDragActive ? (
                <p className="text-muted-foreground">Drop here</p>
              ) : (
                <p className="text-muted-foreground">Drop image or click to upload</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
