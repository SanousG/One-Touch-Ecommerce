"use client";

import { useState } from "react";
import type { StoreImageDTO } from "@/lib/store/service";

type Props = {
  items: StoreImageDTO[];
  height: number;
  radius: number;
  primaryColor: string;
  imageFit: "contain" | "cover";
  positionX: number;
  positionY: number;
  zoom: number;
  initialUrl: string | null;
  showThumbnails: boolean;
};

export function HeroMedia({ items, height, radius, primaryColor, imageFit, positionX, positionY, zoom, initialUrl, showThumbnails }: Props) {
  const initialIndex = Math.max(0, items.findIndex((item) => item.url === initialUrl));
  const [active, setActive] = useState(initialIndex);
  const index = Math.min(active, items.length - 1);
  const current = items[index];
  if (!current) return null;
  const isVideo = current.mimeType.startsWith("video/");
  const cover = imageFit === "cover";
  const frameStyle = { height: `${height}px`, borderRadius: `${radius}px` };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full justify-center" style={frameStyle}>
        {isVideo ? (
          <video
            key={current.id}
            src={current.url}
            controls
            preload="metadata"
            className={cover ? "h-full w-full bg-black object-cover" : "h-full w-auto max-w-full bg-black"}
            style={{ borderRadius: `${radius}px` }}
          />
        ) : cover ? (
          <div className="h-full w-full overflow-hidden bg-background shadow-sm" style={{ borderRadius: `${radius}px` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt="Producto"
              className="h-full w-full object-cover"
              style={{
                objectPosition: `${positionX}% ${positionY}%`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: `${positionX}% ${positionY}%`,
              }}
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.url}
            alt="Producto"
            className="h-full w-auto max-w-full bg-background p-2 shadow-sm"
            style={{ borderRadius: `${radius}px`, objectFit: "contain" }}
          />
        )}
      </div>
      {showThumbnails && items.length > 1 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(itemIndex)}
              aria-label={item.mimeType.startsWith("video/") ? "Ver video" : "Ver foto"}
              className="relative h-16 w-16 overflow-hidden border-2 bg-background"
              style={{
                borderRadius: `${Math.min(radius, 12)}px`,
                borderColor: itemIndex === index ? primaryColor : "transparent",
              }}
            >
              {item.mimeType.startsWith("video/") ? (
                <>
                  <video src={item.url} muted preload="metadata" className="h-full w-full bg-black object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">▶</span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
