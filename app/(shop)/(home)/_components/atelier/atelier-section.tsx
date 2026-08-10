import type { CSSProperties } from "react";

import {
	ACCENT_SHAPE_PATHS,
	ATELIER_THREAD_PATHS,
	CREATION_PATHS,
	type HandDrawnPathConfig,
} from "@/shared/components/hand-drawn/paths";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import {
	ATELIER_HOWTO,
	ATELIER_IMAGE,
	ATELIER_IMAGE_ALT,
	ATELIER_STEPS,
	type AtelierStepId,
} from "@/shared/constants/atelier-content";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";

import { AtelierPortrait } from "./atelier-portrait";
import { AtelierThreadRail, AtelierThreadStroke } from "./atelier-thread";
import { AtelierWorktable } from "./atelier-worktable";

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
 * L'accent de chaque étape, posé en `data-accent` sur son `<li>` — les quatre
 * touches de marque dans l'ORDRE DU RAIL (rose → lavande → menthe → soleil) :
 * le processus de création descend la même gamme que le trait de pinceau des
 * titres.
 *
 * ⚠️ **C'est un `data-accent`, plus un tableau de tokens.** La version d'avant
 * (`STEP_ACCENTS = [{ token: "var(--primary)" }, …]`) ré-implémentait en
 * littéral une correspondance qui vit déjà dans `app/styles/section-accents.css`,
 * et elle n'était pas keyée sur `AtelierStepId` : une cinquième étape recevait
 * `undefined` en silence, et la `key` des gouttes de la pampille — dérivée du
 * token — se dupliquait dès que deux étapes partageaient une encre. La
 * polychromie se joue par la ROTATION D'ACCENTS, c'est le mécanisme prévu ;
 * perle, vignette et goutte retombent alors sur `var(--section-accent)`.
 *
 * L'ordre est INCHANGÉ depuis le passage de la salle au rose (2026-08-06) : la
 * première perle partage l'encre du fil, ce qui se lit comme la SOURCE du geste
 * (le fil naît rose sous la confidence, sa première perle l'est aussi), puis la
 * gamme descend. Ne pas « corriger » cette répétition en rotation de la gamme :
 * elle mettrait le rose contre le nœud final, à l'autre bout du fil, où il n'a
 * rien à dire.
 *
 * ⚠️ Les notes portaient chacune un ruban de masking tape teinté. Les quatre
 * ont été retirés le 2026-08-06 (dernier ruban EN SÉRIE du storefront), et le
 * motif a été retiré de toute l'app le 2026-08-08 (composant supprimé). Ne pas
 * les remettre.
 */
const STEP_ACCENTS: Record<AtelierStepId, string> = {
	idea: "rose",
	materials: "lavender",
	assembly: "mint",
	finishing: "sun",
};

/** Diamètre rendu de la perle, en px — et la boîte dans laquelle la pièce est posée. */
const BEAD_PX = 52;

/** Un morceau de la pièce, posé en absolu dans la boîte de `BEAD_PX`. */
interface PiecePart {
	path: HandDrawnPathConfig;
	/** Largeur RENDUE, en px. L'encre reste à 2 px : `AtelierThreadStroke` reconvertit. */
	width: number;
	/** Coin haut-gauche dans la boîte de la perle. */
	left: number;
	top: number;
}

/**
 * LA PIÈCE à chaque étape — direction « La pièce en cours » (audit 13/20 du
 * 2026-08-06).
 *
 * ⚠️ Ce qui était là avant : `STEP_VIGNETTES`, **un pictogramme par étape**
 * (étincelle = l'idée, goutte = la matière, chaleur = la cuisson, nœud-ruban =
 * la finition), posé sur une pastille ronde, plus un numéro dans un cercle.
 * C'est le patron « comment ça marche » le plus répandu du web, tracé à la
 * main : on pouvait remplacer les quatre libellés par quatre étapes
 * d'onboarding SaaS sans toucher à la composition. Et sur les huit disques que
 * comptait la section, **aucun ne représentait ce que Léane fabrique**.
 *
 * Chaque perle est désormais la pièce à SON étape : les couleurs repérées, les
 * matières choisies, le cabochon sorti du four, le cabochon monté sur sa
 * créole. Lues à la suite, elles racontent une pièce qui avance — c'est le
 * critère : copie masquée, l'ordre doit se deviner.
 *
 * Même arbitrage que le héros, qui a démoté le trio cœur·étoile·lune parce
 * qu'« une lune et deux étoiles ne disent rien que Synclune fabrique ». Une
 * étincelle et un nœud non plus.
 *
 * **Tous les tracés viennent de `CREATION_PATHS`** — la SSOT du présentoir du
 * premier écran, donc le même vocabulaire d'un bout à l'autre de la page, et
 * **zéro tracé neuf**. Keyé sur l'union `AtelierStepId` : une cinquième étape
 * sans pièce casse au typecheck, pas en silence.
 *
 * Les coordonnées sont posées à la main dans la boîte de 52 px, décentrées
 * exprès (symétrie imparfaite du lexique) ; aucune n'est dérivée d'une mesure
 * de contenu, donc rien ici ne se remesure quand la copie change.
 */
const STEP_PIECES: Record<AtelierStepId, ReadonlyArray<PiecePart>> = {
	// Une couleur croisée dans la rue : trois touches de peinture, pas encore un objet.
	idea: [
		{ path: CREATION_PATHS.dab, width: 21, left: 9, top: 16 },
		{ path: CREATION_PATHS.dab, width: 14, left: 27, top: 9 },
		{ path: CREATION_PATHS.dab, width: 8, left: 32, top: 28 },
	],
	// Les matières choisies une par une : deux grains et une goutte de verre.
	materials: [
		{ path: CREATION_PATHS.berry, width: 17, left: 8, top: 16 },
		{ path: CREATION_PATHS.berry, width: 14, left: 22, top: 12 },
		{ path: CREATION_PATHS.drop, width: 12, left: 30, top: 24 },
	],
	// La pièce sort du four : le cabochon, et le reflet qui dit qu'il est verni.
	assembly: [
		{ path: CREATION_PATHS.cabochon, width: 26, left: 11, top: 10 },
		{ path: CREATION_PATHS.glint, width: 13, left: 16, top: 16 },
	],
	// Montée : le MÊME cabochon, suspendu à sa créole. C'est le bijou.
	finishing: [
		{ path: CREATION_PATHS.hoop, width: 15, left: 18, top: 6 },
		{ path: CREATION_PATHS.cabochon, width: 19, left: 16, top: 20 },
	],
};

/**
 * L'encre du FIL — MONO, et **lisible** depuis l'audit du 2026-08-06.
 *
 * Les segments tiennent une seule encre pendant que perles et vignettes
 * descendent la gamme quadri : un fil bariolé cesserait d'être un fil.
 *
 * ⚠️ Ce n'était pas `--color-brand-rose-strong` mais `--primary`, mesuré à
 * **1,60:1 sur la page** : le mécanisme qui NOMME la section était tracé sous
 * le seuil de perception. `--primary` est un pastel de SURFACE ;
 * `--color-brand-rose-strong` est le même rose (teinte 340,78, identique) à la
 * luminosité qui porte — 4,90:1 mesuré. C'est le token prévu pour exactement
 * ça (« dès que le rose doit être VU »), pas une couleur de plus.
 *
 * Le doré reste écarté pour une raison de VOISINAGE, pas de goût : la FAQ qui
 * suit immédiatement porte `data-accent="sun"` — deux salles dorées à la file
 * n'en feraient plus qu'une.
 *
 * Explicite plutôt que `var(--section-accent)` : c'est une décision de
 * direction, pas une cascade — le fil ne doit pas suivre en silence un
 * changement d'accent de section, et surtout pas la rotation d'accents que les
 * `<li>` posent désormais autour de lui.
 */
const THREAD_INK = "var(--color-brand-rose-strong)";

/**
 * La goutte de la pampille — le tracé du PRÉSENTOIR (`CREATION_PATHS.drop`,
 * la goutte-raisin-larme du héros), pas un tracé neuf : le bijou qui termine
 * le fil est fait du même vocabulaire que ceux du premier écran.
 */
const PENDANT_DROP = CREATION_PATHS.drop;

/** Goutte rendue à 22 px (natif 40) — l'échelle de la pampille. */
const PENDANT_DROP_WIDTH = 22;

/**
 * Où pend la goutte de chaque étape, en coordonnées du tracé `pendantStrings`
 * (96×26) : `left` = le centre de son attache, `top` = le bout de l'attache
 * (−1 px de chevauchement, la goutte est ENFILÉE, pas posée dessous). Hauteurs
 * inégales voulues — un mobile, pas une guirlande alignée (le mode d'échec qui
 * a tué la guirlande du héros).
 *
 * ⚠️ Keyé sur `AtelierStepId`, comme les vignettes : c'était un tableau de
 * quatre positions indépendant d'`ATELIER_STEPS`, donc une cinquième étape
 * rendait cinq vignettes et quatre gouttes, sans un mot.
 */
const PENDANT_DROPS: Record<AtelierStepId, { left: number; top: number }> = {
	idea: { left: 12, top: 13 },
	materials: { left: 38, top: 19 },
	assembly: { left: 62, top: 10 },
	finishing: { left: 86, top: 15 },
};

/**
 * Poses statiques des notes d'étapes (mêmes arbitrages que `CARD_TILT` des
 * cartes collection : une pose n'est pas un mouvement, donc pas de
 * `motion-safe:` ; classes LITTÉRALES, jamais interpolées).
 *
 * QUATRE inclinaisons distinctes et non deux alternées : à partir de `md` les
 * quatre notes ont exactement la même hauteur (121,3 px mesurés à 1280), et
 * ±0,5° en alternance rendait quatre rectangles superposables — l'« inventaire »
 * que la colonne enfilée devait justement remplacer. La symétrie imparfaite est
 * au lexique.
 */
const NOTE_TILT = [
	"-rotate-[0.7deg]",
	"rotate-[0.5deg]",
	"-rotate-[0.4deg]",
	"rotate-[0.6deg]",
] as const;

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
 * Direction « Le fil de l'atelier » (2026-08-06) : un bijou Synclune, c'est des
 * perles enfilées une à une — la section fait pareil. Un fil dessiné à la main
 * descend le récit, chaque étape du processus est une perle posée dessus. Le
 * fil est le MÉCANISME de la section, pas un décor : c'est la seule colonne
 * vertébrale de la page, ce qui casse le « métronome » des trois ouvertures
 * identiques — le surligneur du h1 reste héros-seul, le bloc titre garde la
 * grammaire `h2` + rail.
 *
 * **Le fil est UN SEUL élément** (`AtelierThreadRail`), tuilé, qui court du bas
 * de la confidence jusque sous le nœud. Il l'était si peu auparavant que
 * l'audit au rendu réel du 2026-08-06 l'a mesuré : cinq `<svg>` logés dans les
 * gaps de 52 px, donc **44 % d'encre sur son axe à 390 px et 55 % à 1280**,
 * quatre trous de 63 à 130 px — un par note, le fil n'existant QUE dans les
 * gaps — et un ratio qui se DÉGRADAIT en rétrécissant. Le montage tuilé le rend
 * indifférent à la hauteur des notes par construction, et a fait disparaître
 * avec lui le clip `top-20`, constante mesurée sur « h3 d'une seule ligne ».
 *
 * **La géométrie qui fait foi** : gouttière de 3,5 rem (`pl-14`), axe du fil à
 * 2,75 rem (`left-11`) — 12 px À GAUCHE du bord des cartes —, perle de 52 px
 * centrée sur l'axe donc à cheval de 14 px sur la carte, colonne enfilée
 * plafonnée à 36 rem **à partir de `lg` seulement**, gap FIXE de 3,25 rem entre
 * les notes.
 *
 * **La règle de couleur, une fois pour toute la section : l'accent PEINT,
 * l'encre TRACE.** Les quatre accents valent 1,5 à 2,6:1 en trait et 7,8 à
 * 13,4:1 en aplat sous l'encre. Les pièces qui représentent un OBJET (la perle,
 * les gouttes de la pampille) sont donc REMPLIES de leur accent, chiffre et
 * gestes restent en `--foreground`. Avant cet arbitrage, la salle rendait
 * quatre filets pastel sur blanc : une polychromie nominale, que le lexique
 * appelle précisément à ne pas faire (« la sobriété doit se justifier »).
 *
 * Les pièces, dans l'ordre de lecture :
 *
 * - **Le portrait polaroid** (`AtelierPortrait`) — sticky ≥ `lg` en colonne
 *   gauche, porté par la CELLULE (`self-start`), jamais par un enfant. Deux
 *   états (photo / plaque dessinée) branchés sur la SSOT `ATELIER_IMAGE`.
 * - **« Sur la table »** (`AtelierWorktable`) — l'inventaire de l'atelier, qui
 *   remplit les deux vides mesurés de la colonne gauche ET rend enfin visibles
 *   les `supply`/`tool`/`totalTime` du nœud `HowTo`.
 * - **La confidence** — deux paragraphes sur papier `--section-wash` : le
 *   consommateur PRINCIPAL du lavis rose (la plaque du portrait en est le
 *   second). C'est sous ce papier que le fil prend sa source.
 * - **Le processus enfilé** — l'`<ol>` en colonne unique (la grille 2×2 est
 *   morte : quatre cartes en grille, c'est un inventaire ; quatre perles sur un
 *   fil, c'est un geste qui avance). Perle = **la pièce à cette étape**
 *   (`STEP_PIECES`), dessinée en encre sur l'aplat de son accent, à cheval sur
 *   la carte ; le rang est passé en coin de note (`01`–`04`) et le timbre de
 *   geste a disparu — un ornement par note au lieu de deux. Après la quatrième
 *   note, le nœud-attache et la **pampille** : quatre gouttes
 *   `CREATION_PATHS.drop`, une par étape à son encre — le bijou que le récit
 *   fabrique. Pas de CTA derrière.
 *
 * Ce qui est délibérément ABSENT : tout fetch (contenu 100 % statique — donc ni
 * `"use cache"` ni cacheTag ni Suspense), les stats live, la galerie polaroid
 * tant que les photos n'existent pas, un CTA de sortie (la FAQ qui suit porte
 * la sortie mailto), et tout JSON-LD local (le `HowTo` est un nœud du `@graph`,
 * jamais un `<script>` de section). Fil, perles, vignettes, nœud : tous
 * `aria-hidden` — l'ordre et le contenu sont portés par l'`<ol>` et ses `<li>`
 * ancrés `#atelier-step-<id>`, que les `url` des `HowToStep` référencent.
 */
