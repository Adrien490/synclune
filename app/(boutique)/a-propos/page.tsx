import { CreativeProcessTimeline } from "@/app/(boutique)/(accueil)/_components/atelier-section/creative-process-timeline";
import { Fade, HandDrawnUnderline, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PageHeader } from "@/shared/components/page-header";
import { SectionTitle } from "@/shared/components/section-title";
import { SparklesDivider } from "@/shared/components/section-divider";
import { Button } from "@/shared/components/ui/button";
import { IMAGES } from "@/shared/constants/images";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ROUTES } from "@/shared/constants/urls";
import { petitFormalScript } from "@/shared/styles/fonts";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Gem, Heart, Paintbrush, Sparkles } from "lucide-react";
import { SITE_URL } from "@/shared/constants/seo-config";

export const metadata: Metadata = {
	title: "À propos - Synclune | L'atelier de Léane à Nantes",
	description:
		"Découvrez l'histoire de Léane, créatrice de bijoux artisanaux en plastique fou peints à la main depuis Nantes. Son processus créatif, ses valeurs et sa passion pour l'artisanat unique.",
	alternates: {
		canonical: "/a-propos",
	},
	openGraph: {
		title: "À propos - Synclune | L'atelier de Léane à Nantes",
		description:
			"Depuis son atelier à Nantes, Léane crée des bijoux artisanaux uniques en plastique fou peints à la main. Chaque pièce est une invitation à porter quelque chose qui vous ressemble vraiment.",
		url: `${SITE_URL}/a-propos`,
		type: "profile",
	},
};

const values = [
	{
		icon: Gem,
		title: "Artisanat authentique",
		description:
			"Chaque bijou est conçu, dessiné et assemblé à la main dans mon atelier nantais. Pas de production en série, pas de compromis sur la qualité.",
	},
	{
		icon: Paintbrush,
		title: "Peint à la main",
		description:
			"La peinture acrylique est appliquée pinceau par pinceau sur le plastique fou. Chaque motif est unique — même deux pièces du même modèle ne seront jamais identiques.",
	},
	{
		icon: Heart,
		title: "Éditions limitées",
		description:
			"Chaque modèle est produit en très petite série, parfois moins de dix exemplaires. Vous portez quelque chose de rare, de personnel, de vraiment à vous.",
	},
	{
		icon: Sparkles,
		title: "Sur-mesure possible",
		description:
			"Vous avez une idée en tête ? Une couleur, un motif, une occasion spéciale ? Je crée des bijoux personnalisés pour que vous portiez exactement ce dont vous rêvez.",
	},
];

/**
 * Page À propos - Histoire de Léane, processus créatif et valeurs de Synclune
 *
 * Static content with "reference" cache profile.
 */
