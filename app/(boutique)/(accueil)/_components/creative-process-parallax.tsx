"use client";

import { cn } from "@/shared/utils/cn";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useInView,
} from "motion/react";
import { useRef } from "react";

/**
 * Composant de parallax multicouches pour la section Creative Process
 * Tendance 2026: 3D depth effects + parallax layering
 *
 * 3 couches à vitesses différentes:
 * - Couche 1 (lente): blobs colorés flous
 * - Couche 2 (moyenne): silhouettes de bijoux
 * - Couche 3 (rapide): sparkles/étoiles
 *
 * Performance: CSS animations pausées quand off-screen pour économiser GPU
 */
export function CreativeProcessParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(containerRef, { margin: "100px 0px" });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Transformations parallax pour chaque couche
  const layer1Y = useTransform(scrollYProgress, [0, 1], [0, 50]); // Lent
  const layer2Y = useTransform(scrollYProgress, [0, 1], [0, 100]); // Moyen
  const layer3Y = useTransform(scrollYProgress, [0, 1], [0, 150]); // Rapide

  // Si reduced motion, pas de parallax
  if (shouldReduceMotion) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <StaticDecorations />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Couche 1: Blobs colorés flous (lent) - animation pausée si off-screen */}
      <motion.div className="absolute inset-0" style={{ y: layer1Y }}>
        <div
          className="absolute top-[10%] left-[5%] w-32 h-32 rounded-full bg-primary/10 blur-2xl animate-[blob-float-1_20s_ease-in-out_infinite]"
          style={{ animationPlayState: isInView ? "running" : "paused" }}
        />
        <div
          className="absolute top-[60%] right-[10%] w-40 h-40 rounded-full bg-secondary/15 blur-2xl animate-[blob-float-2_25s_ease-in-out_infinite]"
          style={{ animationPlayState: isInView ? "running" : "paused" }}
        />
        <div
          className="absolute bottom-[20%] left-[15%] w-28 h-28 rounded-full bg-[oklch(0.75_0.12_280/0.12)] blur-2xl animate-[blob-float-3_22s_ease-in-out_infinite]"
          style={{ animationPlayState: isInView ? "running" : "paused" }}
        />
      </motion.div>

      {/* Couche 2: Silhouettes de bijoux (moyen) */}
      <motion.div className="absolute inset-0" style={{ y: layer2Y }}>
        {/* Boucle d'oreille stylisée */}
        <svg
          className="absolute top-[15%] right-[20%] w-8 h-12 text-primary/20"
          viewBox="0 0 24 36"
          fill="currentColor"
        >
          <circle cx="12" cy="4" r="3" />
          <path
            d="M12 7 L12 15 Q12 25 8 30 Q4 35 12 35 Q20 35 16 30 Q12 25 12 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="12" cy="32" r="2" />
        </svg>

        {/* Perle */}
        <svg
          className="absolute top-[45%] left-[8%] w-6 h-6 text-secondary/25"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="8" cy="8" rx="3" ry="2" fill="white" fillOpacity="0.3" />
        </svg>

        {/* Bracelet/anneau */}
        <svg
          className="absolute bottom-[30%] right-[12%] w-10 h-10 text-primary/15"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <circle cx="20" cy="20" r="15" />
          <circle cx="20" cy="20" r="12" />
        </svg>
      </motion.div>

      {/* Couche 3: Sparkles/étoiles (rapide) - animation pausée si off-screen */}
      <motion.div className="absolute inset-0" style={{ y: layer3Y }}>
        <Sparkle
          className="absolute top-[8%] left-[25%] w-4 h-4 text-secondary/40"
          delay={0}
          isInView={isInView}
        />
        <Sparkle
          className="absolute top-[25%] right-[30%] w-3 h-3 text-primary/35"
          delay={1}
          isInView={isInView}
        />
        <Sparkle
          className="absolute top-[50%] left-[18%] w-5 h-5 text-secondary/30"
          delay={2}
          isInView={isInView}
        />
        <Sparkle
          className="absolute top-[70%] right-[25%] w-3 h-3 text-primary/40"
          delay={0.5}
          isInView={isInView}
        />
        <Sparkle
          className="absolute bottom-[15%] left-[30%] w-4 h-4 text-[oklch(0.75_0.12_280/0.35)]"
          delay={1.5}
          isInView={isInView}
        />
      </motion.div>
    </div>
  );
}

/**
 * Composant sparkle/étoile animé - animation pausée si off-screen
 */
function Sparkle({
  className,
  delay = 0,
  isInView = true,
}: {
  className?: string;
  delay?: number;
  isInView?: boolean;
}) {
  return (
    <svg
      className={cn("animate-sparkle-pulse", className)}
      style={{
        animationDelay: `${delay}s`,
        animationPlayState: isInView ? "running" : "paused",
      }}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

/**
 * Décorations statiques pour reduced motion
 */
function StaticDecorations() {
  return (
    <>
      <div className="absolute top-[10%] left-[5%] w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute top-[60%] right-[10%] w-40 h-40 rounded-full bg-secondary/15 blur-2xl" />
      <div className="absolute bottom-[20%] left-[15%] w-28 h-28 rounded-full bg-[oklch(0.75_0.12_280/0.12)] blur-2xl" />
    </>
  );
}
