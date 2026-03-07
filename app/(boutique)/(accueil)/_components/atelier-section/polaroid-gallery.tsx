import { Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import {
	PolaroidFrame,
	type WashiTapeColor,
	type WashiTapePosition,
} from "@/shared/components/polaroid-frame";
import { cn } from "@/shared/utils/cn";
import { PolaroidDoodles } from "./polaroid-doodles";

// ─── Polaroid Config ────────────────────────────────────────────────────────

type GlowColor = "pink" | "lavender" | "mint" | "yellow";

interface PolaroidConfig {
	id: string;
	caption: string;
	label: string;
	tiltDegree: number;
	washiColor: WashiTapeColor;
	washiPosition: WashiTapePosition;
	captionColor: string;
	captionRotate: number;
	vintage: boolean;
	glowColor: GlowColor;
	scatterClass: string;
	scatterVars: React.CSSProperties;
}

const GLOW_CLASSES: Record<GlowColor, string> = {
	pink: "hover:shadow-[0_0_25px_var(--color-glow-pink),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	lavender: "hover:shadow-[0_0_25px_var(--color-glow-lavender),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	mint: "hover:shadow-[0_0_25px_var(--color-glow-mint),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	yellow: "hover:shadow-[0_0_25px_var(--color-glow-yellow),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
};

const POLAROIDS: PolaroidConfig[] = [
	{
		id: "hands",
		caption: "Les mains dans les perles !",
		label: "Mains de Léane assemblant un bijou",
		tiltDegree: -3,
		washiColor: "pink",
		washiPosition: "top-left",
		captionColor: "var(--polaroid-caption-mauve)",
		captionRotate: -1.5,
		vintage: true,
		glowColor: "pink",
		scatterClass: "lg:-translate-y-2 lg:translate-x-1",
		scatterVars: {
			"--scatter-x": "40px",
			"--scatter-y": "-60px",
			"--scatter-rotate": "-8deg",
		} as React.CSSProperties,
	},
	{
		id: "materials",
		caption: "Mes petits trésors",
		label: "Perles et matériaux colorés Synclune",
		tiltDegree: 1.5,
		washiColor: "lavender",
		washiPosition: "top-right",
		captionColor: "var(--polaroid-caption-violet)",
		captionRotate: 1,
		vintage: true,
		glowColor: "lavender",
		scatterClass: "lg:translate-y-3 lg:-translate-x-1",
		scatterVars: {
			"--scatter-x": "-30px",
			"--scatter-y": "50px",
			"--scatter-rotate": "6deg",
		} as React.CSSProperties,
	},
	{
		id: "inspiration",
		caption: "L'inspiration du jour",
		label: "Carnet d'inspiration de Léane, créatrice Synclune",
		tiltDegree: -1,
		washiColor: "mint",
		washiPosition: "top-left",
		captionColor: "var(--polaroid-caption-green)",
		captionRotate: -0.5,
		vintage: true,
		glowColor: "mint",
		scatterClass: "lg:translate-y-1 lg:translate-x-2",
		scatterVars: {
			"--scatter-x": "50px",
			"--scatter-y": "40px",
			"--scatter-rotate": "10deg",
		} as React.CSSProperties,
	},
	{
		id: "workspace",
		caption: "Mon coin créatif",
		label: "Vue de l'atelier Synclune",
		tiltDegree: 2.5,
		washiColor: "peach",
		washiPosition: "top-right",
		captionColor: "var(--polaroid-caption-brown)",
		captionRotate: 0.8,
		vintage: true,
		glowColor: "yellow",
		scatterClass: "lg:-translate-y-3 lg:-translate-x-1",
		scatterVars: {
			"--scatter-x": "-40px",
			"--scatter-y": "-50px",
			"--scatter-rotate": "-12deg",
		} as React.CSSProperties,
	},
];

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

					{/* Mobile < 400px: horizontal carousel */}
					<div className="mask-carousel-edges scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 min-[400px]:hidden">
						{POLAROIDS.map((p) => (
							<div key={p.id} className="w-[75vw] shrink-0 snap-center">
								<PolaroidFrame
									tiltDegree={p.tiltDegree}
									caption={p.caption}
									captionColor={p.captionColor}
									captionRotate={p.captionRotate}
									washiTape
									washiColor={p.washiColor}
									washiPosition={p.washiPosition}
									vintage={p.vintage}
									className={cn(
										"motion-safe:transition-shadow motion-safe:duration-300",
										GLOW_CLASSES[p.glowColor],
									)}
								>
									<PlaceholderImage className="h-full w-full" label={p.label} />
								</PolaroidFrame>
							</div>
						))}

						{/* Scroll progress bar */}
						<div
							className="bg-secondary/20 pointer-events-none absolute right-4 bottom-0 left-4 h-0.5 rounded-full"
							aria-hidden="true"
						>
							<div className="carousel-progress bg-secondary/60 h-full w-1/4 rounded-full" />
						</div>
					</div>

					{/* 400px+: grid layout with Stagger */}
					<Stagger
						stagger={MOTION_CONFIG.stagger.slow}
						y={MOTION_CONFIG.section.grid.y}
						inView
						once
						className="mx-auto hidden max-w-5xl grid-cols-2 gap-4 min-[400px]:grid sm:gap-6 lg:grid-cols-4 lg:gap-2"
					>
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
									"motion-safe:transition-shadow motion-safe:duration-300",
									GLOW_CLASSES[p.glowColor],
								)}
								style={p.scatterVars}
							>
								<PlaceholderImage className="h-full w-full" label={p.label} />
							</PolaroidFrame>
						))}
					</Stagger>
				</div>
			</div>
		</Reveal>
	);
}
