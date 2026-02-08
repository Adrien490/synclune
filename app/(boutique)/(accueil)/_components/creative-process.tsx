import { Fade, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { IMAGES } from "@/shared/constants/images";
import { STEP_COLORS } from "@/shared/constants/process-steps";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { CheckCircle, Hammer, Lightbulb, Pencil, Sparkles } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { ParallaxImage } from "./parallax-image";
import { ScrollProgressLine } from "./scroll-progress-line";

interface ProcessStep {
	id: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	color: string;
	/** CSS animation on group hover */
	iconHoverClass: string;
}

// Creative process steps - static data
const processSteps: ProcessStep[] = [
	{
		id: "idea",
		icon: <Lightbulb className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "D'abord, une idée",
		description:
			"L'idée naît souvent de mon quotidien : une couleur aperçue dans la rue, un motif sur un tissu, ou même un rêve ! J'essaye de ne pas me forcer, mais plutôt de laisser l'inspiration venir d'elle-même.",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:text-yellow-500 group-hover:[&_svg]:drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]",
	},
	{
		id: "drawing",
		icon: <Pencil className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "Le dessin et la peinture",
		description:
			"Je dessine mes motifs sur du plastique fou, puis je passe à la peinture acrylique. C'est l'étape la plus minutieuse : chaque trait compte, chaque couleur est choisie avec soin.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:rotate-[-15deg]",
	},
	{
		id: "assembly",
		icon: <Hammer className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "La cuisson et l'assemblage",
		description:
			"Cuisson au four (le plastique rétrécit de 7 fois !), vernissage pour protéger les couleurs, puis montage sur les supports. Parfois le résultat surprend, mais ça fait partie du charme artisanal !",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:translate-y-[-2px] group-hover:[&_svg]:rotate-[-8deg]",
	},
	{
		id: "finishing",
		icon: <CheckCircle className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "La touche finale",
		description:
			"Je polis, je vérifie chaque détail, j'assemble les perles... Bon, je suis un peu perfectionniste ! Puis emballage avec amour dans sa jolie pochette.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:scale-110",
	},
];

/**
 * Progressive visual crescendo system.
 * Each step gains intensity toward the final result.
 */
const STEP_INTENSITY = [
	// Step 1 - Subtle (start)
	{ ring: "", shadow: "" },
	// Step 2 - Light (progression)
	{ ring: "ring-1 ring-secondary/10", shadow: "shadow-sm shadow-secondary/20" },
	// Step 3 - Moderate (building up)
	{ ring: "ring-1 ring-secondary/20", shadow: "shadow-md shadow-secondary/30" },
	// Step 4 - Climax (final result)
	{ ring: "ring-2 ring-secondary/30", shadow: "shadow-lg shadow-secondary/40" },
] as const;

/**
 * Creative Process section - Step-by-step jewelry making story.
 *
 * Fully static content with "reference" cache profile.
 * 4 steps with visual timeline and stagger scroll animations.
 */
