import { Fade, HandDrawnUnderline, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SparklesDivider } from "@/shared/components/section-divider";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { IMAGES } from "@/shared/constants/images";
import { SITE_URL } from "@/shared/constants/seo-config";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { petitFormalScript } from "@/shared/styles/fonts";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { CreativeProcessTimeline } from "./creative-process-timeline";
import { PolaroidGallery } from "./polaroid-gallery";
import { processSteps } from "./process-steps";

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
			className={`bg-muted/20 relative overflow-hidden mask-t-from-90% mask-t-to-100% mask-b-from-85% mask-b-to-100% ${SECTION_SPACING.spacious}`}
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
				className="focus:bg-secondary focus:text-secondary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:shadow-md"
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
					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
					>
						<p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal">
							Depuis mon atelier à Nantes
						</p>
					</Fade>
				</header>

				{/* Confession text with staggered paragraphs */}
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
								<span className="sm:hidden">
									Des amies ont voulu les mêmes, puis des amies d'amies… et me voilà dans mon
									atelier à Nantes !
								</span>
								<span className="hidden sm:inline">
									Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans
									mon petit atelier à Nantes ! C'était pas prévu à la base{" "}
									<span aria-hidden="true">😂</span>
								</span>
							</p>
							<p>
								<span className="sm:hidden">
									Chaque bijou est peint et assemblé à la main, en quelques exemplaires seulement.
								</span>
								<span className="hidden sm:inline">
									Chaque bijou que vous voyez ici, j'ai choisi ses couleurs, peint ses motifs,
									assemblé chaque perle. Il n'existe qu'en quelques exemplaires (parfois moins de
									dix).
								</span>
							</p>
						</Stagger>

						{/* Signature */}
						<p
							className={`${petitFormalScript.className} text-foreground text-shadow-glow pt-4 text-center text-base italic md:text-lg`}
						>
							— Léane
						</p>
						<HandDrawnUnderline color="var(--secondary)" delay={0.2} className="mx-auto mt-2" />
					</div>
				</Fade>

				{/* Decorative separator */}
				<SparklesDivider className="my-8 hidden py-0 sm:my-12 sm:flex" />

				{/* Creative process timeline */}
				<Fade inView once y={20} duration={MOTION_CONFIG.section.content.duration}>
					<CreativeProcessTimeline />
				</Fade>

				{/* Polaroid gallery */}
				<PolaroidGallery />

				{/* CTA */}
				<div id="atelier-cta" className="mt-12 sm:mt-16">
					<Fade
						y={MOTION_CONFIG.section.cta.y}
						delay={MOTION_CONFIG.section.cta.delay}
						duration={MOTION_CONFIG.section.cta.duration}
						inView
						once
						className="text-center"
					>
						<p className="text-muted-foreground mb-4 text-base sm:text-lg">
							Envie d'un bijou qui vous ressemble vraiment ?
						</p>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="shadow-md hover:shadow-xl active:scale-[0.98] motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:scale-[1.02]"
						>
							<Link href="/personnalisation">Créer votre bijou sur-mesure</Link>
						</Button>
					</Fade>
				</div>
			</div>
		</section>
	);
}
