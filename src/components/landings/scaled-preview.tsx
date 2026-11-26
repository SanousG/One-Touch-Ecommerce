"use client";

import { useEffect, useRef, useState } from "react";

const BASE_WIDTH = 1280;

/** Renderiza el contenido a ancho de escritorio y lo escala al espacio disponible. */
export function ScaledPreview({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const nextScale = Math.min(1, outer.clientWidth / BASE_WIDTH);
      const nextHeight = Math.ceil(inner.scrollHeight * nextScale);
      setScale((current) => (Math.abs(current - nextScale) > 0.001 ? nextScale : current));
      setHeight((current) => (current === nextHeight ? current : nextHeight));
    };
    update();
    // Solo observamos el contenido: observar el contenedor crea un ciclo donde
    // el scrollbar cambia el ancho y ese ancho vuelve a cambiar la altura.
    const observer = new ResizeObserver(update);
    if (innerRef.current) observer.observe(innerRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden" style={{ height: height || undefined }}>
      <div
        ref={innerRef}
        style={{
          width: BASE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
