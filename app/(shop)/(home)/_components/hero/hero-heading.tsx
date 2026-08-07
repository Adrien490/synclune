import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import { BRAND } from "@/shared/constants/brand";

import { BrushHighlight } from "./brush-highlight";
import { HeroCta } from "./hero-cta";

/**
 * Sur-titre de la page d'accueil — et le SEUL du storefront depuis le
 * 2026-08-06.
 *
 * Il disait « L'atelier de Léane · {ville} », et c'était aussi le défaut de
 * `StorefrontHeading` : cinq pages boutique le rendaient entre un fil d'Ariane
 * qui situait déjà la page et un chapô qui redisait « dans mon atelier à
 * {ville} ». Le sur-titre a donc été retiré LÀ-BAS (cf. la note en tête de
 * `shared/components/storefront-heading.tsx`) et REFORMULÉ ici en accueil :
 * la home n'a pas de fil d'Ariane, ce `<p>` est la première ligne de la page.
 *
 * ⚠️ Il ne vit plus dans le module partagé et n'a plus à y revenir : un seul
 * consommateur, donc pas de SSOT à tenir — c'est la duplication ENTRE deux
 * consommateurs qui l'y avait fait monter (audit 79/100 du 2026-08-05).
 *
 * ## Pourquoi il dit le LIEU, et rien d'autre (2026-08-06)
 *
 * Il a dit « Bienvenue sur Synclune ! » pendant une journée. Deux défauts : il se
 * rendait à 60 px sous un wordmark qui dit déjà « Synclune », pour 49 px de
 * premier écran et zéro information ; et « bienvenue sur X » est exactement le
 * registre interchangeable que `CLAUDE.md` proscrit — n'importe quelle boutique
 * peut le signer.
 *
 * Le lieu est la SEULE chose que le premier écran mobile ne dise nulle part
 * ailleurs : le `h1` porte la couleur, le chapô porte le fait-main ET l'unicité.
 * Un sur-titre plus long (« · pièces uniques », « bijoux faits main à… ») ferait
 * écho à l'un des deux et re-créerait la redondance qu'on vient d'enlever — la
 * brièveté est le réglage, pas un manque d'ambition.
 *
 * La ville reste DÉRIVÉE de `BRAND` : « Atelier à {ville} » plutôt que le gentilé
 * « Atelier nantais », qui aurait écrit Nantes en dur à côté de la SSOT.
 *
 * ⚠️ Il ne se change pas SEUL : le chapô a perdu son complément
 * `hidden sm:inline` « , dans mon atelier à {ville} » le même jour, sinon le lieu
 * se dit deux fois à `sm+`. Les deux vont ensemble.
 */
export const HOME_EYEBROW = `Atelier à ${BRAND.contact.location.city}`;

/** Classes du `<p>` de sur-titre — locales, pour la même raison que la chaîne. */
const HOME_EYEBROW_CLASS = "text-muted-foreground text-[0.8125rem] tracking-[0.09em] uppercase";

