import Image from "next/image";
import type { CSSProperties } from "react";

import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { CARD_SURFACE_POLAROID } from "@/shared/components/card-surface.constants";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { MaskingTape } from "@/shared/components/masking-tape";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import {
	ATELIER_HOWTO,
	ATELIER_IMAGE,
	ATELIER_IMAGE_ALT,
	ATELIER_STEPS,
} from "@/shared/constants/atelier-content";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";

/**
 * Ancre de la section — c'est aussi le fragment que pointe l'`@id` du nœud
 * `HowTo` du `@graph` (`shared/components/structured-data.tsx`), sur le même
 * principe que `#faq` pour le `FAQPage` : le balisage doit pointer du contenu
 * réellement visible. Volontairement NON exporté (même arbitrage que
 * `FAQ_SECTION_ID` : l'exporter en ferait un export mort).
 */
const ATELIER_SECTION_ID = "atelier";

const TITLE_ID = "atelier-title";

/**
 * Encres des quatre étapes — les quatre touches de marque, dans l'ORDRE DU
 * RAIL (rose → lavande → menthe → soleil) : le processus de création descend
 * la même gamme que le trait de pinceau des titres. Contrat des accents
 * respecté : les tokens ne touchent QUE des surfaces (le tape) et des tracés
 * SVG décoratifs (le cercle du numéro), jamais l'encre du texte — un token de
 * marque est un rose/violet de SURFACE, pas une couleur de lecture.
 *
 * L'étape 1 n'a pas de `tapeTint` : le défaut de `MaskingTape` EST déjà la
 * recette rose à 45 % (`bg-primary/45`). Les trois autres appliquent la même
 * recette `color-mix(… 45 %, transparent)` sur leur token.
 *
 * ⚠️ Les tapes des notes sont une exception ASSUMÉE à la règle « jamais de
 * ruban par item » (purge des rubans en série du 2026-08-05) : l'atelier est
 * l'habitat scrapbook du motif, et la JSDoc de `masking-tape.tsx` cite ces
 * `tapeTint` comme consommateur légitime. Ne pas exporter ce motif vers
 * d'autres grilles.
 */
const STEP_ACCENTS: ReadonlyArray<{ token: string; tapeTint?: string }> = [
	{ token: "var(--primary)" },
	{
		token: "var(--color-brand-lavender)",
		tapeTint: "color-mix(in oklab, var(--color-brand-lavender) 45%, transparent)",
	},
	{
		token: "var(--color-brand-mint)",
		tapeTint: "color-mix(in oklab, var(--color-brand-mint) 45%, transparent)",
	},
	{
		token: "var(--color-brand-sun)",
		tapeTint: "color-mix(in oklab, var(--color-brand-sun) 45%, transparent)",
	},
];

/**
 * Poses statiques alternées des notes d'étapes (mêmes arbitrages que
 * `CARD_TILT` des cartes collection : une pose n'est pas un mouvement, donc
 * pas de `motion-safe:` ; classes LITTÉRALES, jamais interpolées).
 */
const NOTE_TILT = ["-rotate-[0.5deg]", "rotate-[0.5deg]"] as const;
const TAPE_TILT = ["-rotate-2", "rotate-2"] as const;

/** Décalage de la cascade d'entrée, en % de la plage `entry` (cf. collections-grid). */
const ENTER_STAGGER_STEP_PCT = 6;
const ENTER_STAGGER_MAX_PCT = 24;

function noteStyle(index: number): CSSProperties {
	return {
		"--enter-y": "20px",
		"--enter-stagger": `${Math.min(index * ENTER_STAGGER_STEP_PCT, ENTER_STAGGER_MAX_PCT)}%`,
	} as CSSProperties;
}

