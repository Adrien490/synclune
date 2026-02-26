import { Fade, HandDrawnUnderline, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { SectionTitle } from "@/shared/components/section-title";
import { PolaroidFrame, type WashiTapeColor, type WashiTapePosition } from "@/shared/components/polaroid-frame";
import { SparklesDivider } from "@/shared/components/section-divider";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { petitFormalScript } from "@/shared/styles/fonts";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { PolaroidDoodles } from "./polaroid-doodles";


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
		captionColor: "#8a3a5c",
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
		captionColor: "#6b4f8a",
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
		captionColor: "#2e6047",
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
		captionColor: "#6b4d20",
		captionRotate: 0.8,
		vintage: true,
		glowColor: "yellow",
		scatterClass: "lg:-translate-y-3 lg:-translate-x-1",
		className: "hidden lg:block",
	},
];

/**
 * Atelier story section - Personal storytelling with polaroid gallery.
 *
 * Fully static content. Component-level cache with "reference" profile.
 * Article JSON-LD schema is centralized in the StructuredData component.
 */
export async function AtelierStory() {
	"use cache";
	cacheLife("reference");
	cacheTag("atelier-story");
	return (
		<section
			id="atelier-story"
			className={`relative overflow-hidden bg-muted/20 mask-t-from-90% mask-t-to-100% mask-b-from-85% mask-b-to-100% ${SECTION_SPACING.spacious}`}
			aria-labelledby="atelier-story-title"
			data-content-type="about-creator"
		>
			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Visible section header */}
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="atelier-story-title">Mon atelier</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
						<p className="mt-5 text-lg/8 tracking-normal text-muted-foreground max-w-2xl mx-auto">
							Depuis mon atelier à Nantes
						</p>
					</Fade>
				</header>

				{/* Confession text with staggered paragraphs - content-first, image as payoff */}
				<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration} inView once>
					<div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
						{/* Catchy intro */}
						<p className="text-2xl sm:text-3xl md:text-4xl font-light text-foreground tracking-tight">
							Je vais vous faire une confidence.
						</p>

						{/* Body text with stagger for progressive reading */}
						<Stagger
							stagger={MOTION_CONFIG.section.grid.stagger}
							y={MOTION_CONFIG.section.grid.y}
							inView
							once
							className="space-y-4 sm:space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed"
						>
							<p>Quand j'ai commencé à créer des bijoux, c'était juste pour moi.</p>
							<p>
								Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans mon petit atelier à Nantes ! C'était pas prévu à la base <span aria-hidden="true">😂</span>
							</p>
							<p>Chaque bijou que vous voyez ici, j'ai choisi ses couleurs, peint ses motifs, assemblé chaque perle. Il n'existe qu'en quelques exemplaires (parfois moins de dix).</p>
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

				{/* Decorative separator as narrative drumroll before photo reveal */}
				<SparklesDivider className="my-8 sm:my-12 py-0" />

				{/* Main ambiance photo - contained with rounded corners and bottom fade */}
				<Reveal y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration} once>
					<div className="mb-8 sm:mb-12 mask-b-from-85% mask-b-to-100%">
						<PlaceholderImage
							className="aspect-3/2 sm:aspect-video max-h-[40vh] sm:max-h-none rounded-2xl"
							label="Atelier de création Synclune à Nantes - Léane travaillant sur ses bijoux artisanaux"
						/>
					</div>
				</Reveal>

				{/* Polaroid gallery - 4 photos desktop, 2 mobile (via CSS) */}
				<Reveal y={MOTION_CONFIG.section.grid.y} delay={0.3} duration={MOTION_CONFIG.section.title.duration} once>
					<div className="mt-12 sm:mt-16">
						{/* Polaroid scrapbook grid with doodles */}
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
				<div id="atelier-story-cta" className="mt-12 sm:mt-16">
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