/**
 * Bloc titre de l'étal — la PREMIÈRE CELLULE de la grille des créations.
 *
 * @description
 * Direction « L'étal » (artifact hero du 2026-08-04, reco C) : ce bloc est une
 * CELLULE de la grille des créations, pas une bande posée au-dessus. Il n'a donc
 * ni cadre, ni fond, ni ruban — c'est du texte posé sur le papier, à côté des
 * tirages : c'est ce qui l'empêche de ressembler à une carte de plus.
 *
 * ⚠️ Il ne partage vraiment sa rangée qu'à partir de `lg` — sous ce seuil ses
 * spans valent la largeur entière et la première création tombe à y 419 (390 px)
 * ou y 445 (768 px). Mesures et arbitrage dans le `@description` de
 * `hero-section.tsx` ; ne pas ré-écrire ici « la première chose sous la barre est
 * un bijou » sans ce qualificatif.
 *
 * Server Component, zéro JS client. Le `<h1>` est du texte rendu côté serveur
 * et ne dépend d'AUCUN `await` (cf. `HeroSection`, qui isole la grille derrière
 * un `Suspense`) : il est candidat au LCP mobile, et c'est pour lui que la
 * display (Winky Sans) est préchargée (`shared/styles/fonts.ts`).
 *
 * ⚠️ L'IDENTITÉ du porteur mobile a changé de signe : mesurée « h1 » le
 * 2026-08-05, elle a rendu « première photo » le 2026-08-06 (deux runs en dev,
 * candidats HEADER → IMG, le h1 jamais en lice — la marge était ~3 %, elle ne
 * tient pas d'un jour à l'autre). Re-mesurer EN PROD avant tout arbitrage de
 * préchargement ; le preload reste juste (la display sert toutes les routes).
 * Au-delà de `lg`, la photo porte le LCP — ça, c'est stable.
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
 * - la copie tient en UN seul paragraphe — pas en deux paragraphes concurrents
 *   (`hidden sm:block` / `sm:hidden`), qui obligeaient à corriger toute coquille
 *   deux fois. ⚠️ Elle n'a plus non plus de complément masqué À L'INTÉRIEUR du
 *   paragraphe : le dernier (« , dans mon atelier à {ville} ») est parti le
 *   2026-08-06 quand le sur-titre a repris le lieu. La copie est donc désormais
 *   IDENTIQUE à toutes les largeurs — cf. le § du chapô plus bas avant d'y
 *   remettre une branche responsive.
 *
 * ⚠️ Copie au TUTOIEMENT et à la première personne. Elle est RÉÉCRITE, pas
 * recopiée de `docs/atelier-story.md`, qui vouvoie (« Je vais vous faire une
 * confidence ») — la recopier réintroduirait le défaut de voix mixte corrigé
 * sur le tunnel de paiement (`checkout-voice-tutoiement.regression.test.ts`).
 */