export async function CreativeProcess() {
	"use cache";
	cacheLife("reference");
	cacheTag("creative-process");
	return (
		<section
			className={cn("relative overflow-hidden bg-background", SECTION_SPACING.section)}
			aria-labelledby="creative-process-title"
		>
			{/* Skip link for accessibility */}
			<a
				href="#cta-personnalisation"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-secondary focus:text-secondary-foreground focus:rounded-md focus:shadow-md"
			>
				Aller au bouton de contact
			</a>


			<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-12 lg:mb-16">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="creative-process-title">
							Comment je crée tes bijoux
						</SectionTitle>
					</Fade>
					<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
						<p className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto">
							De l'inspiration à la finition
							<span className="hidden sm:inline">
								, voici quelques étapes !
							</span>
						</p>
					</Fade>
				</header>

				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Atelier image with entrance animation - Image first on mobile */}
					<Reveal
						y={20}
						duration={0.6}
						delay={0.2}
						className="relative order-1 h-56 sm:h-80 lg:h-full"
					>
						<div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-xl">
							<ParallaxImage
								src={IMAGES.ATELIER}
								alt="Atelier de création de bijoux artisanaux à Nantes : table de travail avec pinceaux, peintures acryliques colorées et plastique fou prêt à être façonné"
								blurDataURL={IMAGES.ATELIER_BLUR}
								sizes="(max-width: 1024px) 100vw, 50vw"
								quality={80}
								className="object-cover object-center saturate-[1.05] brightness-[1.02]"
							/>

							{/* Handmade badge - WCAG AA contrast */}
							<div
								className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-secondary/95 backdrop-blur-md border-2 border-white/30 rounded-full shadow-lg drop-shadow-md"
								aria-hidden="true"
							>
								<span className="text-xs/5 font-bold tracking-wider antialiased text-secondary-foreground">
									Fait main à Nantes
								</span>
							</div>

						</div>
					</Reveal>

					{/* Process timeline */}
					<div className="relative order-2">
						<div className="relative space-y-8 sm:space-y-12 lg:space-y-16">
							{/* Scroll-animated vertical line (desktop) */}
							<ScrollProgressLine />

							{/* Simplified vertical line (mobile) - centered on 48px */}
							<div
								className="absolute left-[24px] top-8 bottom-8 w-px bg-secondary/50 sm:hidden transition-colors duration-300"
								aria-hidden="true"
							/>

							<Stagger
								stagger={MOTION_CONFIG.section.grid.stagger}
								y={MOTION_CONFIG.section.grid.y}
								delay={0}
								inView
								once={true}
							>
								{processSteps.map((step, index) => (
									<article
										key={step.id}
										className="flex items-start gap-4 group relative rounded-xl p-2 -m-2 transition-all duration-300 hover:bg-muted/30 hover:-translate-y-0.5 active:bg-muted/40 active:scale-[0.99]"
									>
										{/* Accessibility: step number for screen readers */}
										<span className="sr-only">Étape {index + 1} :</span>

										{/* Desktop: Icons in circles with vertical line */}
										<div
											className={cn(
												"hidden sm:flex shrink-0 w-12 h-12 rounded-full border-2 items-center justify-center transition-all duration-300 relative z-20",
												step.color,
												// Subtle hover animation: slight rotation and scale
												"group-hover:scale-110 group-hover:-rotate-3",
												// Icon-specific micro-interaction
												step.iconHoverClass,
												// Progressive crescendo
												STEP_INTENSITY[index].ring,
												STEP_INTENSITY[index].shadow
											)}
										>
											{step.icon}
										</div>

										{/* Mobile: Colored numbers for better guidance - 48px WCAG touch target */}
										<div
											aria-hidden="true"
											className={cn(
												"flex sm:hidden shrink-0 w-12 h-12 rounded-full items-center justify-center font-bold text-lg transition-all duration-300",
												step.color,
												"group-hover:scale-110",
												// Progressive crescendo
												STEP_INTENSITY[index].ring,
												STEP_INTENSITY[index].shadow
											)}
										>
											{index + 1}
										</div>

										<div className="flex-1 pb-8">
											<h3 className="text-xl/7 font-semibold text-foreground mb-2 tracking-tight antialiased">
												{/* Numbering visible on desktop only (mobile has number in circle) */}
												<span className="hidden sm:inline" aria-hidden="true">
													{index + 1}.{" "}
												</span>
												{step.title}
												{/* Sparkles on final step (climax) */}
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

						{/* CTA as natural continuation of the process */}
						<div id="cta-personnalisation" className="mt-4 flex items-start gap-4 group relative rounded-xl p-2 -m-2">
							{/* Desktop: Icon in dashed circle */}
							<div
								className="hidden sm:flex shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-secondary/50 items-center justify-center transition-all duration-300 group-hover:border-secondary group-hover:scale-105"
								aria-hidden="true"
							>
								<Sparkles className="w-5 h-5 text-secondary" />
							</div>

							{/* Mobile: Bonus number - 48px WCAG touch target */}
							<div
								className="flex sm:hidden shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-secondary/50 items-center justify-center text-secondary font-bold"
								aria-hidden="true"
							>
								+
							</div>

							<div className="flex-1">
								<p
									className="text-sm text-muted-foreground mb-3 italic"
								>
									Tu as une idée de bijou personnalisé ? N'hésite pas à m'en parler !
								</p>
								<Button
									asChild
									variant="secondary"
									size="lg"
									className="w-full sm:w-auto shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
								>
									<Link
										href="/personnalisation"
									>
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
