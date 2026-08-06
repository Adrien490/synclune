import type { CSSProperties } from "react";

import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import {
	ATELIER_HOWTO,
	ATELIER_IMAGE,
	ATELIER_IMAGE_ALT,
	ATELIER_STEPS,
} from "@/shared/constants/atelier-content";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";

import { AtelierPortrait } from "./atelier-portrait";
import { AtelierThreadStroke, type AtelierThreadPathName } from "./atelier-thread";

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
 * respecté : les tokens ne touchent QUE des tracés SVG décoratifs (le cercle
 * du numéro, la vignette de geste), jamais l'encre du texte — un token de
 * marque est un rose/violet de SURFACE, pas une couleur de lecture.
 *
 * ⚠️ Les notes portaient chacune un `MaskingTape` teinté (`tapeTint`). Les
 * quatre ont été retirés le 2026-08-06 : c'était le dernier ruban EN SÉRIE du
 * storefront. Ne pas les remettre : l'encre des étapes, c'est le cercle du
 * numéro et sa vignette.
 */
const STEP_ACCENTS: ReadonlyArray<{ token: string }> = [
	{ token: "var(--primary)" },
	{ token: "var(--color-brand-lavender)" },
	{ token: "var(--color-brand-mint)" },
	{ token: "var(--color-brand-sun)" },
];

/**
 * La vignette de geste de chaque étape (SSOT des tracés :
 * `ATELIER_THREAD_PATHS`) — l'étincelle de l'idée, la goutte-perle du
 * matériel, la chaleur du four, le nœud-ruban de la finition. Keyée sur les
 * `id` de la SSOT de contenu : ajouter une étape sans vignette casse ici, au
 * typecheck du repli, pas en silence.
 */
const STEP_VIGNETTES: Record<string, AtelierThreadPathName> = {
	idea: "sparkle",
	materials: "drop",
	assembly: "heat",
	finishing: "bow",
};

/**
 * L'encre du FIL — mono-lavande (arbitrage A3 du gate maquette, 2026-08-06) :
 * les segments restent à l'accent de la salle pendant que perles et vignettes
 * descendent la gamme quadri. Évite le segment lavande-sur-lavande redondant
 * ET la finale soleil (l'encre la plus pâle) juste avant la FAQ soleil.
 * Explicite plutôt que `--section-accent` : c'est une décision de direction,
 * pas une cascade.
 */
const THREAD_INK = "var(--color-brand-lavender)";

/**
 * Poses statiques alternées des notes d'étapes (mêmes arbitrages que
 * `CARD_TILT` des cartes collection : une pose n'est pas un mouvement, donc
 * pas de `motion-safe:` ; classes LITTÉRALES, jamais interpolées). En colonne
 * unique le décalage de coin passe de ~2,9 à ~4,4 px — la pose redevient
 * lisible, là où la grille 2×2 l'écrasait (validé au gate maquette).
 */
