import { Fade, HandDrawnUnderline, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { PolaroidFrame, type WashiTapeColor, type WashiTapePosition } from "@/shared/components/polaroid-frame";
import { SparklesDivider } from "@/shared/components/section-divider";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { IMAGES } from "@/shared/constants/images";
import { STEP_COLORS } from "@/shared/constants/process-steps";
import { SITE_URL } from "@/shared/constants/seo-config";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { petitFormalScript } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { CheckCircle, Hammer, Lightbulb, Pencil, Sparkles } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { CreativeProcessGlitter } from "./creative-process-glitter";
import { MobileStepCircle } from "./mobile-step-circle";
import { PolaroidDoodles } from "./polaroid-doodles";

// ─── Process Steps ───────────────────────────────────────────────────────────

interface ProcessStep {
	id: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	color: string;
	iconHoverClass: string;
	glowClass: string;
	intensity: { ring: string; shadow: string };
}

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
		intensity: { ring: "", shadow: "" },
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
		intensity: { ring: "ring-1 ring-secondary/10", shadow: "shadow-sm shadow-secondary/20" },
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
		intensity: { ring: "ring-1 ring-secondary/20", shadow: "shadow-md shadow-secondary/30" },
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
		intensity: { ring: "ring-2 ring-secondary/30", shadow: "shadow-lg shadow-secondary/40" },
	},
];

// ─── HowTo JSON-LD ──────────────────────────────────────────────────────────

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

// ─── Polaroid Gallery ────────────────────────────────────────────────────────

type GlowColor = "pink" | "lavender" | "mint" | "yellow";

interface PolaroidConfig {
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
	className?: string;
}

