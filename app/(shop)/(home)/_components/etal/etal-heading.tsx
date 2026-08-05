import {
	HandDrawnRail,
	STOREFRONT_EYEBROW,
	STOREFRONT_EYEBROW_CLASS,
} from "@/shared/components/storefront-heading";
import { BRAND } from "@/shared/constants/brand";

import { BrushHighlight } from "./brush-highlight";

/**
 * Bloc titre de l'étal — la PREMIÈRE CELLULE de la grille des créations.
 *
 * @description
 * Direction « L'étal » (artifact hero du 2026-08-04, reco C) : il n'y a pas de
 * bande hero au-dessus du catalogue. Le titre est une cellule de la grille, et
 * la première chose visible sous la barre est un bijou, pas un slogan. Le bloc
 * n'a donc ni cadre, ni fond, ni ruban — c'est du texte posé sur le papier, à
 * côté des tirages : c'est ce qui l'empêche de ressembler à une carte de plus.
 *
 * Server Component, zéro JS client. Le `<h1>` est du texte rendu côté serveur
 * et ne dépend d'AUCUN `await` (cf. `EtalSection`, qui isole la grille derrière
 * un `Suspense`) : c'est lui qui porte le LCP **sur mobile** — mesuré, pas
 * supposé — et c'est pour lui que la display (Winky Sans) est préchargée
 * (`shared/styles/fonts.ts`). Au-delà de `lg` c'est la première photo qui le
 * porte ; le détail des mesures est dans le JSDoc de `EtalSection`.
 *
 * Deux greffons documentés dans l'artifact :
 * - le signe de 4 couleurs vient de la direction A (« Le nuancier »), réduit
 *   d'une réglette de pastilles à un trait — passé depuis aux « quatre
 *   touches » de pinceau (`HandDrawnRail`, artifact bloc titre du 2026-08-05),
 *   le même geste que les pages boutique ;
 *   le mot « colorés » a suivi le même chemin le 2026-08-05 (artifact « mot
 *   colorés », direction B « Le surligneur ») : la couleur est passée de
 *   l'encre — un dégradé clip-text à tokens assombris dédiés — à la surface,
 *   un trait de pinceau `BrushHighlight` DERRIÈRE une encre `--foreground` ;
 * - la copie est plus courte sous 40rem, où le budget vertical du bloc titre est
 *   compté (choix UX délibéré et documenté de l'ancienne home). Elle tient en UN
 *   seul paragraphe dont les compléments desktop sont masqués — pas en deux
 *   paragraphes concurrents, qui obligeaient à corriger toute coquille deux fois.
 *   `display: none` retire ces compléments de l'arbre d'accessibilité, donc pas
 *   de double lecture.
 *
 * ⚠️ Copie au TUTOIEMENT et à la première personne. Elle est RÉÉCRITE, pas
 * recopiée de `docs/atelier-story.md`, qui vouvoie (« Je vais vous faire une
 * confidence ») — la recopier réintroduirait le défaut de voix mixte corrigé
 * sur le tunnel de paiement (`checkout-voice-tutoiement.regression.test.ts`).
 */