const NOTE_TILT = ["-rotate-[0.5deg]", "rotate-[0.5deg]"] as const;

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
 * Direction « Le fil de l'atelier » (2026-08-06, SSOT
 * `docs/LANDING-SECTION-ATELIER.md`, géométrie validée au gate maquette) : un
 * bijou Synclune, c'est des perles enfilées une à une — la section fait
 * pareil. Un fil dessiné à la main descend le récit, chaque étape du
 * processus est une perle posée dessus. Le fil est le MÉCANISME de la
 * section, pas un décor : c'est la seule colonne vertébrale de la page, ce
 * qui casse le « métronome » des trois ouvertures identiques (audit landing
 * du 2026-08-06) — le surligneur du h1 reste héros-seul, le bloc titre garde
 * la grammaire `h2` + rail.
 *
 * **La géométrie qui fait foi** (gate maquette) : gouttière de 3,5 rem
 * (`pl-14`), axe du fil à 2,75 rem (`left-11`) — 12 px À GAUCHE du bord des
 * cartes —, perle de 38 px centrée sur l'axe donc à cheval de ~7 px sur la
 * carte, colonne enfilée plafonnée à 36 rem (A1 : la réserve à droite est
 * l'emplacement NOMMÉ des polaroids futurs), segments logés dans le gap FIXE
 * de 3,25 rem de l'`<ol>` — indifférents à la hauteur des notes (critère
 * d'échec du doc : si une retouche de copie oblige à retoucher un segment, le
 * montage est mauvais).
 *
 * Les pièces, dans l'ordre de lecture :
 *
 * - **Le portrait polaroid** (`AtelierPortrait`) — sticky ≥ `lg` en colonne
 *   gauche, porté par la CELLULE (`self-start`), jamais par un enfant. La
 *   colonne enfilée rallonge la course sticky : le portrait accompagne la
 *   lecture. Deux états (photo / plaque dessinée) branchés sur la SSOT
 *   `ATELIER_IMAGE`.
 * - **La confidence** — deux paragraphes sur papier `--section-wash` : le
 *   consommateur PRINCIPAL du lavis lavande (la plaque du portrait en est le
 *   second). C'est sous ce papier que le fil prend sa source — le récit se
 *   déverse dans le geste.
 * - **Le processus enfilé** — l'`<ol>` en colonne unique (la grille 2×2 est
 *   morte : quatre cartes en grille, c'est un inventaire ; quatre perles sur
 *   un fil, c'est un geste qui avance). Un segment de fil mono-lavande entre
 *   chaque perle — UN `<svg>` par segment (`AtelierThreadStroke`), en
 *   `hand-draw-inview` : le tracé progressif EST la métaphore (on enfile), et
 *   le dessin par-segment est assumé (pas d'`animation-range` par segment,
 *   A5). Perle = numéro encerclé à cheval sur la carte ; vignette de geste à
 *   l'encre de l'étape ; nœud final après la quatrième note — le bijou est
 *   fini, pas de CTA derrière.
 *
 * Ce qui est délibérément ABSENT : tout fetch (contenu 100 % statique — donc
 * ni `"use cache"` ni cacheTag ni Suspense), les stats live, la galerie
 * polaroid tant que les photos n'existent pas, un CTA de sortie (la FAQ qui
 * suit porte la sortie mailto), et tout JSON-LD local (le `HowTo` est un nœud
 * du `@graph`, jamais un `<script>` de section). Fil, perles, vignettes,
 * nœud : tous `aria-hidden` — l'ordre et le contenu sont portés par l'`<ol>`
 * et ses `<li>` ancrés `#atelier-step-<id>`, que les `url` des `HowToStep`
 * référencent.
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
			<div className="pt-12 lg:pt-16">
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
						<AtelierPortrait src={ATELIER_IMAGE} alt={ATELIER_IMAGE_ALT} />
					</div>

					{/* A1 : la colonne enfilée est PLAFONNÉE — les ~10 rem restants de
					    la cellule sont la réserve nommée des polaroids futurs (« en
					    regard des notes », § photos du doc), un vide destiné, pas subi. */}
					<div className="max-w-[36rem]">
						{/* La confidence — un papier lavé posé sur la page. Le consommateur
						    PRINCIPAL du lavis lavande de la section (la plaque du portrait
						    en est le second). */}
						<div
							className="enter-inview shadow-paper relative mt-10 rotate-[0.4deg] rounded-2xl border bg-(--section-wash) p-5 sm:p-6 lg:mt-0"
							style={{ "--enter-y": "16px" } as CSSProperties}
						>
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

						{/* La SOURCE du fil : le premier segment part du bord bas de la
						    confidence et descend dans la gouttière, À GAUCHE du h3 (jamais
						    à travers — A2) : le récit se déverse dans le geste. Le bloc
						    déborde volontairement sur la zone du h3 (marge négative). */}
						<div aria-hidden="true" className="relative mt-3 -mb-11 h-24">
							<span className="absolute left-11 -translate-x-1/2">
								<AtelierThreadStroke name="segmentA" width={16} color={THREAD_INK} />
							</span>
						</div>

						{/* = ATELIER_HOWTO.name, mot pour mot : c'est le `name` du nœud
						    HowTo du @graph — le balisage doit correspondre au visible.
						    Aligné sur le bord gauche des CARTES (`pl-14`), pas de la
						    gouttière (A2). */}
						<h3 className="font-display text-foreground pl-14 text-xl font-normal">
							{ATELIER_HOWTO.name}
						</h3>

						{/* Le processus enfilé — colonne unique, gap FIXE de 3,25 rem : le
						    logement des segments, indifférent à la hauteur des notes. */}
						<ol className="mt-5 flex flex-col gap-y-13 pl-14">
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
									{/* Le segment qui AMÈNE cette perle — logé dans le gap fixe
									    au-dessus de la carte, sur l'axe du fil, recadré (jamais
									    étiré) à la hauteur du gap. Deux formes alternées (A5). */}
									{index > 0 && (
										<span
											aria-hidden="true"
											className="absolute bottom-full -left-3 grid h-13 w-6 -translate-x-1/2 place-items-center overflow-hidden"
										>
											<AtelierThreadStroke
												name={index % 2 ? "segmentB" : "segmentA"}
												width={16}
												color={THREAD_INK}
											/>
										</span>
									)}

									{/* La PERLE : le numéro encerclé, À CHEVAL sur le bord gauche
									    de la carte — centré sur l'axe du fil (A2). Décorative :
									    l'<ol> porte déjà l'ordre. Chiffre en ENCRE
									    (`--foreground`), cercle au token de l'étape. */}
									<span
										aria-hidden="true"
										className="absolute top-4 -left-[1.875rem] inline-flex size-9 items-center justify-center"
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

									{/* `pl-8` : la copie dégage le débord de la perle. La
									    vignette de geste illustre l'étape à son encre — la
									    section est DESSINÉE, pas photographiée. */}
									<div className="flex items-center gap-4 pl-8">
										<div className="min-w-0 flex-1">
											<p className="text-foreground font-medium">{step.title}</p>
											<p className="text-muted-foreground mt-0.5 text-[0.9375rem] leading-relaxed">
												{step.description}
											</p>
										</div>
										<AtelierThreadStroke
											name={STEP_VIGNETTES[step.id] ?? "sparkle"}
											width={40}
											color={STEP_ACCENTS[index]?.token}
											className="shrink-0"
										/>
									</div>
								</li>
							))}
						</ol>

						{/* Le NŒUD final : après la quatrième note, le fil se termine — le
						    bijou est fini. Pas de CTA derrière (l'atelier ne vend pas). */}
						<div aria-hidden="true" className="relative h-14">
							<span className="absolute top-2 left-11 -translate-x-1/2">
								<AtelierThreadStroke name="knot" width={32} color={THREAD_INK} />
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
