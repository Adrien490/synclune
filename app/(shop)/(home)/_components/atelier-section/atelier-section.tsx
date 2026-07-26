import "./atelier-section.css";

import type { ReactNode } from "react";

import { Fade, HandDrawnAccent, SplitTextCSS } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { IMAGES } from "@/shared/constants/images";
import { SITE_URL } from "@/shared/constants/seo-config";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cacheLife, cacheTag } from "next/cache";
import { ATELIER_CONTENT } from "./atelier-content";
import { CreativeProcessTimeline } from "./creative-process-timeline";
// TODO(photos-atelier) — SWAP PHOTOS (le jour où les vraies photos arrivent) :
//   La galerie polaroid est ACTIVE avec des scènes illustrées (polaroid-illustrations.tsx).
//   1. Déposer les photos (atelier + 4 scènes polaroid) dans public/ ou UploadThing.
//   2. Dans polaroid-gallery.tsx : remplacer le bloc <Illustration> par
//      <Image src={photo} alt={p.label} …> (les `label` de polaroid-config.ts = alts prêts).
//   3. Décommenter l'image héro ci-dessous (+ import PlaceholderImage → vraie photo).
//   4. Ré-injecter le ItemList JSON-LD (cf. note au-dessus du composant) avec un
//      `imageUrl` distinct par polaroid dans polaroid-config.ts.
//   5. Purger le cache : profil "reference" via STATIC_PAGES_CACHE_TAGS.ATELIER_SECTION.
// import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { PolaroidGallery } from "./polaroid-gallery";
import { processSteps } from "./process-steps";
import { SectionHeader } from "../section-header";
import { SignatureReveal } from "./signature-reveal";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";
import { STATIC_PAGES_CACHE_TAGS } from "@/shared/constants/cache-tags";

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

// ItemList JSON-LD (polaroid gallery) : ré-injecter quand chaque polaroid aura
// un visuel distinct (ajouter `imageUrl?: string` à PolaroidConfig). Schema
// retiré tant que les 4 contentUrl pointeraient vers la même image (signal
// SEO trompeur pour Google).

// ─── Section Component ──────────────────────────────────────────────────────

/**
 * L'Atelier section - Merges Léane's story with the creative process.
 *
 * Static content with "reference" cache profile.
 * HowTo JSON-LD schema for SEO, Article schema centralized in StructuredData.
 *
 * `stats` : slot ReactNode (pattern Cache Components) — page.tsx y passe
 * `<Suspense><AtelierStats /></Suspense>`. Le JSX traverse ce composant caché
 * comme une référence (hors clé et hors payload) : les counts vivent au profil
 * `catalog` de leurs data functions sans figer la section 7 jours.
 */
export async function AtelierSection({ stats }: { stats?: ReactNode }) {
	"use cache";
	cacheLife("reference");
	cacheTag(STATIC_PAGES_CACHE_TAGS.ATELIER_SECTION);
	return (
		<section
			id="atelier-section"
			className={`bg-primary/5 relative overflow-hidden mask-t-from-97% mask-t-to-100% mask-b-from-99% mask-b-to-100% sm:mask-t-from-90% sm:mask-b-from-95% ${SECTION_SPACING.spacious}`}
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

			{/* Ambient rose + lavender halos — "creator studio" warmth, purely decorative */}
			<div
				className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
				aria-hidden="true"
			>
				<div
					className="absolute top-[8%] right-[-10%] h-[40vh] w-[60vw] max-w-xl rounded-full opacity-50 blur-3xl"
					style={{
						background: "radial-gradient(closest-side, var(--color-glow-pink), transparent 70%)",
					}}
				/>
				<div
					className="absolute bottom-[12%] left-[-8%] h-[35vh] w-[50vw] max-w-md rounded-full opacity-40 blur-3xl"
					style={{
						background:
							"radial-gradient(closest-side, var(--color-glow-lavender), transparent 70%)",
					}}
				/>
			</div>

			<div className="relative mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))]">
				{/* Header — cercle dessiné autour du mot accentué (rose signature,
				    la section n'a pas de data-accent : multicolore assumé) */}
				<SectionHeader
					titleId="atelier-section-title"
					title={
						<>
							Mon{" "}
							<span className="relative inline-block">
								<em className="font-medium italic">atelier</em>
								<HandDrawnAccent
									variant="circle"
									width={130}
									height={64}
									strokeWidth={2.5}
									color="var(--primary)"
									className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
								/>
							</span>
						</>
					}
					subtitle={ATELIER_CONTENT.subtitle}
				/>

				{/* TODO(photos-atelier): image héro masquée — cf. voie de réactivation en tête de fichier.
				<Fade inView once y={20} duration={MOTION_CONFIG.section.content.duration}>
					<div className="mx-auto mb-10 max-w-4xl sm:mb-14">
						<PlaceholderImage
							preserveAspect
							label={ATELIER_CONTENT.heroImageAlt}
							className="aspect-[4/3] w-full rounded-2xl sm:aspect-[16/7]"
						/>
					</div>
				</Fade>
				*/}

				{/* Confession text with progressive reveal */}
				<Fade
					y={MOTION_CONFIG.section.content.y}
					delay={MOTION_CONFIG.section.content.delay}
					duration={MOTION_CONFIG.section.content.duration}
					inView
					once
				>
					<div className="confession-glow mx-auto max-w-3xl space-y-4 text-center sm:space-y-6">
						<p className="text-foreground text-2xl font-light tracking-tight sm:text-3xl md:text-4xl">
							<SplitTextCSS stagger={80}>{ATELIER_CONTENT.confession.intro}</SplitTextCSS>
						</p>

						<div className="text-muted-foreground space-y-4 text-base leading-relaxed text-balance sm:space-y-6 sm:text-lg">
							{ATELIER_CONTENT.confession.paragraphs.map((paragraph, i) => (
								<Fade key={paragraph} inView once y={15} delay={i * 0.2}>
									<p>{paragraph}</p>
								</Fade>
							))}
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

				{/* Stats atelier (slot dynamique — cf. docstring) : payoff chiffré après la timeline */}
				{stats}

				{/* Polaroid gallery — scènes illustrées en attendant les photos (cf. TODO en tête) */}
				<PolaroidGallery />
			</div>
		</section>
	);
}
