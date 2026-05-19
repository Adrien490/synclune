import "./atelier-section.css";

import { Fade, HandDrawnUnderline, SplitText } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { SectionTitle } from "@/shared/components/section-title";
import { IMAGES } from "@/shared/constants/images";
import { SITE_URL } from "@/shared/constants/seo-config";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cacheLife, cacheTag } from "next/cache";
import { CreativeProcessTimeline } from "./creative-process-timeline";
import { POLAROIDS } from "./polaroid-config";
import { PolaroidGallery } from "./polaroid-gallery";
import { processSteps } from "./process-steps";
import { SignatureReveal } from "./signature-reveal";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

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

// ─── ItemList JSON-LD (Polaroid Gallery) ────────────────────────────────────
// Note : contentUrl utilise IMAGES.ATELIER en attendant les vraies photos polaroid
// (à mapper par id dès que les visuels seront livrés).
const polaroidGallerySchema = {
	"@context": "https://schema.org",
	"@type": "ItemList",
	"@id": `${SITE_URL}/#atelier-polaroid-gallery`,
	name: "Galerie de l'atelier Synclune",
	description: "Photos coulisses de l'atelier de création de bijoux artisanaux.",
	numberOfItems: POLAROIDS.length,
	itemListElement: POLAROIDS.map((p, i) => ({
		"@type": "ListItem",
		position: i + 1,
		item: {
			"@type": "ImageObject",
			name: p.caption,
			description: p.label,
			contentUrl: IMAGES.ATELIER,
			representativeOfPage: false,
		},
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
			className={`bg-muted/20 relative overflow-hidden mask-t-from-97% mask-t-to-100% mask-b-from-99% mask-b-to-100% sm:mask-t-from-90% sm:mask-b-from-95% ${SECTION_SPACING.spacious}`}
			aria-labelledby="atelier-section-title"
			data-content-type="about-creator"
			style={{ viewTransitionName: "atelier-section" }}
		>
			{/* HowTo JSON-LD Schema — SAFE: serialized via safeJsonLd */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				id="howto-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(howToSchema),
				}}
			/>

			{/* ItemList JSON-LD Schema (polaroid gallery) — SAFE: serialized via safeJsonLd */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				id="polaroid-gallery-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(polaroidGallerySchema),
				}}
			/>

			<div className="relative mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))]">
				{/* Header */}
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="atelier-section-title">Mon atelier</SectionTitle>
						<HandDrawnUnderline
							color="var(--secondary)"
							delay={MOTION_CONFIG.section.underline.delay}
							className="mx-auto mt-2"
						/>
					</Fade>
					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
					>
						<p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal text-balance">
							Là où chaque bijou prend vie, un geste à la fois.
						</p>
					</Fade>
				</header>

				<Fade inView once y={20} duration={MOTION_CONFIG.section.content.duration}>
					<div className="mx-auto mb-10 max-w-4xl sm:mb-14">
						<PlaceholderImage
							preserveAspect
							className="aspect-[4/3] rounded-2xl sm:aspect-[16/7]"
							label="L'atelier de création Synclune, où chaque bijou prend vie"
						/>
					</div>
				</Fade>

				{/* Confession text with progressive reveal */}
				<Fade
					y={MOTION_CONFIG.section.subtitle.y}
					delay={MOTION_CONFIG.section.subtitle.delay}
					duration={MOTION_CONFIG.section.subtitle.duration}
					inView
					once
				>
					<div className="confession-glow mx-auto max-w-3xl space-y-4 text-center sm:space-y-6">
						<p className="text-foreground text-2xl font-light tracking-tight sm:text-3xl md:text-4xl">
							<SplitText stagger={0.08}>Je vais vous faire une confidence.</SplitText>
						</p>

						<div className="text-muted-foreground space-y-4 text-base leading-relaxed text-balance sm:space-y-6 sm:text-lg">
							<Fade inView once y={15} delay={0}>
								<p>Quand j'ai commencé à créer des bijoux, c'était juste pour moi.</p>
							</Fade>
							<Fade inView once y={15} delay={0.2}>
								<p>
									Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans
									mon petit atelier ! C'était pas prévu à la base.
								</p>
							</Fade>
							<Fade inView once y={15} delay={0.4}>
								<p>
									Chaque bijou que vous voyez ici, j'ai choisi ses couleurs, peint ses motifs,
									assemblé chaque perle. Il n'existe qu'en quelques exemplaires (parfois moins de
									dix).
								</p>
							</Fade>
						</div>

						{/* Signature with ink-flow reveal */}
						<SignatureReveal />
					</div>
				</Fade>

				{/* Creative process timeline */}
				<div className="mt-10 sm:mt-16">
					<Fade inView once y={20} duration={MOTION_CONFIG.section.content.duration}>
						<CreativeProcessTimeline />
					</Fade>
				</div>

				{/* Polaroid gallery */}
				<PolaroidGallery />
			</div>
		</section>
	);
}
