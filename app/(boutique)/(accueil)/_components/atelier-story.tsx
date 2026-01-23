import { Fade, Reveal, Stagger } from "@/shared/components/animations";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { PolaroidFrame } from "@/shared/components/polaroid-frame";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { dancingScript } from "@/shared/styles/fonts";
import { Sparkles } from "lucide-react";
import Link from "next/link";

// Données des polaroids - desktop: 4, mobile: 2 premiers (via CSS)
const POLAROID_DATA = [
	{
		caption: "Les mains dans les perles !",
		label: "Photo des mains de Léane assemblant un bijou artisanal",
		tilt: "left" as const,
		washiColor: "pink" as const,
		washiPosition: "top-left" as const,
		mobileOnly: false,
	},
	{
		caption: "Mes petits trésors",
		label: "Perles et matériaux colorés utilisés pour la création",
		tilt: "right" as const,
		washiColor: "lavender" as const,
		washiPosition: "top-right" as const,
		mobileOnly: false,
	},
	{
		caption: "L'inspiration du jour",
		label: "Carnet d'inspiration avec croquis de bijoux",
		tilt: "left" as const,
		washiColor: "mint" as const,
		washiPosition: "top-left" as const,
		mobileOnly: true, // Masqué sur mobile
	},
	{
		caption: "Mon coin créatif",
		label: "Vue de l'atelier de création Synclune",
		tilt: "right" as const,
		washiColor: "peach" as const,
		washiPosition: "top-right" as const,
		mobileOnly: true, // Masqué sur mobile
	},
];

export function AtelierStory() {
	return (
		<section
			id="atelier-story"
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.spacious}`}
			aria-labelledby="atelier-story-title"
			data-voice-queries="qui est Léane Synclune,atelier bijoux Nantes,créatrice bijoux artisanaux"
			data-content-type="about-creator"
		>
			{/* Titre descriptif pour SEO et lecteurs d'ecran */}
			<h2 id="atelier-story-title" className="sr-only">
				L'histoire de Léane, créatrice de bijoux artisanaux Synclune à Nantes
			</h2>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Photo ambiance principale - hauteur reduite sur mobile pour meilleur flow */}
				<Reveal y={20} duration={0.6} once>
					<div className="mb-8 sm:mb-12">
						<PlaceholderImage
							className="aspect-3/2 sm:aspect-video max-h-[50vh] sm:max-h-none"
							label="Atelier de création Synclune à Nantes - Léane travaillant sur ses bijoux artisanaux"
						/>
					</div>
				</Reveal>

				{/* Separateur decoratif anime - delay 0.25s pour apparaitre entre image et texte */}
				<Fade y={8} delay={0.25} duration={0.5} inView once>
					<div
						className="flex justify-center items-center gap-3 mb-8 sm:mb-12"
						aria-hidden="true"
					>
						<Sparkles className="w-4 h-4 text-primary" />
						<Sparkles className="w-5 h-5 text-primary" />
						<Sparkles className="w-4 h-4 text-primary" />
					</div>
				</Fade>

				{/* Texte confession - delay 0.15s apres sparkles, stagger sur paragraphes */}
				<Fade y={12} delay={0.15} duration={0.5} inView once>
					<div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
						{/* Badge decoratif (le vrai h2 est sr-only plus haut) */}
						<span
							className="inline-block text-sm uppercase tracking-[0.2em] text-muted-foreground font-medium"
							aria-hidden="true"
						>
							Depuis mon atelier
						</span>

						{/* Intro accrocheuse */}
						<p className="text-2xl sm:text-3xl md:text-4xl font-light text-foreground tracking-tight">
							Je vais te faire une confidence.
						</p>

						{/* Corps du texte avec stagger pour lecture progressive */}
						<Stagger
							stagger={0.08}
							y={20}
							inView
							once
							className="space-y-4 sm:space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed"
						>
							<p>Quand j'ai commencé à créer des bijoux, c'était juste pour moi.</p>
							<p>
								Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans mon petit atelier à Nantes ! C'était pas prévu à la base <span role="img" aria-label="visage qui rit aux larmes">😂</span>
							</p>
							<p>Chaque bijou que tu vois ici, j'ai choisi ses couleurs, peint ses motifs, assemblé chaque perle. Il n'existe qu'en quelques exemplaires (parfois moins de dix).</p>
							{/* Signature */}
							<p
								className={`${dancingScript.className} text-2xl md:text-3xl text-foreground italic pt-4 text-center`}
							>
								— Léane
							</p>
						</Stagger>
					</div>
				</Fade>

				{/* Galerie de polaroids - 4 photos desktop, 2 mobile (via CSS) */}
				<Reveal y={25} delay={0.3} duration={0.6} once>
					<div className="mt-12 sm:mt-16 space-y-8">
						{/* Photos en grid - Style Polaroid scrapbook */}
						<div
							role="group"
							aria-label="Galerie photos de l'atelier Synclune"
						>
							<Stagger
								stagger={0.1}
								y={20}
								inView
								once
								className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto"
							>
								{POLAROID_DATA.map((item) => (
									<PolaroidFrame
										key={item.caption}
										tilt={item.tilt}
										caption={item.caption}
										washiTape
										washiColor={item.washiColor}
										washiPosition={item.washiPosition}
										className={item.mobileOnly ? "hidden lg:block" : undefined}
									>
										<PlaceholderImage
											className="w-full h-full"
											label={item.label}
										/>
									</PolaroidFrame>
								))}
							</Stagger>
						</div>

						{/* CTA vers personnalisation */}
						<div className="text-center">
							<Link
								href="/personnalisation"
								className="inline-block min-h-12 py-3 px-6 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
								aria-label="Discuter d'un projet de bijou personnalisé avec Léane"
							>
								Discuter d'un projet personnalisé →
							</Link>
						</div>
					</div>
				</Reveal>
			</div>

			{/* JSON-LD structured data for SEO */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "Article",
						headline: "L'histoire de Léane, créatrice de bijoux artisanaux Synclune",
						author: {
							"@type": "Person",
							name: "Léane",
							jobTitle: "Créatrice de bijoux artisanaux",
							workLocation: {
								"@type": "Place",
								address: {
									"@type": "PostalAddress",
									addressLocality: "Nantes",
									addressCountry: "FR",
								},
							},
						},
						about: {
							"@type": "Brand",
							name: "Synclune",
							description: "Bijoux artisanaux faits main à Nantes",
						},
					}),
				}}
			/>
		</section>
	);
}