export default async function AboutPage() {
	"use cache";
	cacheLife("reference");
	cacheTag("about-page");

	return (
		<div className="relative min-h-screen">
			{/* Skip link to CTA */}
			<a
				href="#about-cta"
				className="bg-background focus:ring-ring sr-only fixed top-4 left-4 z-50 rounded-md px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:ring-2 focus:outline-none"
			>
				Aller au contenu principal
			</a>

			<PageHeader
				title="À propos"
				description="L'histoire de Synclune et de son atelier nantais"
				breadcrumbs={[{ label: "À propos", href: ROUTES.SHOP.ABOUT }]}
			/>

			{/* ── Section 1 : L'histoire de Léane ── */}
			<section className={`bg-background ${SECTION_SPACING.section}`} aria-labelledby="story-title">
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<header className="mb-10 text-center lg:mb-14">
							<SectionTitle id="story-title">Mon histoire</SectionTitle>
							<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
						</header>
					</Fade>

					{/* Desktop: two-column layout / Mobile: stacked */}
					<div className="mx-auto max-w-4xl items-center gap-12 lg:flex lg:gap-16">
						{/* Image — mobile: centered above text */}
						<Reveal
							y={MOTION_CONFIG.section.content.y}
							duration={MOTION_CONFIG.section.content.duration}
							className="mb-8 flex justify-center lg:mb-0 lg:shrink-0"
						>
							<Image
								src={IMAGES.ATELIER}
								alt="Atelier de création de bijoux artisanaux Synclune à Nantes"
								width={320}
								height={400}
								className="rounded-2xl object-cover shadow-md"
								placeholder="blur"
								blurDataURL={IMAGES.ATELIER_BLUR}
								sizes="(max-width: 1024px) 280px, 320px"
							/>
						</Reveal>

						{/* Text — differentiated from homepage teaser */}
						<div className="flex-1">
							<Fade
								y={MOTION_CONFIG.section.subtitle.y}
								delay={MOTION_CONFIG.section.subtitle.delay}
								duration={MOTION_CONFIG.section.subtitle.duration}
								inView
								once
							>
								<p className="text-foreground mb-4 text-center text-2xl font-light tracking-tight sm:text-3xl md:text-4xl lg:text-left">
									Tout a commencé par un hasard.
								</p>
							</Fade>

							<Stagger
								stagger={MOTION_CONFIG.section.grid.stagger}
								y={MOTION_CONFIG.section.grid.y}
								inView
								once
								className="text-muted-foreground space-y-4 text-center text-base leading-relaxed sm:space-y-6 sm:text-lg lg:text-left"
							>
								<p>
									Un après-midi pluvieux à Nantes, un morceau de plastique fou oublié dans un
									tiroir, et l'envie de créer quelque chose de mes mains. Rien de plus. Ce jour-là,
									j'ai peint mon premier bijou — pour le plaisir, sans penser à demain.
								</p>
								<p>
									Depuis, mon atelier est devenu mon refuge. C'est ici que je passe mes matinées à
									mélanger des couleurs, à tester des formes, à chercher la nuance exacte qui fera
									vivre une pièce. Chaque bijou porte un peu de cette patience, de ces essais, de
									cette obsession du détail.
								</p>
								<p>
									Ce qui me touche le plus, c'est de savoir que quelqu'un choisit de porter mes
									créations au quotidien. Qu'un bracelet peint dans mon atelier accompagne quelqu'un
									dans sa journée — c'est ce qui donne tout son sens à mon travail.
								</p>
							</Stagger>

							<div className="mt-4 text-center lg:text-left">
								<p
									className={`${petitFormalScript.className} text-foreground text-shadow-glow pt-4 text-base italic md:text-lg`}
								>
									— Léane
								</p>
								<HandDrawnUnderline
									color="var(--secondary)"
									delay={0.2}
									className="mx-auto mt-2 lg:mx-0"
								/>
							</div>
						</div>
					</div>
				</div>
			</section>

			<SparklesDivider className="hidden py-0 sm:flex" />

			{/* ── Section 2 : Le processus créatif ── */}
			<section className={`bg-muted/20 ${SECTION_SPACING.section}`} aria-labelledby="process-title">
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<header className="mb-10 text-center lg:mb-14">
							<SectionTitle id="process-title">Le processus créatif</SectionTitle>
							<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
							<p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal">
								De l'inspiration à la finition, voici comment naît chaque bijou
							</p>
						</header>
					</Fade>

					<CreativeProcessTimeline />
				</div>
			</section>

			<SparklesDivider className="hidden py-0 sm:flex" />

			{/* ── Section 3 : Valeurs ── */}
			<section
				className={`bg-background ${SECTION_SPACING.section}`}
				aria-labelledby="values-title"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<header className="mb-10 text-center lg:mb-14">
							<SectionTitle id="values-title">Ce qui compte pour moi</SectionTitle>
							<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
						</header>
					</Fade>

					<Stagger
						stagger={MOTION_CONFIG.section.grid.stagger}
						y={MOTION_CONFIG.section.grid.y}
						inView
						once
						className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8"
					>
						{values.map((value) => {
							const Icon = value.icon;
							return (
								<div
									key={value.title}
									className="border-border bg-card group can-hover:hover:border-secondary/30 can-hover:hover:shadow-md relative flex gap-4 overflow-hidden rounded-2xl border p-6 shadow-sm motion-safe:transition-[shadow,border-color] motion-safe:duration-300"
								>
									{/* Subtle hover background overlay */}
									<div
										className="bg-secondary/5 can-hover:group-hover:opacity-100 pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-300"
										aria-hidden="true"
									/>

									<div className="relative mt-0.5 shrink-0">
										<div className="bg-secondary/10 can-hover:group-hover:bg-secondary/20 flex size-10 items-center justify-center rounded-xl motion-safe:transition-[background-color] motion-safe:duration-300">
											<Icon className="text-secondary size-5" aria-hidden="true" />
										</div>
									</div>
									<div className="relative space-y-2">
										<h3 className="text-foreground font-medium">{value.title}</h3>
										<p className="text-muted-foreground text-sm leading-relaxed">
											{value.description}
										</p>
									</div>
								</div>
							);
						})}
					</Stagger>
				</div>
			</section>

			<SparklesDivider className="hidden py-0 sm:flex" />

			{/* ── Section 4 : CTA Personnalisation ── */}
			<section
				id="about-cta"
				className={`bg-muted/20 mask-t-from-90% mask-t-to-100% ${SECTION_SPACING.compact}`}
				aria-labelledby="cta-title"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<Fade
						y={MOTION_CONFIG.section.cta.y}
						delay={MOTION_CONFIG.section.cta.delay}
						duration={MOTION_CONFIG.section.cta.duration}
						inView
						once
						className="text-center"
					>
						<SectionTitle id="cta-title" size="small">
							Envie d'un bijou qui vous ressemble&nbsp;?
						</SectionTitle>
						<p className="text-muted-foreground mx-auto mt-4 mb-8 max-w-xl text-base leading-relaxed sm:text-lg">
							Je crée des bijoux sur-mesure, pensés pour vous, selon vos couleurs, vos envies et vos
							souvenirs. Racontez-moi votre idée !
						</p>
						<Button
							asChild
							size="lg"
							className="shadow-md hover:shadow-xl active:scale-[0.98] motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:scale-[1.02]"
						>
							<Link href={ROUTES.SHOP.CUSTOMIZATION}>Créer votre bijou sur-mesure</Link>
						</Button>
					</Fade>
				</div>
			</section>
		</div>
	);
}
