"use client";

import { motion, useReducedMotion } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

interface BlobConfig {
  id: string;
  color: string;
  size: string;
  position: { top?: string; right?: string; bottom?: string; left?: string };
  animation: "blob-float-1" | "blob-float-2" | "blob-float-3";
  delay: string;
}

const blobs: BlobConfig[] = [
  {
    id: "rose",
    color: "oklch(0.9 0.08 340 / 0.4)",
    size: "60%",
    position: { top: "-10%", left: "-10%" },
    animation: "blob-float-1",
    delay: "0s",
  },
  {
    id: "or",
    color: "oklch(0.92 0.09 80 / 0.35)",
    size: "50%",
    position: { top: "20%", right: "-15%" },
    animation: "blob-float-2",
    delay: "-5s",
  },
  {
    id: "lavande",
    color: "oklch(0.9 0.06 290 / 0.3)",
    size: "55%",
    position: { bottom: "-20%", left: "20%" },
    animation: "blob-float-3",
    delay: "-10s",
  },
  {
    id: "peche",
    color: "oklch(0.93 0.07 60 / 0.25)",
    size: "40%",
    position: { top: "50%", right: "10%" },
    animation: "blob-float-1",
    delay: "-15s",
  },
];

export function AuroraBackground() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
      style={{ contain: "layout paint" }}
    >
      {/* Blobs animés - desktop uniquement */}
      <div className="hidden md:block absolute inset-0">
        {blobs.map((blob, i) => (
          <motion.div
            key={blob.id}
            className="absolute rounded-full blur-2xl will-change-transform"
            style={{
              width: blob.size,
              aspectRatio: "1",
              background: blob.color,
              transform: "translateZ(0)",
              ...blob.position,
              animation: shouldReduceMotion
                ? "none"
                : `${blob.animation} ${MOTION_CONFIG.background.blob.cycle}s ease-in-out infinite`,
              animationDelay: shouldReduceMotion ? undefined : blob.delay,
            }}
            initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: shouldReduceMotion
                ? 0
                : MOTION_CONFIG.background.blob.fadeIn,
              delay: shouldReduceMotion
                ? 0
                : i * MOTION_CONFIG.background.blob.stagger,
            }}
          />
        ))}
      </div>

      {/* Fallback mobile - gradient statique */}
      <div className="md:hidden absolute inset-0 bg-linear-to-br from-[oklch(0.95_0.04_340)] via-transparent to-[oklch(0.95_0.05_80)]" />

      {/* Overlay pour contraste texte */}
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
}
