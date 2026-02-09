import { Fade, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { Heart, MapPin, Paintbrush, Sparkles } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";

interface ValuePillar {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	/** Colored glow on hover */
	glowClass: string;
	/** Subtle color at rest, vivid on hover */
	iconColorClass: string;
	/** Unique micro-animation on hover */
	iconHoverClass: string;
	/** Color for the hand-drawn underline accent */
	underlineColor: string;
}

const valuePillars: ValuePillar[] = [
	{
		icon: <Paintbrush className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "Fait main",
		subtitle: "Chaque pièce est unique !",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-pink)]",
		iconColorClass: "text-pink-400/70 group-hover:text-pink-500",
		iconHoverClass: "group-hover:rotate-[-15deg]",
		underlineColor: "oklch(0.86 0.1 341 / 0.5)",
	},
	{
		icon: <MapPin className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "Créé à Nantes",
		subtitle: "Dans mon petit atelier",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-lavender)]",
		iconColorClass: "text-violet-400/70 group-hover:text-violet-500",
		iconHoverClass: "group-hover:translate-y-[-2px]",
		underlineColor: "oklch(0.75 0.12 280 / 0.45)",
	},
	{
		icon: <Sparkles className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "De la couleur",
		subtitle: "Et de l'originalité !",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-mint)]",
		iconColorClass: "text-emerald-400/70 group-hover:text-emerald-500",
		iconHoverClass: "group-hover:rotate-[15deg] group-hover:scale-115",
		underlineColor: "oklch(0.82 0.14 160 / 0.5)",
	},
	{
		icon: <Heart className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "Avec amour",
		subtitle: "Pour vous ou vos proches !",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-yellow)]",
		iconColorClass: "text-amber-400/70 group-hover:text-amber-500",
		iconHoverClass: "group-hover:scale-120",
		underlineColor: "oklch(0.92 0.09 86 / 0.6)",
	},
];

/** Inline hand-drawn underline SVG accent */
function HandDrawnUnderlineSVG({ color }: { color: string }) {
	return (
		<svg
			className="w-16 h-2 mx-auto mt-1"
			viewBox="0 0 120 12"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M2 9 Q30 4, 60 7 Q90 10, 118 5"
				stroke={color}
				strokeWidth="2.5"
				strokeLinecap="round"
				fill="none"
			/>
		</svg>
	);
}

/**
 * Value Proposition Bar - Synclune brand pillars.
 *
 * 4 pillars: Handmade, Made in Nantes, Colorful, With love.
 * Responsive: 2x2 grid on mobile, 4 columns on desktop.
 */
export async function ValuePropositionBar() {
	"use cache";
	cacheLife("reference");
	cacheTag("value-proposition-bar");

	return (
		<Fade y={MOTION_CONFIG.section.subtitle.y} duration={MOTION_CONFIG.section.title.duration}>
			<section
				id="value-proposition"
				aria-labelledby="value-proposition-title"
				data-voice-queries="bijoux faits main Nantes,artisan bijoutier Nantes,bijoux colorés artisanaux"
				data-content-type="brand-values"
				data-ai-category="unique-selling-points"
				className={`relative overflow-hidden ${SECTION_SPACING.compact} bg-gradient-to-b from-muted/20 via-muted/40 to-muted/20`}
			>
				{/* JSON-LD Schema for SEO */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "ItemList",
							name: "Les valeurs Synclune",
							numberOfItems: valuePillars.length,
							itemListElement: valuePillars.map((pillar, index) => ({
								"@type": "ListItem",
								position: index + 1,
								name: pillar.title,
								description: pillar.subtitle,
							})),
						}).replace(/</g, "\\u003c"),
					}}
				/>

				{/* Visually hidden accessible title */}
				<h2 id="value-proposition-title" className="sr-only">
					Les valeurs Synclune : bijoux artisanaux faits main à Nantes
				</h2>

				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<Stagger
						stagger={MOTION_CONFIG.stagger.slow}
						y={15}
						inView
						once
						role="list"
						className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
					>
						{valuePillars.map((pillar) => (
							<div
								key={pillar.title}
								role="listitem"
								className="group flex flex-col items-center text-center gap-3 p-4 rounded-xl motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none hover:bg-card/80 active:scale-[0.98] active:bg-card/90"
							>

								{/* Icon with hover animation + colored glow */}
								<div
									className={cn(
										"flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card shadow-sm",
										"motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none",
										"border border-border/30",
										pillar.iconColorClass,
										pillar.iconHoverClass,
										pillar.glowClass,
									)}
								>
									{pillar.icon}
								</div>

								{/* Text */}
								<div className="space-y-1">
									<h3
										className="font-semibold text-foreground text-sm sm:text-base tracking-tight"
									>
										{pillar.title}
									</h3>
									<HandDrawnUnderlineSVG color={pillar.underlineColor} />
									<p
										className="text-sm text-muted-foreground leading-snug line-clamp-2"
									>
										{pillar.subtitle}
									</p>
								</div>
							</div>
						))}
					</Stagger>
				</div>
			</section>
		</Fade>
	);
}