export function EtalHeading({ id }: { id: string }) {
	return (
		// lg:pt-2 aligne optiquement le bloc sur la marge blanche des cadres
		// voisins ; le padding bas ne sert que tant que le bloc est EMPILÉ
		// au-dessus de la grille (< lg), où le gap seul serre trop.
		<div className="pb-2 sm:pb-4 lg:pt-2 lg:pb-0">
			{/* Sur-titre consommé depuis la SSOT partagée — la CHAÎNE et les CLASSES :
			    la même chaîne vivait ici en littéral ET comme défaut de
			    `StorefrontHeading` (cinq routes boutique), et les classes du <p> en
			    étaient restées une copie caractère pour caractère (audit 79/100 du
			    2026-08-05). Reformuler ou re-régler le sur-titre côté partagé laissait
			    donc la page d'accueil diverger en silence. */}
			<p className={STOREFRONT_EYEBROW_CLASS}>{STOREFRONT_EYEBROW}</p>

			{/* Les quatre touches de pinceau — les accents de marque en APLAT, seul
			    registre où ils tiennent le contraste (7,8–12,7:1 sous --foreground).
			    Purement décoratif : le titre porte déjà tout le sens.
			    `HandDrawnRail` est la SSOT du geste (couleurs dérivées de
			    `RAIL_ACCENTS`) : l'ancien rail dupliquait les 4 classes en littéral,
			    et la home pouvait diverger d'un changement de palette en silence.

			    Marges compensées à l'échange rail (6 px) → touches (12 px) : 6+12+12
			    = 30 px sous `sm` et 8+12+20 = 40 px au-dessus, les totaux de l'ancien
			    bloc (8+6+16 / 10+6+24) — zéro décalage vertical, et le budget du bloc
			    titre — mesuré à ≈ 290 px du bas de la barre au haut du premier cadre,
			    à 390 px de large, moins les 36 px rendus par le retrait de la
			    signature — reste garant de deux pièces ENTIÈRES au-dessus de la barre
			    du bas sur un écran de 844 px. Si la copie s'allonge, c'est elle qui
			    cède, pas le budget (verrouillé par `e2e/shop-mobile.spec.ts`). */}
			<div aria-hidden="true" className="mt-1.5 mb-3 flex sm:mt-2 sm:mb-5">
				<HandDrawnRail accent="rail" />
			</div>

			{/* MESURÉ sous Winky Sans le 2026-08-05 (Chromium, woff2 réellement émis,
			    balayage de pixels — aucune hypothèse sur QUELS glyphes se font face) :

			    - `leading-[1.02]` NE COLLE PAS. Dégagement entre la descendante du « j »
			      de *bijoux* (ligne 1) et l'ascendante du « f » de *faits* (ligne 2) :
			      **4,25 px à 390 px** de viewport (corps 40 px) et **18,25 px à 1280**
			      (corps 58,9 px, la césure tombe après *faits*). C'est PLUS que sous
			      Fraunces, qui tenait à 2,5 px — Winky Sans a des extenders modestes
			      (descendante du « j » à 8,4 px pour un corps de 40, ascendante du « f »
			      à 28,3 px). Le ratio de line-height ne décide pas ; la police décide.
			    - La correction optique `-ml-[0.055em]` de Fraunces N'A PAS de raison de
			      revenir : le bord d'encre du « D » de Winky Sans tombe à 0,28 px à
			      droite de l'origine du crayon à corps 40 (0,7 % d'em), contre 2,2 px
			      pour Fraunces. Sous le seuil de visibilité — ne pas la re-poser.

			    `md:max-w-[20ch] lg:max-w-none` borne la MESURE dans la seule
			    plage où elle dérape : entre 48rem et ~54rem, le clamp est collé
			    à son plancher de 40 px pendant que la cellule titre passe en
			    pleine largeur (3 colonnes) — le titre tenait alors sur une seule
			    ligne de 35 caractères et se lisait comme une bannière, perdant
			    la silhouette en deux lignes qu'il a à 390 comme à 1280. La borne
			    est inopérante sous `md` (20ch ≈ 400 px > la colonne) et levée à
			    `lg` pour ne pas déplacer la césure desktop. */}
			<h1
				id={id}
				className="font-display text-[clamp(2.5rem,4.6vw,4rem)] leading-[1.02] font-light tracking-[-0.02em] md:max-w-[20ch] lg:max-w-none"
			>
				Des bijoux <BrushHighlight>colorés</BrushHighlight>, faits un par un
			</h1>

			{/* UNE seule phrase, dont les compléments desktop sont masqués sous 40rem.
			    La version d'avant en gardait DEUX quasi identiques (`hidden sm:block`
			    / `sm:hidden`) : deux copies d'un même texte à garder en phase, et deux
			    endroits où corriger une coquille. Le choix UX — copie plus courte sur
			    mobile, où le budget vertical du bloc titre est compté — est intact ;
			    `display: none` retire les compléments de l'arbre d'accessibilité comme
			    il retirait le paragraphe entier, donc toujours pas de double lecture.

			    ⚠️ CE QUI EST MASQUÉ A CHANGÉ le 2026-08-05, et le sens de la coupe avec.
			    Avant, mobile lisait « … à la main, à Nantes. » et perdait « Aucune n'est
			    identique à une autre » : l'eyebrow juste au-dessus disant déjà
			    « L'atelier de Léane · Nantes », la version courte répétait le LIEU et
			    jetait l'argument d'UNICITÉ — le seul motif d'acheter tout de suite sur une
			    boutique de pièces uniques, et la seule chose que le premier écran ne dit
			    nulle part ailleurs. C'est donc le complément de lieu qui passe en
			    `hidden sm:inline`, pas la promesse.

			    L'échange est NEUTRE en hauteur — mesuré au rendu à 390 px : deux lignes
			    de 28,05 px avant comme après, cellule du bloc titre à 299,19 px dans les
			    deux cas. ⚠️ Ce n'était pas acquis, et la marge est mince : il reste
			    **13,1 px** entre le bas de la première carte (773,9 px) et la ligne de
			    flottaison (787 px = 844 − 57 de barre du bas), soit moins d'une DEMI-ligne
			    de chapô. La prochaine ligne de copie ajoutée ici casse la promesse de la
			    direction « L'étal » (une pièce entière visible sans scroller) — et c'est
			    `e2e/shop-mobile.spec.ts` qui le dira, pas l'œil. */}
			<p className="mt-4 max-w-[40ch] text-[1.0625rem] leading-[1.65] sm:mt-6">
				Je peins et j&apos;assemble chaque pièce à la main
				<span className="hidden sm:inline">, dans mon atelier à {BRAND.contact.location.city}</span>
				. Aucune n&apos;est identique à une autre.
			</p>

			{/* ⚠️ La signature « — Léane » a été retirée ici, et ce n'est pas un
			    oubli : le storefront ne signe qu'UNE fois par page, dans le pied de
			    page. Le chapô ci-dessus parle déjà à la première personne (« Je peins
			    et j'assemble ») — c'est lui qui porte le « il y a quelqu'un derrière »
			    de la direction D, la cursive n'en était que le paraphe. Elle mettait
			    la home à trois « — Léane » (ici, le carton de fin de grille, le pied
			    de page), ce qui dévalue le geste au lieu de l'appuyer. */}

			{/* Le seul titre visible de l'étal est le `h1` ; les cartes portent des
			    `h3`. Ce `h2` masqué comble le saut de niveau pour les lecteurs
			    d'écran sans ajouter un titre de section que la direction retenue
			    ne veut justement pas (les bijoux SONT l'annonce).
			    Il est en FIN de bloc titre : un `h2` avant le `h1` dans l'ordre
			    DOM serait une hiérarchie inversée, pas une hiérarchie comblée. */}
			<h2 className="sr-only">Dernières créations</h2>
		</div>
	);
}
