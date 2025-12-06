import { Fade, Reveal, Stagger } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { dancingScript } from "@/shared/styles/fonts";
import { ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";

/**
 * ============================================================================
 * ALTERNATIVES DE DESIGN - Documentation pour changement futur
 * ============================================================================
 *
 * OPTION A : "Lettre de l'atelier" (intimiste)
 * ---------------------------------------------
 * Layout : Photo portrait créatrice (60%) + texte à droite (40%)
 * Vibe : Chaleureux, personnel, connexion directe
 * Structure :
 *   - Grande photo portrait de Léane (aspect 3:4)
 *   - Texte "Salut toi, Si tu es là..."
 *   - Petite photo mains au travail en dessous
 *   - Signature manuscrite
 *   - CTA vers À propos
 * Idéal pour : Créer un lien personnel fort avec les visiteurs
 *
 * Texte suggéré :
 * ```
 * ✦ Depuis mon atelier
 *
 * Salut toi,
 *
 * Si tu es là, c'est peut-être que tu cherches plus qu'un simple bijou.
 * Quelque chose qui te ressemble, qui a une histoire.
 *
 * Depuis mon petit atelier nantais, je crée des pièces colorées, une par une,
 * à la main. Pas de machine, pas de production en série. Juste mes mains,
 * des perles que je sélectionne avec soin, et l'envie de créer quelque chose
 * d'unique.
 *
 * Chaque bijou existe en quelques exemplaires seulement.
 * Quand il n'y en a plus... il n'y en a plus.
 *
 * J'espère que tu trouveras ici la petite pépite qui t'accompagnera.
 *
 * — Léane ♡
 * ```
 *
 * ---------------------------------------------
 *
 * OPTION B : "L'envers du décor" (narratif)
 * ---------------------------------------------
 * Layout : 3 photos en grid + texte centré en dessous
 * Vibe : Curieux, processus, transparence
 * Structure :
 *   - Grid 3 photos (atelier, mains, matériaux)
 *   - Titre "L'envers du décor"
 *   - Texte narratif sur le processus
 *   - CTA vers À propos
 * Idéal pour : Montrer le travail artisanal et le processus
 *
 * Texte suggéré :
 * ```
 * L'envers du décor
 * ─────────────────
 *
 * Tu vois ces bijoux dans la boutique, mais tu ne vois pas les heures
 * passées à choisir chaque perle, à assembler chaque détail, à recommencer
 * quand ce n'est pas parfait.
 *
 * Mon atelier, c'est un petit coin de Nantes où la magie opère.
 * Une table, de la lumière, des centaines de perles colorées, et beaucoup
 * de patience.
 *
 * Je ne crée pas des bijoux pour tout le monde. Je crée des bijoux pour toi,
 * pour celle qui cherche quelque chose de différent, de personnel, de vivant.
 *
 * Envie d'en savoir plus ?
 * ```
 *
 * ---------------------------------------------
 *
 * OPTION C : "Split immersif" (visuel dominant)
 * ---------------------------------------------
 * Layout : 50% photo plein hauteur + 50% texte
 * Vibe : Élégant, moderne, impact visuel fort
 * Structure :
 *   - Photo atelier/ambiance (50% largeur, full height)
 *   - Texte poétique à droite
 *   - Pas de photos secondaires
 *   - CTA discret
 * Idéal pour : Impact visuel maximal, design épuré
 * Animation : Parallax léger sur l'image au scroll
 *
 * Texte suggéré :
 * ```
 * ✦
 *
 * Un bijou, c'est bien plus qu'un accessoire.
 *
 * C'est une histoire. Celle de mes mains qui assemblent, ajustent,
 * perfectionnent. Celle de mon atelier nantais où chaque création
 * prend vie, lentement.
 *
 * Ici, pas de production en masse. Juste de l'artisanat, du vrai.
 * Des pièces limitées, pensées pour durer.
 *
 * Et toi, tu fais partie de cette histoire.
 * ```
 *
 * ============================================================================
 * OPTION ACTUELLE : D - "Confession créative" (très personnel)
 * ============================================================================
 */

/**
 * Placeholder esthetique avec gradient pour les photos en attente
 * Ameliore : gradient plus visible, icone centrale, bordure subtile
 * @param className - Classes additionnelles pour aspect ratio responsive
 * @param label - Label accessible pour les lecteurs d'ecran (si fourni, le placeholder est annonce)
 */
function PlaceholderImage({
	className,
	label,
}: {
	className?: string;
	label?: string;
}) {
	return (
		<div
			className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-secondary/40 via-muted/50 to-primary/30 border border-border/30 flex items-center justify-center transition-opacity duration-500 ${className ?? ""}`}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			<ImageIcon className="w-12 h-12 text-muted-foreground/40" aria-hidden="true" />
		</div>
	);
}

/**
 * Section "Confession créative" - Storytelling intimiste de Léane
 *
 * Approche narrative personnelle et authentique pour la page d'accueil.
 * Raconte l'histoire de la créatrice avec un ton intimiste (tutoiement).
 *
 * Utilise "use cache" car:
 * - Contenu statique (histoire de la créatrice)
 * - Partagé entre tous les visiteurs
 * - Améliore les performances de la page d'accueil
 */
export async function AtelierStory() {
	"use cache";
	cacheLife("reference");
	cacheTag("atelier-story");

	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
			aria-labelledby="atelier-story-title"
			itemScope
			itemType="https://schema.org/Article"
		>
			{/* Skip link pour accessibilite clavier */}
			<a
				href="#atelier-cta"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
			>
				Passer au bouton En savoir plus
			</a>

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

			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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
								Pour le plaisir de faire quelque chose de mes mains, loin des
								écrans. Je dessinais des Pikachu sur du plastique fou, je
								peignais des nuits étoilées à la Van Gogh... Rien de sérieux.
							</p>
							<p>
								Et puis, des amies ont voulu les mêmes. Puis des amies d'amies.
								Et me voilà, dans mon petit atelier à Nantes, à créer des bijoux
								pour des personnes que je ne connais pas encore — mais que j'ai
								hâte de rencontrer à travers leurs commandes.
							</p>
							<p>
								Chaque bijou que tu vois ici, je l'ai tenu dans mes mains. J'ai
								choisi ses couleurs, peint ses motifs, assemblé chaque perle. Il
								n'existe qu'en quelques exemplaires — parfois moins de dix.
								Quand il n'y en a plus... il n'y en a plus.
							</p>
							{/* Citation finale mise en valeur avec blockquote */}
							<blockquote className="relative pl-6 border-l-2 border-primary/50 text-foreground font-medium text-left">
								<p>Ce n'est pas du luxe. C'est de l'artisanat.</p>
								<p>Du vrai, du fait-main, du cœur.</p>
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

						{/* CTA centre en dessous */}
						<div
							id="atelier-cta"
							className="flex flex-col items-center gap-4 text-center"
						>
							<p className="text-sm text-muted-foreground max-w-md">
								Envie d'en savoir plus sur mon parcours et mes inspirations ?
							</p>
							<Button
								asChild
								variant="default"
								size="lg"
								className="shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
							>
								<Link
									href="/a-propos"
									aria-label="En savoir plus sur l'histoire de Léane et son atelier artisanal"
								>
									En savoir plus sur mon histoire
								</Link>
							</Button>
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
