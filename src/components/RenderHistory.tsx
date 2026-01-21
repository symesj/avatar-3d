"use client";

import { useState, useCallback, useReducer } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getSavedRenders,
  deleteRender,
  clearAllRenders,
  type SavedRender,
} from "@/lib/storage";
import { Box, MousePointer2, X, ChevronDown, ChevronUp } from "lucide-react";

interface RenderHistoryProps {
  onLoadRender?: (render: SavedRender) => void;
  refreshTrigger?: number;
}

// Custom hook to get renders with force update capability
function useRenders(refreshTrigger?: number) {
  // Use reducer to force re-renders
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Read directly from localStorage on each render
  // This is safe because it's a synchronous read during render
  const renders = typeof window !== "undefined" ? getSavedRenders() : [];

  // Force re-render when refreshTrigger changes (tracked via closure)
  void refreshTrigger;

  return { renders, forceUpdate };
}

export function RenderHistory({ onLoadRender, refreshTrigger }: RenderHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { renders, forceUpdate } = useRenders(refreshTrigger);

  const refresh = useCallback(() => {
    forceUpdate();
  }, [forceUpdate]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteRender(id);
    refresh();
    if (selectedId === id) setSelectedId(null);
  };

  const handleClearAll = () => {
    if (confirm("Delete all saved renders? This cannot be undone.")) {
      clearAllRenders();
      refresh();
      setSelectedId(null);
    }
  };

  const handleSelect = (render: SavedRender) => {
    setSelectedId(render.id);
    onLoadRender?.(render);
  };

  if (renders.length === 0) {
    return null;
  }

  const displayedRenders = isExpanded ? renders : renders.slice(0, 4);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Recent Renders</span>
        <div className="flex gap-1">
          {renders.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  More ({renders.length})
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClearAll}
          >
            Clear all
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {displayedRenders.map((render) => (
          <RenderCard
            key={render.id}
            render={render}
            isSelected={selectedId === render.id}
            onSelect={() => handleSelect(render)}
            onDelete={(e) => handleDelete(render.id, e)}
          />
        ))}
      </div>
    </Card>
  );
}

interface RenderCardProps {
  render: SavedRender;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function RenderCard({ render, isSelected, onSelect, onDelete }: RenderCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`relative aspect-square rounded-md overflow-hidden cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-muted-foreground"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={render.previewThumbnail}
        alt="Render preview"
        className="w-full h-full object-cover"
      />

      {/* Mode badge */}
      <div className="absolute top-1 left-1">
        {render.mode === "3d-model" ? (
          <Box className="h-3 w-3 text-white drop-shadow-md" />
        ) : (
          <MousePointer2 className="h-3 w-3 text-white drop-shadow-md" />
        )}
      </div>

      {/* Delete button */}
      {showActions && (
        <button
          className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-red-500 transition-colors"
          onClick={onDelete}
        >
          <X className="h-3 w-3 text-white" />
        </button>
      )}
    </div>
  );
}

