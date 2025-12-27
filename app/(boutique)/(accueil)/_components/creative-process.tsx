import { Fade, Reveal, Stagger } from "@/shared/components/animations";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/section-title";
import { IMAGES } from "@/shared/constants/images";
import { STEP_COLORS } from "@/shared/constants/process-steps";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { CheckCircle, Hammer, Lightbulb, Pencil, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Lazy load client components (code-split framer-motion)
const ParallaxImage = dynamic(() =>
	import("./parallax-image").then((mod) => mod.ParallaxImage)
);

const ScrollProgressLine = dynamic(() =>
	import("./scroll-progress-line").then((mod) => mod.ScrollProgressLine)
);

interface ProcessStep {
	id: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	color: string;
	/** Animation CSS au hover du groupe */
	iconHoverClass: string;
}

// Étapes du processus créatif - données statiques
const processSteps: ProcessStep[] = [
	{
		id: "idea",
		icon: <Lightbulb className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "D'abord, une idée",
		description:
			"L'idée naît souvent de mon quotidien. J'essaye de ne pas me forcer à avoir une idée, mais plutôt laisser l'inspiration venir d'elle même !",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:text-yellow-500 group-hover:[&_svg]:drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]",
	},
	{
		id: "drawing",
		icon: <Pencil className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "Le dessin et la peinture",
		description:
			"Je dessine mes motifs sur du plastique fou, puis je passe à la peinture. C'est minutieux et ça demande de la concentration, mais j'adore cette étape !",
		color: STEP_COLORS.accent,
		iconHoverClass: "group-hover:[&_svg]:rotate-[-15deg]",
	},
	{
		id: "assembly",
		icon: <Hammer className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "La cuisson et l'assemblage",
		description:
			"Cuisson au four, vernissage, montage sur les supports... Parfois il y a des surprises (le plastique fou, c'est pas toujours prévisible), mais ça fait partie du charme de l'artisanat",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:translate-y-[-2px] group-hover:[&_svg]:rotate-[-8deg]",
	},
	{
		id: "finishing",
		icon: <CheckCircle className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "La touche finale",
		description:
			"Je polis, je vérifie chaque détail... (Bon, je suis un peu perfectionniste !) Et voilà, c'est prêt !",
		color: STEP_COLORS.accent,
		iconHoverClass: "group-hover:[&_svg]:scale-110",
	},
];

/**
 * Système de crescendo visuel progressif
 * Chaque étape gagne en intensité jusqu'à l'aboutissement final
 */
const STEP_INTENSITY = [
	// Étape 1 - Subtil (début du parcours)
	{ ring: "", shadow: "", scale: "" },
	// Étape 2 - Léger (progression)
	{ ring: "ring-1 ring-secondary/10", shadow: "shadow-sm shadow-secondary/20", scale: "" },
	// Étape 3 - Modéré (montée en puissance)
	{ ring: "ring-1 ring-secondary/20", shadow: "shadow-md shadow-secondary/30", scale: "" },
	// Étape 4 - Climax (aboutissement)
	{ ring: "ring-2 ring-secondary/30", shadow: "shadow-lg shadow-secondary/40", scale: "" },
] as const;

/**
 * Section Processus Créatif - Raconte l'histoire de création des bijoux
 *
 * Pattern : Server Component avec cache public car contenu 100% statique
 * - 4 étapes du processus (Inspiration → Esquisse → Création → Finition)
 * - Image d'atelier avec badge artisanal "Fait main à Nantes"
 * - Timeline visuelle avec animations stagger au scroll
 * - CTA vers page contact pour créations personnalisées
 * - Signature manuscrite de la créatrice (Dancing Script)
 *
 * Design Features:
 * - Ligne verticale décorative reliant les étapes (desktop)
 * - Halo rose/doré autour de l'image (effet "aura magique")
 * - Particules décoratives en arrière-plan (variant: minimal)
 * - Responsive : icônes desktop vs numéros mobile pour meilleur guidage
 *
 * @example
 * ```tsx
 * // Dans homepage
 * <CreativeProcess />
 * ```
 */
