import { Fade, HandDrawnUnderline, Reveal } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { IMAGES } from "@/shared/constants/images";
import { STEP_COLORS } from "@/shared/constants/process-steps";
import { SITE_URL } from "@/shared/constants/seo-config";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { CheckCircle, Hammer, Lightbulb, Pencil, Sparkles } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { CreativeProcessGlitter } from "./creative-process-glitter";
import { CreativeProcessParallax } from "./creative-process-parallax";
import { MobileStepCircle } from "./mobile-step-circle";
import { ScrollProgressLine } from "./scroll-progress-line";

interface ProcessStep {
	id: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	color: string;
	/** CSS animation on group hover */
	iconHoverClass: string;
	/** Colored glow on hover */
	glowClass: string;
}

// Creative process steps - static data
const processSteps: ProcessStep[] = [
	{
		id: "idea",
		icon: <Lightbulb className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
		title: "D'abord, une idée",
		description:
			"L'idée naît souvent de mon quotidien : une couleur aperçue dans la rue, un motif sur un tissu, ou même un rêve ! J'essaye de ne pas me forcer, mais plutôt de laisser l'inspiration venir d'elle-même.",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:text-yellow-500 group-hover:[&_svg]:drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-yellow)]",
	},
	{
		id: "drawing",
		icon: <Pencil className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
		title: "Le dessin et la peinture",
		description:
			"Je dessine mes motifs sur du plastique fou, puis je passe à la peinture acrylique. C'est l'étape la plus minutieuse : chaque trait compte, chaque couleur est choisie avec soin.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:rotate-[-15deg]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-pink)]",
	},
	{
		id: "assembly",
		icon: <Hammer className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
		title: "La cuisson et l'assemblage",
		description:
			"Cuisson au four (le plastique rétrécit de 7 fois !), vernissage pour protéger les couleurs, puis montage sur les supports. Parfois le résultat surprend, mais ça fait partie du charme artisanal !",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:translate-y-[-2px] group-hover:[&_svg]:rotate-[-8deg]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-lavender)]",
	},
	{
		id: "finishing",
		icon: <CheckCircle className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
		title: "La touche finale",
		description:
			"Je polis, je vérifie chaque détail, j'assemble les perles... Bon, je suis un peu perfectionniste ! Puis emballage avec amour dans sa jolie pochette.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:scale-110",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-mint)]",
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