export function HeroHeading({ id }: { id: string }) {
	return (
		// lg:pt-2 aligne optiquement le bloc sur la marge blanche des cadres
		// voisins ; le padding bas ne sert que tant que le bloc est EMPILÉ
		// au-dessus de la grille (< lg), où le gap seul serre trop.
		//
		// ⚠️ PLUS DE `relative` ICI (2026-08-07), et c'est une conséquence directe du
		// retrait du décor dessiné (cf. le § en bas de ce composant) : il ne servait
		// de repère qu'à la scène COMPACTE, seul enfant absolu du bloc, qui se posait
		// dans la marge droite libre. Un `relative` sans enfant absolu à caler
		// n'ancre rien — il ne fait qu'ouvrir la porte au prochain élément flottant.
		//
		// Le « gréement » (`lg:flex lg:h-full lg:flex-col` ici, `lg:self-stretch` sur
		// la cellule, `lg:mt-auto` sur le call site du décor) était déjà parti le
		// 2026-08-06 : mesuré, les trois ensemble ne déplaçaient plus rien.
		<div className="pb-2 sm:pb-4 lg:pt-2 lg:pb-0">
			{/* Sur-titre — le SEUL du storefront depuis le 2026-08-06 : « L'atelier de
			    Léane · Nantes » était aussi le défaut de `StorefrontHeading`, où il se
			    rendait entre un fil d'Ariane et un chapô qui le redisaient. Il a été
			    retiré des cinq pages boutique et reformulé ici en accueil ; la chaîne
			    et ses classes ont suivi le mouvement dans ce fichier (`HOME_EYEBROW`,
			    en tête) — un seul consommateur, plus de SSOT partagée à tenir. */}
			<p className={HOME_EYEBROW_CLASS}>{HOME_EYEBROW}</p>

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

			    LA SILHOUETTE EN DEUX LIGNES — césure à la virgule — est le sujet des
			    trois réglages qui suivent. L'audit du 2026-08-06 (carte des césures
			    mesurée à 11 largeurs, rendu réel) a montré qu'elle n'existait QU'À
			    390 et 1280 px — les deux largeurs des audits précédents : virgule
			    ORPHELINE en tête de ligne à 320, veuve « par un » à 480 et de 768 à
			    1023, bannière d'une seule ligne de 640 à 767.

			    1. `max-w-[20ch]` SANS préfixe (ex-`md:`) : la bannière vivait dans
			       le trou du gate — l'ancienne justification « inopérante sous md,
			       20ch > la colonne » était fausse entre 640 et 767, où la colonne
			       fait 592–719 px. En base, la borne (20ch = 456 px au corps 40) est
			       réellement inerte sous ~460 px de colonne et force la deuxième
			       ligne partout ailleurs. `lg:max-w-none` inchangé : à `lg` c'est la
			       cellule (2 colonnes) qui borne.
			    2. Le groupe insécable « colorés, » : le span racine de
			       `BrushHighlight` est `inline-block`, donc une boîte ATOMIQUE pour
			       la césure — le moteur avait le droit de couper AVANT la virgule,
			       ce qu'il ne ferait jamais dans « colorés, » en texte nu.
			    3. Le groupe insécable « faits un par un » : la promesse d'unicité ne
			       se coupe plus en veuve. Sûr à toutes les largeurs : le groupe fait
			       ~280 px au corps 40, sous la colonne de 320 px (288 px utiles).

			    Résultat re-mesuré : 2 lignes « Des bijoux colorés, ⏎ faits un par
			    un » partout de 360 à 1280 ; à 320 le titre passe à 3 lignes propres
			    (Des bijoux ⏎ colorés, ⏎ faits un par un). Verrouillé par
			    `hero-h1-silhouette.regression.test.tsx`. */}
			<h1
				id={id}
				className="font-display max-w-[20ch] text-[clamp(2.5rem,4.6vw,4rem)] leading-[1.02] font-light tracking-[-0.02em] lg:max-w-none"
			>
				Des bijoux{" "}
				<span className="whitespace-nowrap">
					<BrushHighlight>colorés</BrushHighlight>,
				</span>{" "}
				<span className="whitespace-nowrap">faits un par un</span>
			</h1>

			{/* UNE seule phrase, dont les compléments desktop sont masqués sous 40rem.
			    La version d'avant en gardait DEUX quasi identiques (`hidden sm:block`
			    / `sm:hidden`) : deux copies d'un même texte à garder en phase, et deux
			    endroits où corriger une coquille. Le choix UX — copie plus courte sur
			    mobile, où le budget vertical du bloc titre est compté — est intact ;
			    `display: none` retire les compléments de l'arbre d'accessibilité comme
			    il retirait le paragraphe entier, donc toujours pas de double lecture.

			    ⚠️ IL N'Y A PLUS DE COMPLÉMENT DE LIEU ICI, et c'est le point à ne pas
			    défaire. Ce paragraphe a porté « , dans mon atelier à {ville} » en
			    `hidden sm:inline` du 2026-08-05 au 2026-08-06. La raison a disparu avec
			    le sur-titre : tant que l'eyebrow disait « L'atelier de Léane · Nantes »,
			    le lieu ne pouvait pas être ici SANS être dit deux fois à `sm+`, donc il
			    était masqué sous `sm` — au prix d'un premier écran mobile qui ne disait
			    « Nantes » nulle part. L'eyebrow dit de nouveau le lieu, à TOUTES les
			    largeurs (`HOME_EYEBROW`, en tête) ; le garder ici le redirait.

			    Règle qui survit aux deux versions : **le lieu se dit exactement une
			    fois** dans le bloc titre. Le remettre dans le chapô exige de le retirer
			    du sur-titre, pas de « compléter ». La promesse d'UNICITÉ (« Aucune n'est
			    identique à une autre »), elle, n'a jamais été masquée : c'est le seul
			    motif d'acheter tout de suite sur une boutique de pièces uniques.

			    Le chapô est donc désormais UNE chaîne, identique à toutes les largeurs —
			    plus de branche `hidden sm:inline` à garder en phase.

			    L'échange est NEUTRE en hauteur — mesuré au rendu à 390 px : deux lignes
			    de 28,05 px avant comme après, cellule du bloc titre à 299,19 px dans les
			    deux cas. ⚠️ Ce n'était pas acquis, et la marge est mince : il reste
			    **13,1 px** entre le bas de la première carte (773,9 px) et la ligne de
			    flottaison (787 px = 844 − 57 de barre du bas), soit moins d'une DEMI-ligne
			    de chapô. La prochaine ligne de copie ajoutée ici casse la promesse de la
			    direction « L'étal » (une pièce entière visible sans scroller) — et c'est
			    `e2e/shop-mobile.spec.ts` qui le dira, pas l'œil. */}
			<p className="mt-4 max-w-[40ch] text-[1.0625rem] leading-[1.65] sm:mt-6">
				Je peins et j&apos;assemble chaque pièce à la main. Aucune n&apos;est identique à une autre.
			</p>

			{/* CTA boutique + indication vers les dernières créations (demande du
			    2026-08-06). La flèche pointe vers la grille : vers le BAS sous `lg`,
			    où les cartes suivent le bloc titre, vers la DROITE à `lg`, où elles
			    partagent sa rangée — d'où `rotate-90 lg:rotate-0`, et le `lg:ml-auto`
			    qui colle l'indication au bord de la cellule, contre les cadres.

			    REGISTRE (retouche 2026-08-06) : l'indication était de la chrome
			    utilitaire — sans grise `text-sm` + flèche Phosphor géométrique — au
			    milieu d'un bloc dessiné main (les quatre touches de pinceau, le
			    surligneur du h1). Elle passe au registre de la note manuscrite : display
			    `text-base` en encre `--foreground` (le registre exact du « Voir
			    toutes les créations » de `HeroAllCreationsCard`, l'autre sortie de
			    l'étal) + flèche `arrow` de la SSOT des tracés, en `currentColor`
			    (une annotation s'écrit de la même encre que son texte) au cran
			    `marqueur` — celui des chevrons, ses cousins de geste. Le trait se
			    dessine au montage (`inView={false}`, obligatoire above-fold), après
			    l'entrée du bloc. Bonus UX : un texte gris + flèche d'icône imitait
			    l'affordance d'un lien mort ; la note dessinée se lit comme une
			    pancarte d'étal, pas comme un bouton.

			    ⚠️ DEUX SORTIES, DEUX REGISTRES — et c'est la FACTURE qui les
			    distingue, revenue au premier plan quand le CTA a quitté le
			    « bouton peint » (2026-08-06, cf. `hero-cta.tsx` : redite du
			    `BrushHighlight` du h1, retiré sur demande). Le CTA est un BOUTON
			    primary et pressable — aplat `--primary`, libellé impératif, cible de
			    48 px. La note est ÉCRITE et ne se clique pas — de l'encre sur le
			    papier, qui désigne la grille juste à côté. Ne pas les rapprocher :
			    donner une peinture ou un aplat à la note en ferait un second bouton
			    (et un `h2` cliquable) ; repeindre le CTA au pinceau remettrait deux
			    fois le même geste de marque dans un bloc haut de ~400 px.

			    Ce qui les sépare doit rester le RÔLE, pas la taille : les deux
			    composent en `text-base` (`size="lg"` côté bouton), sinon l'action
			    principale de la page se retrouve typographiquement sous sa voisine
			    secondaire — le défaut que ce commentaire décrit deux paragraphes plus
			    haut, transposé au CTA.

			    Le `h2` est l'ancien titre sr-only qui comblait le saut h1 → h3 :
			    il devient VISIBLE ici plutôt que doublé — un `<p>` « dernières
			    créations » à côté d'un h2 masqué disant la même chose ferait lire
			    l'information deux fois aux lecteurs d'écran. Il reste APRÈS le h1
			    dans l'ordre DOM (hiérarchie comblée, pas inversée).

			    ⚠️ Ce bloc coûte ~68 px de budget vertical mobile là où il ne restait
			    que 13 px de marge sous la première carte (cf. le commentaire du chapô) :
			    la promesse « une pièce entière au-dessus de la flottaison » de
			    `e2e/shop-mobile.spec.ts` est cédée en connaissance de cause au profit
			    d'une sortie explicite vers la boutique dans le premier écran. La
			    flèche tournée déborde de ~6 px au-dessus/dessous de sa boîte sous
			    `lg` — de l'encre seule, aucun ancêtre ne clippe. */}
			<div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-6">
				<HeroCta />
				<h2 className="font-display text-foreground flex items-center gap-2 text-base lg:ml-auto">
					Mes dernières créations
					<HandDrawnAccent
						variant="arrow"
						color="currentColor"
						strokeWidth={HAND_DRAWN_STROKES.marqueur}
						width={28}
						inView={false}
						delay={0.45}
						className="rotate-90 lg:rotate-0"
					/>
				</h2>
			</div>

			{/* ⚠️ IL N'Y A PLUS DE DÉCOR DESSINÉ DANS LE BLOC TITRE (2026-08-07), et c'est
			    une décision, pas un oubli. QUATRE décors s'y sont succédé :
			    `HeroConstellation` (lune + cinq étoiles reliées par un fil),
			    `HeroMoonPhases` (la frise des quatre phases), `HeroGarland` (cœur ·
			    étoile · lune suspendus) puis « Le présentoir » (un cordon auquel
			    pendaient quatre créations réelles).

			    Les trois premiers sont tombés pour leur MOTIF : des glyphes de 26–28 px
			    sans aucun détail intérieur, qui disaient une ambiance céleste pastel au
			    lieu d'un langage de création de bijoux. Le quatrième corrigeait
			    précisément ce défaut — et c'est ce qui a rendu le vrai visible :

			    **le premier écran mettait un DESSIN de bijoux à côté de PHOTOS de
			    bijoux.** Le même sujet rendu deux fois sur le même écran, et le dessin
			    perd : une photo d'une pièce peinte à la main PROUVE le fait-main, un
			    tracé de 38 px le REVENDIQUE. Le JSDoc de la scène compacte l'écrivait
			    déjà sans en tirer la conséquence — « la promesse de la direction
			    « L'étal » est qu'on voit un vrai bijou photographié dans le premier
			    écran ; sur le plus petit écran, c'est elle qui gagne ».

			    Les mesures disaient la même chose : le décor ne se rendait PAS sous
			    640 px (`hidden … sm:block` — le premier écran mobile n'en voyait rien,
			    et le bloc titre y était coloré à 5 % hors CTA), il tombait à y 460 SOUS
			    le bouton à 1280, et sa hauteur faisait dépasser la cellule titre de la
			    rangée de cartes (505,5 px contre 473,5 à 1280 ; 516 contre 473,5 à
			    1440), soit 32 à 42,5 px de papier mort sous les deux premières cartes.

			    Le dessin n'est pas mort : `CREATION_SCENE` et `CREATION_PATHS` servent
			    `app/opengraph-image.tsx`, où la scène n'a AUCUNE photo en face et porte
			    seule la marque — c'est là qu'elle est juste. `CREATION_PATHS` alimente
			    aussi l'atelier et la FAQ, où il n'y a rien à photographier.

			    ⚠️ Critère avant d'en reposer un cinquième : **on dessine ce qu'on ne
			    peut pas photographier** — l'atelier, le geste, le meuble, un état vide.
			    Jamais ce qui est photographié 40 px plus loin. Un décor qui redessine
			    le produit rejouera ce retrait. */}

			{/* ⚠️ La signature « — Léane » a été retirée ici, et ce n'est pas un
			    oubli : le storefront ne signe plus AUCUNE page — celle du pied de
			    page, dernière survivante, est partie le 2026-08-06. Le chapô ci-dessus
			    parle déjà à la première personne (« Je peins et j'assemble ») — c'est
			    lui qui porte le « il y a quelqu'un derrière » de la direction D, la
			    cursive n'en était que le paraphe. Elle mettait la home à trois
			    « — Léane » (ici, le carton de fin de grille, le pied de page), ce qui
			    dévalue le geste au lieu de l'appuyer. */}

			{/* Le `h2` qui comblait le saut h1 → h3 en sr-only vit désormais dans le
			    bloc CTA ci-dessus, VISIBLE (« Mes dernières créations ») — même rôle
			    dans la hiérarchie, plus l'indication demandée. Ne pas en re-poser un
			    second ici. */}
		</div>
	);
}