export function CreativeProcess() {
	return (
		<section
			className={cn("relative overflow-hidden bg-background", SECTION_SPACING.section)}
			aria-labelledby="creative-process-title"
		>
			{/* Skip link pour accessibilité */}
			<a
				href="#cta-personnalisation"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-secondary focus:text-secondary-foreground focus:rounded-md focus:shadow-md"
			>
				Aller au bouton de contact
			</a>

			<div className="absolute inset-0" aria-hidden="true">
				<ParticleSystem
					count={6}
					shape="diamond"
					colors={["var(--secondary)", "oklch(0.95 0.06 70)", "oklch(0.97 0.03 80)"]}
					opacity={[0.12, 0.35]}
					blur={[15, 45]}
				/>
			</div>

			<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-12 lg:mb-16">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="creative-process-title">
							Comment je crée tes bijoux
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto">
							De l'inspiration à la finition
							<span className="hidden sm:inline">
								, voici quelques étapes explicatives !
							</span>
							.
						</p>
					</Fade>
				</header>

				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Image atelier avec animation d'entrée - Image en premier sur mobile */}
					<Reveal
						y={20}
						duration={0.6}
						delay={0.2}
						className="relative order-1 h-56 sm:h-80 lg:h-full"
					>
						<div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-xl">
							<ParallaxImage
								src={IMAGES.ATELIER}
								alt="Atelier de création Synclune - Bijoux colorés faits main à Nantes"
								blurDataURL={IMAGES.ATELIER_BLUR}
								className="object-cover object-center saturate-[1.05] brightness-[1.02]"
							/>

							{/* Badge Fait main - contraste renforcé */}
							<div
								className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-secondary backdrop-blur-md border-2 border-white/30 rounded-full shadow-lg"
								aria-hidden="true"
							>
								<span className="text-xs/5 font-bold tracking-wider antialiased text-secondary-foreground">
									Fait main à Nantes
								</span>
							</div>

							{/* Halo décoratif - Aura magique rose/doré */}
							<div
								className="absolute -inset-8 bg-linear-to-br from-primary/20 to-accent/20 rounded-2xl -z-10 blur-3xl"
								aria-hidden="true"
							/>
						</div>
					</Reveal>

					{/* Timeline processus */}
					<div className="relative order-2">
						<div className="relative space-y-8 sm:space-y-12 lg:space-y-16">
							{/* Ligne verticale animée au scroll (desktop) */}
							<ScrollProgressLine />

							{/* Ligne verticale simplifiée (mobile) */}
							<div
								className="absolute left-[22px] top-8 bottom-8 w-px bg-secondary/30 sm:hidden transition-colors duration-300"
								aria-hidden="true"
							/>

							<Stagger
								role="list"
								stagger={0.08}
								y={25}
								delay={0}
								inView
								once={true}
							>
								{processSteps.map((step, index) => (
									<article
										key={step.id}
										role="listitem"
										className="flex items-start gap-4 group relative rounded-xl p-2 -m-2 transition-all duration-300 hover:bg-muted/30 hover:-translate-y-0.5 active:bg-muted/40 active:scale-[0.99]"
									>
										{/* Accessibilité : numéro d'étape pour lecteurs d'écran */}
										<span className="sr-only">Étape {index + 1} :</span>

										{/* Desktop : Icônes dans cercles avec ligne verticale */}
										<div
											className={cn(
												"hidden sm:flex shrink-0 w-12 h-12 rounded-full border-2 items-center justify-center transition-all duration-300 relative z-20",
												step.color,
												// Animation hover subtile : légère rotation et scale
												"group-hover:scale-110 group-hover:-rotate-3",
												// Micro-interaction icône spécifique
												step.iconHoverClass,
												// Crescendo progressif : intensité croissante
												STEP_INTENSITY[index].ring,
												STEP_INTENSITY[index].shadow,
												STEP_INTENSITY[index].scale
											)}
										>
											{step.icon}
										</div>

										{/* Mobile : Numéros colorés plus visibles (guidage progression) - 44px WCAG */}
										<div
											aria-hidden="true"
											className={cn(
												"flex sm:hidden shrink-0 w-11 h-11 rounded-full items-center justify-center font-bold text-lg transition-all duration-300",
												step.color,
												"group-hover:scale-110",
												// Crescendo progressif : intensité croissante
												STEP_INTENSITY[index].ring,
												STEP_INTENSITY[index].shadow
											)}
										>
											{index + 1}
										</div>

										<div className="flex-1 pb-8">
											<h3 className="text-xl/7 font-semibold text-foreground mb-2 tracking-tight antialiased">
												{/* Numérotation visible seulement sur desktop (mobile a déjà le numéro dans le cercle) */}
												<span className="hidden sm:inline" aria-hidden="true">
													{index + 1}.{" "}
												</span>
												{step.title}
												{/* Sparkles sur l'étape finale (climax) */}
												{index === 3 && (
													<Sparkles
														className="inline-block w-4 h-4 ml-1.5 text-secondary opacity-70 transition-opacity group-hover:opacity-100"
														aria-hidden="true"
													/>
												)}
											</h3>
											<p className="text-base/7 tracking-normal antialiased text-muted-foreground">
												{step.description}
											</p>
										</div>
									</article>
								))}
							</Stagger>
						</div>

						{/* CTA intégré comme continuation naturelle du processus */}
						<div className="mt-4 flex items-start gap-4 group relative rounded-xl p-2 -m-2">
							{/* Desktop : Icône dans cercle en pointillés */}
							<div
								className="hidden sm:flex shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-secondary/50 items-center justify-center transition-all duration-300 group-hover:border-secondary group-hover:scale-105"
								aria-hidden="true"
							>
								<Sparkles className="w-5 h-5 text-secondary" />
							</div>

							{/* Mobile : Numéro bonus */}
							<div
								className="flex sm:hidden shrink-0 w-11 h-11 rounded-full border-2 border-dashed border-secondary/50 items-center justify-center text-secondary font-bold"
								aria-hidden="true"
							>
								+
							</div>

							<div className="flex-1">
								<p className="text-sm text-muted-foreground mb-3 italic">
									Tu as une idée de bijou personnalisé ? N'hésite pas à m'en parler !
								</p>
								<Button
									id="cta-personnalisation"
									asChild
									variant="secondary"
									size="lg"
									className="w-full sm:w-auto shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
								>
									<Link href="/personnalisation">
										Discutons de ton idée
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
