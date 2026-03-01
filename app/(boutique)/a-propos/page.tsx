import { Fade, HandDrawnUnderline, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PageHeader } from "@/shared/components/page-header";
import { SectionTitle } from "@/shared/components/section-title";
import { SparklesDivider } from "@/shared/components/section-divider";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ROUTES } from "@/shared/constants/urls";
import { petitFormalScript } from "@/shared/styles/fonts";
import { cacheLife, cacheTag } from "next/cache";
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
			{/* Header standard avec breadcrumbs */}
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

					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
						inView
						once
					>
						<div className="mx-auto max-w-3xl space-y-4 text-center sm:space-y-6">
							<p className="text-foreground text-2xl font-light tracking-tight sm:text-3xl md:text-4xl">
								Je vais vous faire une confidence.
							</p>

							<Stagger
								stagger={MOTION_CONFIG.section.grid.stagger}
								y={MOTION_CONFIG.section.grid.y}
								inView
								once
								className="text-muted-foreground space-y-4 text-base leading-relaxed sm:space-y-6 sm:text-lg"
							>
								<p>Quand j'ai commencé à créer des bijoux, c'était juste pour moi.</p>
								<p>
									Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans
									mon petit atelier à Nantes ! C'était pas prévu à la base.
								</p>
								<p>
									Chaque bijou que vous voyez ici, j'ai choisi ses couleurs, peint ses motifs,
									assemblé chaque perle. Il n'existe qu'en quelques exemplaires — parfois moins de
									dix.
								</p>
								<p>
									Ce que j'aime par-dessus tout, c'est que vous portiez quelque chose qui vous
									ressemble vraiment. Pas un bijou de masse, sorti d'une usine et identique à des
									milliers d'autres. Quelque chose de vivant, de fait avec les mains, avec du soin.
								</p>
							</Stagger>

							<p
								className={`${petitFormalScript.className} text-foreground text-shadow-glow pt-4 text-center text-base italic md:text-lg`}
							>
								— Léane
							</p>
							<HandDrawnUnderline color="var(--secondary)" delay={0.2} className="mx-auto mt-2" />
						</div>
					</Fade>
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

					<Fade
						y={MOTION_CONFIG.section.content.y}
						delay={MOTION_CONFIG.section.content.delay}
						duration={MOTION_CONFIG.section.content.duration}
						inView
						once
					>
						<div className="mx-auto max-w-3xl space-y-8 sm:space-y-10">
							<div className="space-y-3">
								<h3 className="text-foreground text-xl font-medium">1. D'abord, une idée</h3>
								<p className="text-muted-foreground leading-relaxed">
									L'idée naît souvent de mon quotidien : une couleur aperçue dans la rue, un motif
									sur un tissu, ou même un rêve ! J'essaye de ne pas me forcer, mais plutôt de
									laisser l'inspiration venir d'elle-même.
								</p>
							</div>

							<div className="space-y-3">
								<h3 className="text-foreground text-xl font-medium">2. Le dessin et la peinture</h3>
								<p className="text-muted-foreground leading-relaxed">
									Je dessine mes motifs sur du plastique fou, puis je passe à la peinture acrylique.
									C'est l'étape la plus minutieuse : chaque trait compte, chaque couleur est choisie
									avec soin. Certains bijoux me demandent plusieurs heures de peinture.
								</p>
							</div>

							<div className="space-y-3">
								<h3 className="text-foreground text-xl font-medium">
									3. La cuisson et l'assemblage
								</h3>
								<p className="text-muted-foreground leading-relaxed">
									Cuisson au four — le plastique rétrécit de sept fois ! Vernissage pour protéger
									les couleurs, puis montage sur les supports. Parfois le résultat surprend, mais ça
									fait partie du charme artisanal.
								</p>
							</div>

							<div className="space-y-3">
								<h3 className="text-foreground text-xl font-medium">4. La touche finale</h3>
								<p className="text-muted-foreground leading-relaxed">
									Je polis, je vérifie chaque détail, j'assemble les perles… Bon, je suis un peu
									perfectionniste ! Puis emballage avec amour dans sa jolie pochette, prête à partir
									chez vous.
								</p>
							</div>
						</div>
					</Fade>
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
									className="border-border bg-card flex gap-4 rounded-2xl border p-6 shadow-sm"
								>
									<div className="mt-0.5 shrink-0">
										<div className="bg-secondary/10 flex size-10 items-center justify-center rounded-xl">
											<Icon className="text-secondary size-5" aria-hidden="true" />
										</div>
									</div>
									<div className="space-y-2">
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

			{/* ── Section 4 : CTA Personnalisation ── */}
			<section
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
							variant="outline"
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