// HowTo JSON-LD schema for SEO rich snippets
const howToSchema = {
	"@context": "https://schema.org",
	"@type": "HowTo",
	"@id": `${SITE_URL}/#how-to-create-jewelry`,
	inLanguage: "fr-FR",
	name: "Comment je crée vos bijoux",
	description:
		"De l'inspiration à la finition, découvrez les étapes de création de bijoux artisanaux en plastique fou peints à la main.",
	image: IMAGES.ATELIER,
	totalTime: "PT3H",
	supply: [
		{ "@type": "HowToSupply", name: "Plastique fou" },
		{ "@type": "HowToSupply", name: "Peinture acrylique" },
		{ "@type": "HowToSupply", name: "Vernis de protection" },
		{ "@type": "HowToSupply", name: "Supports de bijoux (crochets, chaînes, fermoirs)" },
		{ "@type": "HowToSupply", name: "Perles décoratives" },
	],
	tool: [
		{ "@type": "HowToTool", name: "Pinceaux fins" },
		{ "@type": "HowToTool", name: "Four ménager" },
		{ "@type": "HowToTool", name: "Outils d'assemblage (pinces, anneaux)" },
	],
	step: processSteps.map((step, index) => ({
		"@type": "HowToStep",
		position: index + 1,
		name: step.title,
		text: step.description,
		url: `${SITE_URL}/#creative-step-${step.id}`,
	})),
};

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
			{/* HowTo JSON-LD Schema for SEO */}
			<script
				id="howto-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(howToSchema).replace(/</g, "\\u003c"),
				}}
			/>

			{/* Skip link for accessibility */}
			<a
				href="#cta-personnalisation"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-secondary focus:text-secondary-foreground focus:rounded-md focus:shadow-md"
			>
				Aller au bouton de contact
			</a>

			{/* Parallax background with blobs, jewelry silhouettes and sparkles */}
			<CreativeProcessParallax />

			<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-12 lg:mb-16">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="creative-process-title">
							Comment je crée vos bijoux
						</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
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
					{/* Atelier placeholder - Image first on mobile */}
					<Reveal
						y={MOTION_CONFIG.section.content.y}
						duration={MOTION_CONFIG.section.content.duration}
						delay={MOTION_CONFIG.section.content.delay}
						className="relative order-1 h-56 sm:h-80 lg:h-full"
					>
						<PlaceholderImage className="h-full w-full rounded-2xl" label="Photo de l'atelier à venir" />
					</Reveal>

					{/* Process timeline */}
					<div className="relative order-2">
						<div className="relative">
							{/* Scroll-animated vertical line (desktop) */}
							<ScrollProgressLine />

							{/* Simplified vertical line (mobile) - centered on 48px */}
							<div
								className="absolute left-[24px] top-8 bottom-8 w-px bg-secondary/50 sm:hidden motion-safe:transition-colors motion-safe:duration-300"
								aria-hidden="true"
							/>

							<Fade inView once y={20} duration={MOTION_CONFIG.section.content.duration}>
								<ol className="space-y-8 sm:space-y-12 lg:space-y-16 list-none">
									{processSteps.map((step, index) => (
										<li
											key={step.id}
											id={`creative-step-${step.id}`}
											className="flex items-start gap-4 group relative rounded-xl p-2 -m-2 motion-safe:transition-[background-color,transform] motion-safe:duration-300 motion-safe:hover:bg-muted/30 motion-safe:hover:-translate-y-0.5 active:bg-muted/40 active:scale-[0.99]"
										>
											{/* Accessibility: step number for screen readers */}
											<span className="sr-only">Étape {index + 1} :</span>

											{/* Desktop: Icons in circles with vertical line */}
											<div
												className={cn(
													"hidden sm:flex shrink-0 w-12 h-12 rounded-full border-2 items-center justify-center motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 relative z-20",
													step.color,
													// Subtle hover animation: slight rotation and scale
													"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
													// Icon-specific micro-interaction
													step.iconHoverClass,
													// Colored glow on hover
													step.glowClass,
													// Progressive crescendo
													STEP_INTENSITY[index].ring,
													STEP_INTENSITY[index].shadow
												)}
											>
												{step.icon}
												{/* GlitterSparkles on final step (climax) */}
												{index === processSteps.length - 1 && (
													<div className="hidden sm:block">
														<CreativeProcessGlitter />
													</div>
												)}
											</div>

											{/* Mobile: Animated colored numbers - 48px WCAG touch target */}
											<MobileStepCircle index={index} color={step.color} intensity={STEP_INTENSITY[index]} />

											<div className="flex-1 pb-8">
												<h3 className="text-xl/7 font-semibold text-foreground mb-2 tracking-tight antialiased">
													{/* Numbering visible on desktop only (mobile has number in circle) */}
													<span className="hidden sm:inline" aria-hidden="true">
														{index + 1}.{" "}
													</span>
													{step.title}
													{/* Sparkles on final step (climax) */}
													{index === processSteps.length - 1 && (
														<Sparkles
															className="inline-block w-4 h-4 ml-1.5 text-secondary opacity-70 motion-safe:transition-opacity group-hover:opacity-100"
															aria-hidden="true"
														/>
													)}
												</h3>
												<p className="text-base/7 tracking-normal antialiased text-muted-foreground">
													{step.description}
												</p>
											</div>
										</li>
									))}
								</ol>
							</Fade>
						</div>

						{/* CTA as natural continuation of the process */}
						<Fade inView once y={MOTION_CONFIG.section.cta.y} delay={MOTION_CONFIG.section.cta.delay} duration={MOTION_CONFIG.section.cta.duration}>
							<div id="cta-personnalisation" className="mt-4 flex items-start gap-4 group relative rounded-xl p-2 -m-2">
								{/* Desktop: Icon in dashed circle */}
								<div
									className="hidden sm:flex shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-secondary/50 items-center justify-center motion-safe:transition-[transform,border-color] motion-safe:duration-300 group-hover:border-secondary group-hover:scale-105"
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
										Vous avez une idée de bijou personnalisé ? N'hésitez pas à m'en parler !
									</p>
									<Button
										asChild
										variant="secondary"
										size="lg"
										className="w-full sm:w-auto shadow-md hover:shadow-xl motion-safe:hover:scale-[1.02] active:scale-[0.98] motion-safe:transition-[transform,box-shadow] motion-safe:duration-300"
									>
										<Link
											href="/personnalisation"
										>
											Discutons de votre idée
										</Link>
									</Button>
								</div>
							</div>
						</Fade>
					</div>
				</div>
			</div>
		</section>
	);
}
