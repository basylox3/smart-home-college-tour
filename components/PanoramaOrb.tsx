"use client";

import { type CSSProperties, useState } from "react";

type PanoramaOrbProps = {
  image: string;
  title: string;
  accent: string;
  compact?: boolean;
};

export function PanoramaOrb({ image, title, accent, compact = false }: PanoramaOrbProps) {
  const [offset, setOffset] = useState(42);

  return (
    <div
      className={compact ? "panorama-orb panorama-orb--compact" : "panorama-orb"}
      style={{ "--panorama-accent": accent } as CSSProperties}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const nextOffset = ((event.clientX - bounds.left) / bounds.width) * 100;
        setOffset(Math.max(0, Math.min(100, nextOffset)));
      }}
    >
      <div
        className="panorama-orb__surface"
        role="img"
        aria-label={`Панорамный вид: ${title}`}
        style={{
          backgroundImage: `url(${image})`,
          backgroundPosition: `${offset}% center`,
        }}
      />
      <span className="panorama-orb__shine" />
      <span className="panorama-orb__label">360</span>
    </div>
  );
}
