"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ParticleBackground = dynamic(
  () =>
    import("@/shared/components/animations").then(
      (mod) => mod.ParticleBackground,
    ),
  { ssr: false },
);

/**
 * Desktop-only ParticleBackground wrapper.
 * Avoids sending ~30KB JS to mobile where particles are hidden.
 * Uses matchMedia to detect desktop before mounting.
 */
export function DesktopParticles() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mql.matches);

    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  if (!isDesktop) return null;

  return (
    <ParticleBackground
      shape={["heart", "pearl"]}
      colors={[
        "var(--primary)",
        "var(--secondary)",
        "oklch(0.78 0.15 340)", // Rose vif
        "oklch(0.75 0.12 280)", // Lavande
        "oklch(0.82 0.14 160)", // Menthe
      ]}
      count={10}
      size={[40, 80]}
      opacity={[0.25, 0.45]}
      blur={[5, 14]}
      animationStyle="drift"
      depthParallax={true}
    />
  );
}