/**
 * « Viens voir l'atelier » — le récit de Léane, sur la landing.
 *
 * @description
 * Direction « L'établi de Léane » (2026-08-05) : la seule section de la page
 * avec un visage humain, et la seule qui raconte au lieu de vendre. Placement
 * entre les collections et la FAQ — accroche produit → orientation → récit →
 * réassurance. Même grammaire que les voisines (« L'étal continue ») : filet
 * haut pour seul séparateur, bloc titre `h2` + `HandDrawnRail`, jamais de
 * bande à fond plein.
 *
 * Trois pièces, toutes dans le vocabulaire « papier » existant :
 *
 * - **Le portrait polaroid** — sticky ≥ `lg` en colonne GAUCHE (le miroir de
 *   la carte « Écris-moi » sticky droite de la FAQ) : Léane te regarde pendant
 *   que tu lis sa confidence. Sticky porté par la CELLULE (`self-start`),
 *   jamais par un enfant — le sticky mort du rail de filtres. La photo est le
 *   portrait FOUNDER en placeholder : le point de swap vers les vraies photos
 *   est `ATELIER_IMAGE` (SSOT), pas ce fichier.
 * - **La confidence** — deux paragraphes sur un papier `--section-wash` : ce
 *   lavis est CE QUI JUSTIFIE le `data-accent="lavender"` de la section (un
 *   accent sans consommateur ment sur l'existence d'une cascade — cf.
 *   `EtalSection`). Lavande : le seul accent que la landing n'avait pas encore
 *   revendiqué (collections = menthe, FAQ = soleil) — la page complète ses
 *   quatre touches. Pas de signature « — Léane » : le storefront ne signe
 *   qu'une fois par page, dans le footer ; la légende cursive du polaroid est
 *   une légende de photo, pas une signature.
 * - **Le processus** — un `<ol>` de quatre notes papier scotchées, chacune à
 *   l'encre d'une touche de marque (cf. `STEP_ACCENTS`). Les titres d'étapes
 *   sont des `<p>`, pas des `h4` : quatre items d'une ligne dans une liste
 *   ordonnée n'ont pas besoin de jalons de navigation (la FAQ met des `h4` sur
 *   des items INTERACTIFS repliés — pas le cas ici). Le `h3` est la seule
 *   sous-tête, et c'est mot pour mot le `name` du nœud `HowTo` du `@graph`
 *   (SSOT `ATELIER_HOWTO`) ; chaque `<li>` porte l'ancre `#atelier-step-<id>`
 *   que les `url` des `HowToStep` référencent.
 *
 * Ce qui est délibérément ABSENT : tout fetch (contenu 100 % statique — donc
 * ni `"use cache"` ni cacheTag ni Suspense), les stats live (recréer les
 * compteurs supprimés = du fetch pour trois chiffres qu'un petit catalogue
 * rend peu flatteurs), la galerie polaroid (quatre cadres sur le MÊME asset
 * placeholder = le signal trompeur qui avait fait retirer l'ItemList galerie),
 * un CTA de sortie (rien à lier — la FAQ qui suit porte la sortie mailto), et
 * tout JSON-LD local (le `HowTo` est un nœud du `@graph`, jamais un
 * `<script>` de section).
 */
