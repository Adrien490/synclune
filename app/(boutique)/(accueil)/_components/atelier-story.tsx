import { Fade, HandDrawnUnderline, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { PolaroidFrame } from "@/shared/components/polaroid-frame";
import { SparklesDivider } from "@/shared/components/section-divider";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { dancingScript } from "@/shared/styles/fonts";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { PolaroidDoodles } from "./polaroid-doodles";


const POLAROIDS = [
	{
		caption: "Les mains dans les perles !",
		label: "Mains de Léane assemblant un bijou",
		tiltDegree: -3,
		washiColor: "pink",
		washiPosition: "top-left",
		captionColor: "#9d4b6e",
		captionRotate: -1.5,
		vintage: true,
		scatterClass: "lg:-translate-y-2 lg:translate-x-1",
		glowClass: "hover:shadow-[0_0_25px_var(--color-glow-pink),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	},
	{
		caption: "Mes petits trésors",
		label: "Perles et matériaux colorés",
		tiltDegree: 1.5,
		washiColor: "lavender",
		washiPosition: "top-right",
		captionColor: "#6b4f8a",
		captionRotate: 1,
		vintage: true,
		scatterClass: "lg:translate-y-3 lg:-translate-x-1",
		glowClass: "hover:shadow-[0_0_25px_var(--color-glow-lavender),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	},
	{
		caption: "L'inspiration du jour",
		label: "Carnet d'inspiration avec croquis",
		tiltDegree: -1,
		washiColor: "mint",
		washiPosition: "top-left",
		captionColor: "#3d7a5f",
		captionRotate: -0.5,
		vintage: true,
		className: "hidden lg:block",
		scatterClass: "lg:translate-y-1 lg:translate-x-2",
		glowClass: "hover:shadow-[0_0_25px_var(--color-glow-mint),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	},
	{
		caption: "Mon coin créatif",
		label: "Vue de l'atelier Synclune",
		tiltDegree: 2.5,
		washiColor: "peach",
		washiPosition: "top-right",
		captionColor: "#8a6b3d",
		captionRotate: 0.8,
		vintage: true,
		className: "hidden lg:block",
		scatterClass: "lg:-translate-y-3 lg:-translate-x-1",
		glowClass: "hover:shadow-[0_0_25px_var(--color-glow-yellow),0_12px_24px_-8px_rgba(0,0,0,0.15)]",
	},
] as const;

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
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.spacious}`}
			aria-labelledby="atelier-story-title"
			data-voice-queries="qui est Léane Synclune,atelier bijoux Nantes,créatrice bijoux artisanaux"
			data-content-type="about-creator"
		>
			{/* Descriptive title for SEO and screen readers */}
			<h2 id="atelier-story-title" className="sr-only">
				L'histoire de Léane, créatrice de bijoux artisanaux Synclune à Nantes
			</h2>

			{/* Skip link for keyboard navigation */}
			<a
				href="#atelier-story-cta"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring focus:text-foreground"
			>
				Passer au bouton Découvrir
			</a>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Main ambiance photo - reduced height on mobile for better flow */}
				<Reveal y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration} once>
					<div className="mb-8 sm:mb-12">
						<PlaceholderImage
							className="aspect-3/2 sm:aspect-video max-h-[50vh] sm:max-h-none"
							label="Atelier de création Synclune à Nantes - Léane travaillant sur ses bijoux artisanaux"
						/>
					</div>
				</Reveal>

				{/* Decorative animated separator */}
				<SparklesDivider className="mb-8 sm:mb-12 py-0" />

				{/* Confession text with staggered paragraphs */}
				<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration} inView once>
					<blockquote className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
						{/* Decorative badge (real h2 is sr-only above) */}
						<span
							className="inline-block text-sm uppercase tracking-[0.2em] text-muted-foreground font-medium"
							aria-hidden="true"
						>
							Depuis mon atelier
						</span>

						{/* Catchy intro */}
						<p className="text-2xl sm:text-3xl md:text-4xl font-light text-foreground tracking-tight">
							Je vais te faire une confidence.
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
								Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans mon petit atelier à Nantes ! C'était pas prévu à la base <span role="img" aria-label="visage qui rit aux larmes">😂</span>
							</p>
							<p>Chaque bijou que tu vois ici, j'ai choisi ses couleurs, peint ses motifs, assemblé chaque perle. Il n'existe qu'en quelques exemplaires (parfois moins de dix).</p>
						</Stagger>

						{/* Signature */}
						<footer
							className={`${dancingScript.className} text-2xl md:text-3xl text-foreground italic pt-4 text-center text-shadow-glow`}
						>
							— Léane
						</footer>
						<HandDrawnUnderline color="var(--secondary)" delay={0.4} className="mx-auto mt-2" />
					</blockquote>
				</Fade>

				{/* Polaroid gallery - 4 photos desktop, 2 mobile (via CSS) */}
				<Reveal y={MOTION_CONFIG.section.grid.y} delay={0.3} duration={MOTION_CONFIG.section.title.duration} once>
					<div className="mt-12 sm:mt-16">
						{/* Polaroid scrapbook grid with doodles */}
						<div
							role="group"
							aria-label="Galerie photos de l'atelier Synclune"
							className="relative"
						>
							<PolaroidDoodles />
							<Stagger
								stagger={MOTION_CONFIG.stagger.slow}
								y={MOTION_CONFIG.section.grid.y}
								inView
								once
								className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-2 max-w-5xl mx-auto"
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
											"className" in p ? p.className : undefined,
											p.scatterClass,
											"motion-safe:transition-shadow motion-safe:duration-300",
											p.glowClass
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
							Envie de voir mes créations de plus près ?
						</p>
						<Button asChild size="lg" variant="outline"
							className="shadow-md hover:shadow-xl motion-safe:hover:scale-[1.02] active:scale-[0.98] motion-safe:transition-all motion-safe:duration-300"
						>
							<Link href="/produits">Découvrir les créations</Link>
						</Button>
					</Fade>
				</div>
			</div>
		</section>
	);
}
