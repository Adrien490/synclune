import { Reveal } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { PolaroidFrame } from "@/shared/components/polaroid-frame";
import { cn } from "@/shared/utils/cn";
import { PolaroidDoodles } from "./polaroid-doodles";
import { GLOW_CLASSES, GLOW_CSS_VARS, POLAROIDS } from "./polaroid-config";

// ─── Component ──────────────────────────────────────────────────────────────

export function PolaroidGallery() {
	return (
		<Reveal
			y={MOTION_CONFIG.section.grid.y}
			delay={0.3}
			duration={MOTION_CONFIG.section.title.duration}
			once
		>
			<div className="mt-12 sm:mt-16">
				<div role="region" aria-label="Galerie photos de l'atelier Synclune" className="relative">
					<PolaroidDoodles />

					{/* Items rely on .polaroid-scatter (animation-timeline: view()) — no Framer Stagger to avoid double-animation timing conflict */}
					<div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 min-[340px]:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-4">
						{POLAROIDS.map((p) => (
							<PolaroidFrame
								key={p.id}
								tiltDegree={p.tiltDegree}
								caption={p.caption}
								captionColor={p.captionColor}
								captionRotate={p.captionRotate}
								washiTape
								washiColor={p.washiColor}
								washiPosition={p.washiPosition}
								vintage={p.vintage}
								className={cn(
									p.scatterClass,
									"polaroid-scatter",
									"motion-safe:transition-shadow motion-safe:duration-[var(--duration-slow)]",
									GLOW_CLASSES[p.glowColor],
								)}
								style={
									{
										...p.scatterVars,
										"--glow-color": GLOW_CSS_VARS[p.glowColor],
									} as React.CSSProperties
								}
							>
								<PlaceholderImage preserveAspect className="h-full w-full" label={p.label} />
							</PolaroidFrame>
						))}
					</div>
				</div>
			</div>
		</Reveal>
	);
}