export function AtelierSection() {
	return (
		<section
			id={ATELIER_SECTION_ID}
			aria-labelledby={TITLE_ID}
			data-accent="lavender"
			// `scroll-mt` : l'ancre `/#atelier` (HowTo, partages) ne doit pas coller
			// le titre sous la barre fixe. `--navbar-height-static`, jamais
			// `--navbar-height` (qui retombe au premier pixel scrollé) — cf. FAQ.
			className={`${CONTAINER_CLASS} scroll-mt-[calc(var(--navbar-height-static)+1.5rem)] pb-12 lg:pb-16`}
		>
			<div className="border-border/60 border-t pt-12 lg:pt-16">
				<div className="enter-inview max-w-[46ch]">
					<h2
						id={TITLE_ID}
						className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.08] font-light tracking-[-0.015em]"
					>
						Viens voir l&apos;atelier
					</h2>

					{/* UNE touche de pinceau, en lavande — l'accent de la section.
					    `inView` : sous la ligne de flottaison, le tracé se joue à
					    l'ARRIVÉE (timeline `view()`) — la grammaire de la FAQ. */}
					<div aria-hidden="true" className="mt-1.5 mb-3 flex sm:mt-2 sm:mb-5">
						<HandDrawnRail accent="bg-brand-lavender" inView />
					</div>

					<p className="text-muted-foreground text-[1.0625rem] leading-[1.65]">
						Tout part d&apos;une table à Nantes — des perles, de la peinture, un four et beaucoup
						d&apos;idées. Voici d&apos;où viennent tes bijoux.
					</p>
				</div>

				{/* ≥ lg : portrait sticky à gauche, récit à droite. Le sticky est porté
				    par la CELLULE (`self-start` + top dérivé de la barre statique),
				    jamais par un enfant d'une cellule `items-start` (sticky mort,
				    2026-08-05). Sous `lg`, tout empile : titre → portrait → récit. */}
				<div className="mt-8 sm:mt-10 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
					<div className="lg:sticky lg:top-[calc(var(--navbar-height-static)+1.5rem)] lg:self-start">
						{/* Le tirage : enveloppe polaroid des cartes Atelier, SANS les
						    variantes hover/focus — ce n'est pas un lien, le cadre n'a pas
						    à réagir. `polaroid-paper` pose le grain mat. Pose penchée
						    littérale, tape rose signature (défaut, sans `tint`). */}
						<figure
							className={cn(
								CARD_SURFACE_POLAROID,
								"polaroid-paper enter-inview max-w-[15rem] -rotate-[1.2deg] sm:max-w-[17rem] lg:max-w-none",
							)}
							style={{ "--enter-y": "20px" } as CSSProperties}
						>
							<MaskingTape className="-top-2 left-1/2 z-20 h-4 w-14 -translate-x-1/2 -rotate-2" />
							<div className="relative aspect-4/5 overflow-hidden rounded-sm">
								<Image
									src={ATELIER_IMAGE}
									alt={ATELIER_IMAGE_ALT}
									fill
									// Colonne `22rem` moins la marge du tirage à `lg`, `15-17rem`
									// empilé en dessous. Section sous la ligne de flottaison :
									// `lazy` (défaut), aucun `preload`.
									sizes="(min-width: 1024px) 21rem, 16rem"
									className="object-cover"
									quality={IMAGE_QUALITY.STANDARD}
								/>
							</div>
							<figcaption className="font-cursive text-muted-foreground px-1.5 pt-2.5 pb-3 text-center text-[0.9375rem] sm:px-2">
								C&apos;est moi, Léane&nbsp;!
							</figcaption>
						</figure>
					</div>

					<div>
						{/* La confidence — un papier lavé posé sur la page (le langage de
						    la note soleil de la FAQ : surface interne, jamais une bande).
						    C'est LE consommateur du lavis lavande de la section. */}
						<div
							className="enter-inview shadow-paper relative mt-10 rotate-[0.4deg] rounded-2xl border bg-(--section-wash) p-5 sm:p-6 lg:mt-0"
							style={{ "--enter-y": "16px" } as CSSProperties}
						>
							<MaskingTape className="-top-2 left-8 z-10 h-4 w-14 rotate-2" />
							<p className="text-muted-foreground text-base leading-relaxed">
								Au début, je créais juste pour moi. Puis pour ma famille, mes amies, des amies
								d&apos;amies… et Synclune est né. Rien de tout ça n&apos;était prévu — et pourtant,
								aujourd&apos;hui, c&apos;est une évidence.
							</p>
							<p className="text-muted-foreground mt-4 text-base leading-relaxed">
								Chaque pièce que tu vois ici, je l&apos;ai imaginée, peinte et assemblée moi-même.
								Chaque couleur, chaque forme est choisie avec soin — pour que ton bijou
								n&apos;existe qu&apos;en un seul exemplaire&nbsp;: le tien.
							</p>
						</div>

						{/* = ATELIER_HOWTO.name, mot pour mot : c'est le `name` du nœud
						    HowTo du @graph — le balisage doit correspondre au visible. */}
						<h3 className="font-display text-foreground mt-10 text-xl font-normal sm:mt-12">
							{ATELIER_HOWTO.name}
						</h3>

						{/* `items-start`, comme les grilles voisines : deux notes d'une
						    même rangée ne se réalignent pas sur la plus haute. */}
						<ol className="mt-4 grid items-start gap-4 sm:grid-cols-2">
							{ATELIER_STEPS.map((step, index) => (
								<li
									key={step.id}
									// L'ancre que pointe l'`url` du HowToStep correspondant.
									id={`atelier-step-${step.id}`}
									className={cn(
										"enter-inview bg-card shadow-paper relative scroll-mt-24 rounded-2xl border p-4 sm:p-5",
										NOTE_TILT[index % NOTE_TILT.length],
									)}
									style={noteStyle(index)}
								>
									<MaskingTape
										className={cn(
											"-top-2 left-1/2 z-10 h-4 w-12 -translate-x-1/2",
											TAPE_TILT[index % TAPE_TILT.length],
										)}
										tint={STEP_ACCENTS[index]?.tapeTint}
									/>
									<div className="flex gap-3">
										{/* Le numéro encerclé à la main — décoratif : l'<ol> porte
										    déjà l'ordre pour les technologies d'assistance. Chiffre
										    en ENCRE (`--foreground`), cercle au token de l'étape
										    (tracé SVG décoratif — un token de marque ne colore
										    jamais du texte), dessiné à l'arrivée (`inView`). */}
										<span
											aria-hidden="true"
											className="relative inline-flex size-9 shrink-0 items-center justify-center"
										>
											<span className="font-display text-foreground text-lg">{index + 1}</span>
											<HandDrawnAccent
												variant="circle"
												width={38}
												color={STEP_ACCENTS[index]?.token}
												strokeWidth={HAND_DRAWN_STROKES.trait}
												className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
											/>
										</span>
										<div>
											<p className="text-foreground font-medium">{step.title}</p>
											<p className="text-muted-foreground mt-0.5 text-[0.9375rem] leading-relaxed">
												{step.description}
											</p>
										</div>
									</div>
								</li>
							))}
						</ol>
					</div>
				</div>
			</div>
		</section>
	);
}