const GLOW_CLASSES: Record<GlowColor, string> = {
	pink: "hover:shadow-[0_0_25px_var(--color-glow-pink),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	lavender: "hover:shadow-[0_0_25px_var(--color-glow-lavender),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	mint: "hover:shadow-[0_0_25px_var(--color-glow-mint),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	yellow: "hover:shadow-[0_0_25px_var(--color-glow-yellow),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
};

const POLAROIDS: PolaroidConfig[] = [
	{
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
	},
	{
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
	},
	{
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
		className: "hidden lg:block",
	},
	{
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
		className: "hidden lg:block",
	},
];

// ─── Section Component ──────────────────────────────────────────────────────

/**
 * L'Atelier section - Merges Léane's story with the creative process.
 *
 * Static content with "reference" cache profile.
 * HowTo JSON-LD schema for SEO, Article schema centralized in StructuredData.
 */
export async function AtelierSection() {
	"use cache";
	cacheLife("reference");
	cacheTag("atelier-section");
	return (
		<section
			id="atelier-section"
			className={`relative overflow-hidden bg-muted/20 mask-t-from-90% mask-t-to-100% mask-b-from-85% mask-b-to-100% ${SECTION_SPACING.spacious}`}
			aria-labelledby="atelier-section-title"
			data-content-type="about-creator"
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
				href="#atelier-cta"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-secondary focus:text-secondary-foreground focus:rounded-md focus:shadow-md"
			>
				Aller au bouton de contact
			</a>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="atelier-section-title">Mon atelier</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
						<p className="mt-5 text-lg/8 tracking-normal text-muted-foreground max-w-2xl mx-auto">
							Depuis mon atelier à Nantes
						</p>
					</Fade>
				</header>

				{/* Confession text with staggered paragraphs */}
				<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration} inView once>
					<div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
						<p className="text-2xl sm:text-3xl md:text-4xl font-light text-foreground tracking-tight">
							Je vais vous faire une confidence.
						</p>

						<Stagger
							stagger={MOTION_CONFIG.section.grid.stagger}
							y={MOTION_CONFIG.section.grid.y}
							inView
							once
							className="space-y-4 sm:space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed"
						>
							<p>Quand j'ai commencé à créer des bijoux, c'était juste pour moi.</p>
							<p>
								<span className="sm:hidden">Des amies ont voulu les mêmes, puis des amies d'amies… et me voilà dans mon atelier à Nantes !</span>
								<span className="hidden sm:inline">Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans mon petit atelier à Nantes ! C'était pas prévu à la base <span aria-hidden="true">😂</span></span>
							</p>
							<p>
								<span className="sm:hidden">Chaque bijou est peint et assemblé à la main, en quelques exemplaires seulement.</span>
								<span className="hidden sm:inline">Chaque bijou que vous voyez ici, j'ai choisi ses couleurs, peint ses motifs, assemblé chaque perle. Il n'existe qu'en quelques exemplaires (parfois moins de dix).</span>
							</p>
						</Stagger>

						{/* Signature */}
						<p
							className={`${petitFormalScript.className} text-base md:text-lg text-foreground italic pt-4 text-center text-shadow-glow`}
						>
							— Léane
						</p>
						<HandDrawnUnderline color="var(--secondary)" delay={0.2} className="mx-auto mt-2" />
					</div>
				</Fade>

				{/* Decorative separator */}
				<SparklesDivider className="hidden sm:flex my-8 sm:my-12 py-0" />

				{/* Creative process timeline */}
				<Fade inView once y={20} duration={MOTION_CONFIG.section.content.duration}>
					<div className="mt-8 sm:mt-12">
						{/* Desktop: horizontal grid (lg+) */}
						<div className="hidden lg:block relative">
							{/* Decorative horizontal line connecting the circles */}
							<div
								className="absolute top-6 left-[calc(12.5%-12px)] right-[calc(12.5%-12px)] h-px bg-secondary/30 z-0"
								aria-hidden="true"
							/>
							<ol className="relative z-10 grid grid-cols-4 gap-6 list-none">
							{processSteps.map((step, index) => (
								<li
									key={step.id}
									id={`creative-step-${step.id}`}
									className="group relative text-center rounded-xl p-3 motion-safe:transition-[background-color,transform] motion-safe:duration-300 motion-safe:hover:bg-muted/30 motion-safe:hover:-translate-y-0.5 active:bg-muted/40 active:scale-[0.99]"
								>
									<span className="sr-only">Étape {index + 1} :</span>

									{/* Icon circle */}
									<div
										className={cn(
											"relative z-10 mx-auto flex w-12 h-12 rounded-full border-2 items-center justify-center motion-safe:transition-[transform,box-shadow] motion-safe:duration-300",
											step.color,
											"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
											step.iconHoverClass,
											step.glowClass,
											step.intensity.ring,
											step.intensity.shadow,
										)}
									>
										{step.icon}
										{index === processSteps.length - 1 && (
											<CreativeProcessGlitter />
										)}
									</div>

									{/* Title + description */}
									<h3 className="mt-4 text-lg/6 font-semibold text-foreground tracking-tight antialiased">
										{step.title}
										{index === processSteps.length - 1 && (
											<Sparkles
												className="inline-block w-4 h-4 ml-1.5 text-secondary opacity-70 motion-safe:transition-opacity group-hover:opacity-100"
												aria-hidden="true"
											/>
										)}
									</h3>
									<p className="mt-2 text-sm/6 tracking-normal antialiased text-muted-foreground">
										{step.description}
									</p>
								</li>
							))}
							</ol>
						</div>

						{/* Mobile: vertical timeline */}
						<div className="lg:hidden relative">
							{/* Static vertical line */}
							<div
								className="absolute left-[24px] top-8 bottom-8 w-px bg-secondary/50 sm:hidden"
								aria-hidden="true"
							/>

							<ol className="space-y-8 sm:space-y-12 list-none">
								{processSteps.map((step, index) => (
									<li
										key={step.id}
										id={`creative-step-${step.id}-mobile`}
										className="flex items-start gap-4 group relative rounded-xl p-2 -m-2 motion-safe:transition-[background-color,transform] motion-safe:duration-300 motion-safe:hover:bg-muted/30 motion-safe:hover:-translate-y-0.5 active:bg-muted/40 active:scale-[0.99]"
									>
										<span className="sr-only">Étape {index + 1} :</span>

										{/* Desktop (sm-lg): icon circles */}
										<div
											className={cn(
												"hidden sm:flex lg:hidden shrink-0 w-12 h-12 rounded-full border-2 items-center justify-center motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 relative z-20",
												step.color,
												"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
												step.iconHoverClass,
												step.glowClass,
												step.intensity.ring,
												step.intensity.shadow,
											)}
										>
											{step.icon}
											{index === processSteps.length - 1 && (
												<div className="hidden sm:block">
													<CreativeProcessGlitter />
												</div>
											)}
										</div>

										{/* Mobile: animated number circles */}
										<MobileStepCircle index={index} color={step.color} intensity={step.intensity} />

										<div className="flex-1 pb-8">
											<h3 className="text-xl/7 font-semibold text-foreground mb-2 tracking-tight antialiased">
												<span className="hidden sm:inline lg:hidden" aria-hidden="true">
													{index + 1}.{" "}
												</span>
												{step.title}
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
						</div>
					</div>
				</Fade>

				{/* Polaroid gallery */}
				<Reveal y={MOTION_CONFIG.section.grid.y} delay={0.3} duration={MOTION_CONFIG.section.title.duration} once>
					<div className="mt-12 sm:mt-16">
						<div
							role="region"
							aria-label="Galerie photos de l'atelier Synclune"
							className="relative"
						>
							<PolaroidDoodles />
							<Stagger
								stagger={MOTION_CONFIG.stagger.slow}
								y={MOTION_CONFIG.section.grid.y}
								inView
								once
								className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-2 max-w-5xl mx-auto"
							>
								{POLAROIDS.map((p) => (
									<PolaroidFrame
										key={p.caption}
										tiltDegree={p.tiltDegree}
										caption={p.caption}
										captionColor={p.captionColor}
										captionRotate={p.captionRotate}
										washiTape
										washiColor={p.washiColor}
										washiPosition={p.washiPosition}
										vintage={p.vintage}
										className={cn(
											p.className,
											p.scatterClass,
											"motion-safe:transition-shadow motion-safe:duration-300",
											GLOW_CLASSES[p.glowColor]
										)}
									>
										<PlaceholderImage className="w-full h-full" label={p.label} />
									</PolaroidFrame>
								))}
							</Stagger>
						</div>
					</div>
				</Reveal>

				{/* CTA */}
				<div id="atelier-cta" className="mt-12 sm:mt-16">
					<Fade y={MOTION_CONFIG.section.cta.y} delay={MOTION_CONFIG.section.cta.delay}
						duration={MOTION_CONFIG.section.cta.duration} inView once className="text-center">
						<p className="text-muted-foreground mb-4 text-base sm:text-lg">
							Envie d'un bijou qui vous ressemble vraiment ?
						</p>
						<Button asChild size="lg" variant="outline"
							className="shadow-md hover:shadow-xl motion-safe:hover:scale-[1.02] active:scale-[0.98] motion-safe:transition-[transform,box-shadow] motion-safe:duration-300"
						>
							<Link href="/personnalisation">Créer votre bijou sur-mesure</Link>
						</Button>
					</Fade>
				</div>
			</div>
		</section>
	);
}
