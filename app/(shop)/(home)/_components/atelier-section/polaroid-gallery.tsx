import { PolaroidFrame } from "@/shared/components/polaroid-frame";
import { cn } from "@/shared/utils/cn";
import { PolaroidDoodles } from "./polaroid-doodles";
import { GLOW_CLASSES, GLOW_CSS_VARS, POLAROIDS } from "./polaroid-config";
import { POLAROID_ILLUSTRATIONS } from "./polaroid-illustrations-map";

// ─── Component ──────────────────────────────────────────────────────────────

export function PolaroidGallery() {
	return (
		<div className="mt-12 sm:mt-16">
			<div role="region" aria-label="Galerie illustrée de l'atelier Synclune" className="relative">
				<PolaroidDoodles />

				{/* Items rely on .polaroid-scatter (animation-timeline: view()) — pas de wrapper Framer (Reveal/Stagger) pour éviter conflit double-animation timing avec scroll-driven CSS */}
				<div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 min-[340px]:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-4">
					{POLAROIDS.map((p) => {
						const Illustration = POLAROID_ILLUSTRATIONS[p.id];

						return (
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
								aspectRatio="landscape"
								className={cn(p.scatterClass, "polaroid-scatter", GLOW_CLASSES[p.glowColor])}
								style={
									{
										...p.scatterVars,
										"--glow-color": GLOW_CSS_VARS[p.glowColor],
									} as React.CSSProperties
								}
							>
								{/* Scène illustrée sur fond teinté par le glow du polaroid.
								    TODO(photos-atelier) : remplacer ce bloc par <Image src={photo} alt={p.label} …> */}
								<div
									className="flex h-full w-full items-center justify-center p-3"
									style={{
										background: "color-mix(in oklab, var(--glow-color) 45%, var(--background))",
									}}
								>
									{Illustration && <Illustration />}
								</div>
							</PolaroidFrame>
						);
					})}
				</div>
			</div>
		</div>
	);
}
