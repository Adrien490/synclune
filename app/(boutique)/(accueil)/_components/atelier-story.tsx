import { Fade, Reveal, Stagger } from "@/shared/components/animations";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { dancingScript } from "@/shared/styles/fonts";
import { Heart, Sparkles } from "lucide-react";

export function AtelierStory() {
	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-labelledby="atelier-story-title"
			itemScope
			itemType="https://schema.org/Article"
		>

			{/* Titre descriptif pour SEO et lecteurs d'ecran */}
			<h2 id="atelier-story-title" className="sr-only">
				L'histoire de Léane, créatrice de bijoux artisanaux Synclune à Nantes
			</h2>

			{/* Microdata Schema.org pour l'artisan */}
			<div
				itemScope
				itemType="https://schema.org/Person"
				itemProp="author"
				className="hidden"
			>
				<meta itemProp="name" content="Léane Taddei" />
				<meta itemProp="jobTitle" content="Créatrice de bijoux artisanaux" />
				<meta itemProp="worksFor" content="Synclune" />
				<meta
					itemProp="address"
					content="Nantes, Loire-Atlantique, France"
				/>
			</div>

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Photo ambiance principale - hauteur reduite sur mobile pour meilleur flow */}
				<Reveal y={20} duration={0.6} once>
					<div className="mb-8 sm:mb-12">
						<PlaceholderImage
							className="aspect-[3/2] sm:aspect-[16/9] max-h-[50vh] sm:max-h-none"
							label="Atelier de création Synclune à Nantes - Léane travaillant sur ses bijoux artisanaux"
						/>
					</div>
				</Reveal>

				{/* Separateur decoratif anime - delay 0 pour apparaitre en premier */}
				<Fade y={8} delay={0} duration={0.5} inView once>
					<div
						className="flex justify-center items-center gap-3 mb-8 sm:mb-12"
						aria-hidden="true"
					>
						<Sparkles className="w-4 h-4 text-secondary" />
						<Sparkles className="w-5 h-5 text-primary" />
						<Sparkles className="w-4 h-4 text-secondary" />
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
							y={12}
							inView
							once
							className="space-y-4 sm:space-y-6 text-base sm:text-lg/8 text-muted-foreground"
						>
							<p>
								Quand j'ai commencé à créer des bijoux, c'était juste pour moi.
							</p>
							<p>
								Et puis, des amies ont voulu les mêmes. Puis des amies d'amies.
								Et me voilà, dans mon petit atelier à Nantes ! C'était pas prévu à la base 😂
							</p>
							<p>
								Chaque bijou que tu vois ici, j'ai
								choisi ses couleurs, peint ses motifs, assemblé chaque perle. Il
								n'existe qu'en quelques exemplaires (parfois moins de dix).
						
							</p>
							{/* Citation finale mise en valeur avec blockquote */}
							<blockquote className="relative pl-6 border-l-2 border-primary/50 text-foreground font-medium text-left">
								<p>Tout est fait à la main !</p>
								<p>Je mets du cœur à chaque création, j'espère que ça vous plaira{" "}<Heart className="w-4 h-4 text-primary inline-block align-middle" aria-hidden="true" /></p>
							</blockquote>
						</Stagger>

						{/* Signature - taille agrandie sur mobile */}
						<div className="pt-6">
							<p
								className={`${dancingScript.className} text-2xl sm:text-2xl md:text-3xl text-foreground italic`}
							>
								— Léane
							</p>
						</div>
					</div>
				</Fade>

				{/* Photos secondaires + CTA - delay 0.3s pour sequence naturelle */}
				<Reveal y={25} delay={0.3} duration={0.6} once>
					<div className="mt-12 sm:mt-16 space-y-8">
						{/* Photos en grid 2 colonnes */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
							<PlaceholderImage
								className="aspect-[4/3]"
								label="Photo des mains de Léane assemblant un bijou artisanal"
							/>
							<PlaceholderImage
								className="aspect-[4/3]"
								label="Perles et matériaux colorés utilisés pour la création"
							/>
						</div>

					</div>
				</Reveal>
			</div>
		</section>
	);
}