export function AtelierSection() {
	return (
		<section
			id={ATELIER_SECTION_ID}
			aria-labelledby={TITLE_ID}
			// Rose signature (2026-08-06) : la salle atelier était lavande. `sun`
			// est exclu — c'est l'accent de la FAQ, section immédiatement suivante.
			data-accent="rose"
			// ⚠️ PAS de `scroll-mt` : la barre fixe est déjà compensée UNE fois par
			// `html { scroll-padding-top: var(--navbar-height) }` (`app/globals.css`).
			// Un `scroll-mt` dérivé de la même hauteur la comptait DEUX fois (mesuré :
			// 104 px de blanc sous la navbar à 1280, titre à 168 px). Le
			// `pt-12 lg:pt-16` ci-dessous EST l'air au-dessus du titre.
			// ⚠️ Les `<li>` d'étape, eux, GARDENT un `scroll-mt` — ce sont des cibles
			// d'ancre sans padding interne, cf. leur commentaire plus bas.
			className={`${CONTAINER_CLASS} pb-12 lg:pb-16`}
		>
			<div className="pt-12 lg:pt-16">
				<div className="enter-inview max-w-[46ch]">
					<h2
						id={TITLE_ID}
						className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.08] font-light tracking-[-0.015em]"
					>
						Viens voir l&apos;atelier
					</h2>

					{/* UNE touche de pinceau, en rose — l'accent de la section.
					    `inView` : sous la ligne de flottaison, le tracé se joue à
					    l'ARRIVÉE (timeline `view()`) — la grammaire de la FAQ. */}
					<div aria-hidden="true" className="mt-1.5 mb-3 flex sm:mt-2 sm:mb-5">
						<HandDrawnRail accent="bg-primary" inView />
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
						{/* De `sm` à `lg`, l'inventaire se met à DROITE du tirage : c'est
						    exactement l'emplacement des ~420×370 px de blanc mesurés à
						    768 px, le seul défaut responsive que l'audit précédent avait
						    laissé sans réponse. Ailleurs il empile sous le tirage. */}
						<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8 lg:flex-col lg:gap-8">
							<AtelierPortrait src={ATELIER_IMAGE} alt={ATELIER_IMAGE_ALT} />
							<AtelierWorktable />
						</div>
					</div>

					{/* La colonne enfilée est PLAFONNÉE — les ~6 rem restants de la
					    cellule sont la réserve nommée des polaroids futurs (« en regard
					    des notes »), un vide destiné, pas subi.
					    ⚠️ **Gaté à `lg`, et c'est le point.** La réserve n'existe QUE là où
					    la grille à deux colonnes existe. Sous `lg` la page est en une seule
					    colonne : le plafond n'y réservait rien, il retenait la colonne
					    pendant que le viewport s'élargissait — marge morte mesurée à 144 px
					    à 768, 276 à 900, **399 à 1023** (40 % de la largeur de contenu), et
					    0 au pixel suivant. Le pire cas de la page était à un pixel du
					    meilleur. */}
					<div className="lg:max-w-[36rem]">
						{/* La confidence — un papier lavé posé sur la page. Le consommateur
						    PRINCIPAL du lavis rose de la section (la plaque du portrait
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

						{/* LE FIL court sur toute cette hauteur, d'un seul trait : le
						    `pt-13` est la SOURCE (il descend du bas de la confidence, à
						    gauche du h3 — jamais à travers), puis il longe l'`<ol>` entier.
						    `-bottom-4` le fait plonger SOUS le nœud, dont l'encre commence
						    ~12 px sous le haut de son bloc (mesuré : 6,8 px de vide
						    subsistaient à `-bottom-2`) : ce cran-là dépend du TRACÉ du
						    nœud, jamais de la copie — c'est toute la différence avec le
						    clip `top-20` qu'il remplace, qui se remesurait dès que le h3
						    passait sur deux lignes. */}
						<div className="relative mt-3 pt-13">
							<AtelierThreadRail
								color={THREAD_INK}
								className="absolute top-0 -bottom-4 left-11 -translate-x-1/2"
							/>

							{/* = ATELIER_HOWTO.name, mot pour mot : c'est le `name` du nœud
							    HowTo du @graph — le balisage doit correspondre au visible.
							    Aligné sur le bord gauche des CARTES (`pl-14`), pas de la
							    gouttière. */}
							<h3 className="font-display text-foreground relative pl-14 text-xl font-normal">
								{ATELIER_HOWTO.name}
							</h3>

							{/* Le processus enfilé — colonne unique, gap FIXE de 3,25 rem. */}
							<ol className="mt-5 flex flex-col gap-y-13 pl-14">
								{ATELIER_STEPS.map((step, index) => (
									<li
										key={step.id}
										// L'ancre que pointe l'`url` du HowToStep correspondant.
										id={`atelier-step-${step.id}`}
										// La rotation d'accents — le mécanisme de polychromie du
										// dépôt, ici par ÉTAPE. Perle, timbre et goutte lisent
										// `--section-accent` par cascade ; le fil, lui, ne suit pas.
										data-accent={STEP_ACCENTS[step.id]}
										className={cn(
											// ⚠️ Ces `<li>` GARDENT un `scroll-mt`, là où la SECTION l'a perdu le
											// 2026-08-06 — et la raison est la seule qui vaille : une note n'a pas de
											// padding interne. La section peut atterrir à ras de la barre parce que son
											// `pt-12 lg:pt-16` fait l'air ; une note, elle, collerait vraiment.
											//
											// Mais 1.5rem SEULEMENT : la barre est déjà compensée UNE fois par
											// `html { scroll-padding-top: var(--navbar-height) }` (`app/globals.css`).
											// L'ancienne valeur y rajoutait une hauteur de barre ENTIÈRE — ~184 px
											// de blanc au-dessus d'une note de quelques lignes, sur des cibles
											// PUBLIÉES (les `url` des HowToStep). Ne pas re-dériver de `--navbar-height*`.
											"enter-inview bg-card shadow-paper relative scroll-mt-6 rounded-2xl border p-4 sm:p-5",
											NOTE_TILT[index % NOTE_TILT.length],
										)}
										style={noteStyle(index)}
									>
										{/* La PERLE : la PIÈCE à cette étape, posée sur l'aplat de
										    son accent, à cheval sur le bord gauche de la carte —
										    centrée sur l'axe du fil (2,75 rem). Décorative :
										    l'<ol> porte l'ordre, la copie porte le sens.
										    Géométrie : 52 px centrés sur l'axe ⇒ `-left-[2.375rem]`
										    (44 − 26 = 18 px du conteneur, soit 38 px à gauche du
										    bord des cartes), donc 14 px de débord sur la carte.
										    ⚠️ La pastille est rendue AVANT la pièce et en
										    `absolute` : remplie, elle recouvrirait le dessin.
										    ⚠️ L'aplat porte la couleur, l'encre porte la FORME —
										    un tracé à l'accent vaut 1,6:1 sur carte blanche, la
										    même forme en encre sur l'aplat vaut 7,8 à 12,7:1. */}
										<span
											aria-hidden="true"
											className="absolute top-4 -left-[2.375rem] inline-flex size-13 items-center justify-center"
										>
											<AtelierThreadStroke
												path={ACCENT_SHAPE_PATHS.circle}
												width={BEAD_PX}
												fill
												className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
											/>
											{STEP_PIECES[step.id].map((part, partIndex) => (
												<AtelierThreadStroke
													// Le tracé peut se répéter dans une même pièce (deux
													// grains, deux cabochons) : la clé porte le rang.
													key={`${part.path.viewBox}-${partIndex}`}
													path={part.path}
													width={part.width}
													color="var(--foreground)"
													className="absolute"
													style={{ left: part.left, top: part.top }}
												/>
											))}
										</span>

										{/* `pl-9` : la copie dégage les 14 px de débord de la perle. */}
										<div className="min-w-0 pl-9">
											{/* Le rang, en coin de note — il a quitté la perle, qui
											    porte désormais la pièce. `aria-hidden` : l'<ol>
											    annonce déjà « 1 sur 4 », l'entendre deux fois n'aide
											    personne.
											    ⚠️ Ce qui a disparu ici, c'est le TIMBRE de geste (un
											    pictogramme par étape sur une seconde pastille) : deux
											    ornements par note pour une seule information. */}
											<p
												aria-hidden="true"
												className="font-display text-muted-foreground mb-1 text-[0.8125rem] leading-none tracking-wide"
											>
												{String(index + 1).padStart(2, "0")}
											</p>
											<p className="text-foreground font-medium">{step.title}</p>
											<p className="text-muted-foreground mt-0.5 text-[0.9375rem] leading-relaxed">
												{step.description}
											</p>
										</div>
									</li>
								))}
							</ol>
						</div>

						{/* Le NŒUD est l'ATTACHE : le récit de fabrication se termine par la
						    chose fabriquée — sous le nœud, une pampille de quatre gouttes,
						    une par étape, à son encre. C'est le SEUL endroit de la section
						    où la gamme entière se réunit : le processus, devenu bijou.
						    Toujours pas de CTA derrière (l'atelier ne vend pas).
						    - les 4 attaches = UN tracé multi-sous-paths (un geste, comme
						      l'étincelle), à l'encre du fil ;
						    - les gouttes sont REMPLIES de leur accent (audit 2026-08-06) :
						      en filet, le bijou que le récit fabrique était rendu à
						      1,5–2,6:1, quatre contours pâles au moment du payoff. */}
						{/* ⚠️ Le bloc porte les MÊMES replis que son contenu. Sans ça, en
						    contraste renforcé et en couleurs forcées — où les 27 tracés de
						    la section s'effacent, c'est voulu — il restait ici 96 px de vide
						    parfaitement réservé sous la dernière note (mesuré : hauteur de
						    section inchangée à 1 361 px). L'ornement s'efface, sa boîte
						    aussi. */}
						<div
							aria-hidden="true"
							className="relative h-24 contrast-more:hidden forced-colors:hidden"
						>
							<span className="absolute top-2 left-11 -translate-x-1/2">
								<AtelierThreadStroke
									path={ATELIER_THREAD_PATHS.knot}
									width={44}
									color={THREAD_INK}
								/>
							</span>
							{/* `top-9` et non `top-13` : la pampille pendait 14,9 px SOUS le
							    bout du nœud (mesuré) — le seul trou qui subsistait sur tout
							    l'axe une fois le rail posé, et il tombait pile à l'attache. */}
							<span className="absolute top-9 left-11 w-24 -translate-x-1/2">
								<AtelierThreadStroke
									path={ATELIER_THREAD_PATHS.pendantStrings}
									width={96}
									color={THREAD_INK}
								/>
								{ATELIER_STEPS.map((step) => {
									const drop = PENDANT_DROPS[step.id];
									return (
										<span
											key={step.id}
											data-accent={STEP_ACCENTS[step.id]}
											className="absolute"
											style={{ left: drop.left - PENDANT_DROP_WIDTH / 2, top: drop.top }}
										>
											<AtelierThreadStroke path={PENDANT_DROP} width={PENDANT_DROP_WIDTH} fill />
										</span>
									);
								})}
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
