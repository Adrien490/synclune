"use client";

import { Fade, Stagger } from "@/shared/components/animations";
import { cn } from "@/shared/utils/cn";
import { Heart, MapPin, Paintbrush, Sparkles } from "lucide-react";

interface ValuePillar {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	/** Glow coloré au hover (Tendance 2026: Micro-interactions 2.0 + ambient glow) */
	glowClass: string;
}

const valuePillars: ValuePillar[] = [
	{
		icon: <Paintbrush className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "Fait main",
		subtitle: "Chaque pièce est unique",
		glowClass: "group-hover:shadow-[0_0_25px_oklch(0.86_0.1_341/0.4)]",
	},
	{
		icon: <MapPin className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "Créé à Nantes",
		subtitle: "Artisanat local 44",
		glowClass: "group-hover:shadow-[0_0_25px_oklch(0.75_0.12_280/0.35)]",
	},
	{
		icon: <Sparkles className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "Couleurs vibrantes",
		subtitle: "Des bijoux qui vous ressemblent",
		glowClass: "group-hover:shadow-[0_0_25px_oklch(0.82_0.14_160/0.4)]",
	},
	{
		icon: <Heart className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
		title: "Avec amour",
		subtitle: "De mon atelier à votre boîte",
		glowClass: "group-hover:shadow-[0_0_25px_oklch(0.92_0.09_86/0.5)]",
	},
];

/**
 * Value Proposition Bar - "L'ADN Synclune"
 *
 * Barre horizontale communiquant instantanément les valeurs artisanales.
 * 4 piliers : Fait main, Créé à Nantes, Couleurs vibrantes, Avec amour.
 *
 * Design:
 * - Fond muted subtil (respecte le thème)
 * - Icônes avec animation hover (scale)
 * - Responsive: 4 colonnes desktop, 2x2 mobile
 * - Animation stagger à l'entrée
 */
export function ValuePropositionBar() {
	return (
		<Fade y={10} duration={0.6}>
			<section
				id="value-proposition"
				aria-labelledby="value-proposition-title"
				itemScope
				itemType="https://schema.org/ItemList"
				data-voice-queries="bijoux faits main Nantes,artisan bijoutier Nantes,bijoux colorés artisanaux"
				data-content-type="brand-values"
				data-ai-category="unique-selling-points"
				className="relative overflow-hidden py-8 sm:py-10 lg:py-12 bg-muted/30"
			>
				{/* Microdata pour SEO */}
				<meta itemProp="name" content="Les valeurs Synclune" />
				<meta itemProp="numberOfItems" content="4" />

				{/* Titre accessible mais visuellement masqué */}
				<h2 id="value-proposition-title" className="sr-only">
					Les valeurs Synclune : bijoux artisanaux faits main à Nantes
				</h2>

				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<Stagger
						stagger={0.1}
						y={15}
						inView
						once
						className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
					>
						{valuePillars.map((pillar, index) => (
							<div
								key={pillar.title}
								role="group"
								aria-label={pillar.title}
								itemScope
								itemType="https://schema.org/ListItem"
								itemProp="itemListElement"
								className="group flex flex-col items-center text-center gap-3 p-4 rounded-xl motion-safe:transition-all motion-safe:duration-300 hover:bg-card/80 active:scale-[0.98] active:bg-card/90"
							>
								<meta itemProp="position" content={String(index + 1)} />

								{/* Icône avec animation hover + glow coloré */}
								<div
									className={cn(
										"flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card shadow-sm motion-safe:transition-all motion-safe:duration-300",
										"border border-border/30 text-foreground/70",
										"group-hover:scale-110 group-hover:text-foreground",
										pillar.glowClass
									)}
								>
									{pillar.icon}
								</div>

								{/* Texte */}
								<div className="space-y-1">
									<h3
										itemProp="name"
										className="font-semibold text-foreground text-sm sm:text-base tracking-tight"
									>
										{pillar.title}
									</h3>
									<p
										itemProp="description"
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
