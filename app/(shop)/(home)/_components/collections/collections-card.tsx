import Image from "next/image";
import Link from "next/link";
import { FlowerIcon } from "@phosphor-icons/react/ssr";

import { COLLECTION_TEXTS } from "@/modules/collections/constants/collection-texts.constants";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { extractCollectionImages } from "@/modules/collections/utils/collection-images.utils";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { dataAccentForSlug } from "@/modules/products/components/catalog-accents.constants";
import { CARD_SURFACE_FOCUS, CARD_SURFACE_HOVER } from "@/shared/components/card-surface.constants";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

/**
 * Nombre de tirages empilés — 3, la silhouette « pile décalée » (§ 5 de la
 * doctrine, arbitrée le 2026-08-06).
 *
 * ⚠️ Pas `COLLECTION_CHAPTER_PRINT_COUNT` : la constante du carnet vaut la même
 * chose aujourd'hui, mais elle est couplée au `take` du select
 * (`COLLECTION_CHAPTER_PRINT_COUNT + 1`) — la faire varier changerait le nombre
 * de produits chargés. Ici on ne fait que CONSOMMER ce qui est déjà payé. Le
 * plafond dur reste 4 (le `take`, partagé avec le bento du méga-menu) ; le
 * plancher doctrinal est 2.
 */
export const LANDING_PRINT_COUNT = 3;

/**
 * Cadre papier d'un tirage — même langage que le carnet des séries
 * (`CHAPTER_PRINT_FRAME_CLASSES`), à une densité de carte.
 *
 * La carte ET son squelette consomment cette constante, comme les quatre autres
 * de ce bloc : deux littéraux séparés avaient déjà divergé sur le carnet, et
 * c'est précisément ce que la doctrine appelle « le squelette CONSOMME la
 * géométrie, il ne la recopie pas ». Les deux composants vivant dans ce fichier,
 * l'`export` n'est PAS ce qui fait tenir le contrat — c'est le partage de la
 * constante. Celle-ci n'est exportée que parce que le test de parité s'en sert
 * pour retrouver les cadres rendus.
 *
 * **Le papier est TEINTÉ, pas blanc** (audit du 2026-08-06). C'est ici que la
 * carte porte sa polychromie : `--section-wash` (10 % d'accent dans `--card`)
 * est défini au niveau `[data-accent]` NU dans `app/styles/section-accents.css`,
 * donc il se résout sur la carte elle-même — vérifié au calculé sur les quatre
 * cartes. Avant ça, l'accent ne touchait QUE le squiggle : 2,5px de trait à
 * **1,58:1** sur blanc, soit ~0,45 % de la surface de la carte, et dont la
 * longueur suivait celle du nom (86,5px pour « Nouveautés », **38,5px** pour
 * « Fêtes », puisque le trait fait `w-full` d'un lien `w-fit`). Le § 6 de la
 * doctrine appelle la rotation d'accents « le seul levier de polychromie
 * tokenisé du dépôt, et une grille de collections est la surface où il se lit
 * le mieux » : mesurée, c'était la surface où il se lisait le MOINS, et
 * `CLAUDE.md` nomme ce résultat — « une surface qui raconte Synclune en gris
 * avec un filet de rose a manqué le brief ». Même correctif que la section
 * atelier le même jour : **peindre** l'accent au lieu de le tracer.
 *
 * ⚠️ Corollaire pour le SQUELETTE : lui n'a pas de `data-accent`, donc la var y
 * est indéfinie — le `background-color` est invalide, donc transparent
 * (« dégradation propre » documentée dans `section-accents.css`), et le cadre
 * laisse voir le `bg-card` de l'enveloppe. C'est exactement le blanc qu'il
 * rendait avant, donc il n'y a rien à ré-imposer — et un `bg-card` d'override
 * serait de toute façon retiré par le tailwind-merge de `cn()`, qui traite les
 * deux comme un même conflit de `background-color` : le cadre sortirait alors du
 * filtre de `printFrames()` et casserait le test de parité squelette ↔ carte.
 */
export const LANDING_PRINT_FRAME_CLASSES =
	"relative flex-none rounded-sm bg-(--section-wash) p-1 pb-2 shadow-paper sm:p-1.5 sm:pb-3";

/**
 * Fenêtre photo d'un tirage — largeurs FIXES par palier, jamais fluides.
 *
 * Le pas n'est pas monotone (56 → 88 → 72) et c'est la grille qui le veut : la
 * carte est PLUS LARGE à `sm` (2 colonnes, 284px à 640) qu'à `lg` (4 colonnes,
 * 222px à 1024). Dimensionner « de plus en plus grand » ferait déborder le
 * palier `lg`.
 *
 * ⚠️ **Le palier de base a été RELEVÉ de 44 à 56px le 2026-08-06**, en même
 * temps que le passage à DEUX tirages sous `sm` (cf.
 * `LANDING_PRINT_COMPACT_HIDDEN`) qui a libéré la place. Motif mesuré : le § 5
 * de la doctrine a disqualifié la silhouette S3 en écrivant qu'à « 55px de
 * côté… un bijou n'est plus une pièce mais une pastille de couleur » — et la
 * pile livrée rendait **44px** sous `sm`, donc SOUS le seuil qui a tué la
 * silhouette concurrente, précisément sur le viewport dominant. 56px est le
 * plus grand palier qui garde une marge à deux chiffres à 320px ; 60px est le
 * plafond absolu (6px de marge), 64px déborde.
 *
 * Empreinte de la pile, MESURÉE au navigateur le 2026-08-06 (jamais déduite),
 * rotations comprises — à comparer à la largeur utile de la carte, c'est-à-dire
 * sa largeur moins le `p-2`/`p-2.5` de l'enveloppe. La pile étant fer à gauche
 * (cf. `LANDING_PRINT_STRIP_CLASSES`), toute la marge est du côté DROIT :
 *
 * | palier      | tirages | tirage | cadre  | pile mesurée | utile | marge dr. |
 * | ----------- | ------- | ------ | ------ | ------------ | ----- | --------- |
 * | 320 (base)  | 2       | 56px   | 64px   | 106,9px      | 120px | 12,8px    |
 * | 390 (base)  | 2       | 56px   | 64px   | 106,9px      | 155px | 47,8px    |
 * | 640 (sm)    | 3       | 88px   | 100px  | 240,1px      | 264px | 24,6px    |
 * | 1024 (lg)   | 3       | 72px   | 84px   | 191,5px      | 202px | 10,8px    |
 * | 1152+ (lg)  | 3       | 72px   | 84px   | 191,5px      | 234px | 42,8px    |
 *
 * ⚠️ **La rotation ajoute 3 à 4px de largeur que l'arithmétique ne donne pas**
 * (`n × cadre − (n−1) × chevauchement` rend 104, 236 et 188 ; la mesure 106,9,
 * 240,1 et 191,5). Elle fait aussi déborder le premier cadre d'environ 1px À
 * GAUCHE du bord de padding — sans conséquence, il reste ~9px avant le bord de
 * la carte. Un calibrage antérieur laissait 2px de marge à 320 et 3px à 1024 :
 * juste, mais à un pixel de cadre du débordement. Les deux paliers tendus sont
 * les cas de bord de la grille — 320 est le plancher WCAG 1.4.10, 1024 le
 * passage à 4 colonnes, où la carte est plus ÉTROITE qu'à `sm`. Re-mesurer
 * après toute retouche, et au NAVIGATEUR : c'est en rendant les quatre
 * silhouettes qu'on a découvert que l'arithmétique oubliait la rotation.
 */
const LANDING_PRINT_MEDIA_CLASSES =
	"relative size-14 overflow-hidden rounded-[3px] sm:size-22 lg:size-18";

/**
 * Le TROISIÈME tirage seulement — masqué sous `sm`, où la carte n'a que 120 à
 * 155px utiles. Deux tirages y valent mieux que trois : le plancher doctrinal
 * est 2 (§ 3, « au moins deux visuels, jamais un seul »), et le cadre libéré
 * finance les 56px de `LANDING_PRINT_MEDIA_CLASSES`.
 *
 * CSS et non JS : un Server Component ne connaît pas le viewport, et un seuil en
 * px dans un `matchMedia()` est interdit ici (SSOT `shared/constants/breakpoints.ts`).
 * Effet de bord favorable : un `<Image loading="lazy">` en `display:none`
 * n'intersecte jamais, donc la 3ᵉ photo n'est PAS téléchargée en mobile.
 *
 * Le squelette applique la même classe au même index — sinon il réserverait
 * trois cadres pour deux rendus.
 */
const LANDING_PRINT_COMPACT_HIDDEN = "max-sm:hidden";

/**
 * Chevauchement des tirages — calibré sur les deux paliers tendus, cf. le
 * tableau ci-dessus. Plus serré que le carnet des séries (`-ml-6` sur des cadres
 * de 108 à 204px) parce que la carte a dix fois moins de place : c'est le coût
 * assumé de la pile à l'échelle d'une vignette, et le seul endroit où cette
 * silhouette se paie.
 */
const LANDING_PRINT_OVERLAP_CLASSES = "-ml-6 sm:-ml-8";

/**
 * Bande de tirages — partagée par les deux branches (avec et sans photo) ET le
 * squelette.
 *
 * `justify-start`, et pas `justify-center` : toute la légende est fer à gauche,
 * une pile centrée ne partage donc son bord avec RIEN. Pire, le décalage qu'elle
 * produisait n'était pas constant — mesuré 6 / 23,5 / 14 / **46** / 7 / 23px
 * selon le palier, parce qu'il vaut la moitié de l'air résiduel de la carte : à
 * 768px la pile flottait 46px à droite du titre. Alignée à gauche, elle partage
 * son bord avec l'eyebrow, le nom et le prix partout, et une pile qui s'échappe
 * vers la droite se lit mieux comme une pile.
 */
const LANDING_PRINT_STRIP_CLASSES = "flex items-end justify-start";

/**
 * Rotations de repos — mêmes valeurs que le carnet des séries : c'est la MÊME
 * silhouette, à deux échelles. Le tirage du milieu passe au-dessus (`z-[2]`),
 * sous le stretched link (`::after` z-10) qui reste la seule cible de clic.
 *
 * ⚠️ **Jamais derrière `motion-safe:`** — une POSE n'est pas un mouvement,
 * c'est déjà la règle écrite sur `CARD_TILT`. Elles l'ont été jusqu'à l'audit
 * du 2026-08-06, et le défaut ne se voyait qu'au rendu : sous
 * `prefers-reduced-motion: reduce`, `getComputedStyle(cadre).rotate` valait
 * `none` sur les trois, donc la pile rendait plate et régulière — soit la
 * silhouette **S3 « la bande filante »**, celle que le § 5 de la doctrine a
 * REJETÉE, et dont le risque déclaré (« la tiédeur ») est le mode d'échec que
 * `CLAUDE.md` interdit nommément. Seul le REDRESSEMENT est un geste, et lui
 * seul se gate (cf. le bloc de transition du composant).
 */
const LANDING_PRINT_ROTATIONS = ["-rotate-3", "rotate-2 z-[2]", "-rotate-[1.5deg]"] as const;

/** Largeurs servies — miroir exact de `LANDING_PRINT_MEDIA_CLASSES`, en px fixes. */
const LANDING_PRINT_SIZES = "(max-width: 639px) 56px, (max-width: 1023px) 88px, 72px";

/**
 * Enveloppe de la carte — PLUS `CARD_SURFACE_POLAROID` (arbitrage du
 * 2026-08-06).
 *
 * Le cadre blanc et l'inclinaison sont descendus d'un cran : ce sont les
 * TIRAGES qui les portent maintenant. Les empiler aurait donné du papier sur du
 * papier, et surtout gardé à la carte la silhouette dont la doctrine veut la
 * séparer. Même raison pour l'absence de `CARD_TILT` ici : la symétrie
 * imparfaite est dans la pile, pas dans la carte — deux rotations superposées
 * se contrarient.
 *
 * La liste de transition ne nomme que `translate` : c'est la seule propriété
 * autonome animée sur cette enveloppe (le `rotate` vit sur les tirages, avec sa
 * propre transition). Nommer `transform` ne ferait rien du tout en Tailwind v4.
 *
 * `h-full` : la grille ne pose plus `items-start`, donc le `<li>` s'étire à la
 * hauteur de la rangée et la carte le remplit. Sans ça, un nom qui passe à deux
 * lignes rendait sa carte plus haute que ses voisines — mesuré 232px contre
 * 204px à 1280, avec les lignes « À partir de… » à 28px d'écart dans une même
 * rangée. `Collection.name` est un `VarChar(100)` : le cas n'est pas théorique.
 * Rien ne change quand tous les noms tiennent sur une ligne (le cas dominant).
 */
const CARD_SHELL_CLASSES = [
	"bg-card group relative flex h-full touch-manipulation flex-col",
	"rounded-md border-2 border-transparent shadow-sm",
	"p-2 sm:p-2.5",
	"transition-[translate,border-color,box-shadow] duration-300 ease-out",
	"motion-reduce:transition-colors",
].join(" ");

interface CollectionsCardProps {
	collection: GetCollectionsReturn["collections"][number];
	/**
	 * Plancher de prix, calculé sur TOUS les produits publiés — cf.
	 * `data/get-collection-price-ranges.ts`. Ne jamais le dériver du payload de
	 * la liste, qui ne porte que 4 produits. `min` SEUL, comme sur le chapitre :
	 * la carte n'affiche qu'un « À partir de », et la landing n'émet aucun
	 * JSON-LD (l'`ItemList` de `/` appartient à l'étal) — pas d'`AggregateOffer`
	 * à nourrir d'un `max`.
	 */
	priceRange?: { min: number };
}

/**
 * Carte collection de la section « Choisis ton univers » (landing).
 *
 * Doctrine de la carte collection : elle doit montrer un ENSEMBLE, pas un objet.
 *   Cette carte rendait UN visuel carré dans l'enveloppe polaroid, ce que le
 *   § 3 (« au moins deux visuels ») et le § 5 (« ne pas reprendre la géométrie
 *   de la carte produit ») interdisaient tous les deux. Le désaccord entre la
 *   doctrine et la décision de section du 2026-08-05 — qui avait acté ce média
 *   carré unique AVANT elle — a été **tranché le 2026-08-06 en faveur de la
 *   doctrine**, après avoir rendu les quatre silhouettes candidates de son § 5.
 *   Motif : hors ratio et squiggle, la carte était une carte produit — même
 *   enveloppe, même inclinaison, mêmes gouttières au pixel, même titre — et une
 *   différence de ratio 4/5 contre 1/1 ne se perçoit pas au défilement, sous la
 *   grille de cinq `ProductCard` du hero qui la précède immédiatement.
 *
 * @description
 * Silhouette **S2 « la pile décalée »** : trois tirages papier chevauchés et de
 * guingois, qui se redressent au survol et au focus. C'est la MÊME silhouette
 * que le carnet des séries de `/collections`, à l'échelle d'une carte — et
 * c'est voulu : la surface qui oriente et la surface qui raconte parlent la
 * même langue, à deux distances de lecture. Elle a été retenue contre trois
 * autres parce qu'elle est la seule à ne partager aucune forme avec le décor du
 * premier écran (le présentoir mobilise déjà la grappe, la goutte et le
 * cabochon) : le vocabulaire de la carte est le papier photo, pas le bijou.
 *
 * La pluralité n'est pas décorative, elle est la thèse : une carte produit
 * montre UN objet, une carte collection doit montrer un ENSEMBLE. Rien n'a été
 * ajouté côté données — `extractCollectionImages` rendait déjà jusqu'à quatre
 * visuels, on n'en lisait qu'un.
 *
 * L'ENCRE reste celle du carnet des séries (harmonisation 2026-08-05) : la
 * carte porte `data-accent={dataAccentForSlug(slug)}` — le même hash que la
 * bande de `/collections` et le rail de la page fille, donc le clic ne change
 * pas de couleur en route. Cette teinte PEINT le papier des tirages
 * (`--section-wash`, cf. `LANDING_PRINT_FRAME_CLASSES`) et trace le squiggle ;
 * elle ne touche jamais le texte (contrat des accents : aucun des quatre ne
 * dépasse 2,63:1 sur `--background`) et ne remplit pas la carte — la salle
 * colorée (`--section-band`) est le langage bande, pas carte. Le ruban a été
 * retiré le 2026-08-05 (densité rose en série sur la grille) et ne revient pas.
 * S'y ajoutent les DEUX nombres qui distinguent une carte collection d'une
 * carte produit — le compteur en eyebrow (« N créations ») et le from-price
 * (« À partir de X € »).
 *
 * ⚠️ `accentForSlug` est un hash modulo 4 SANS anti-collision : sur les quatre
 * cartes de la landing, la probabilité que les quatre accents soient distincts
 * est de 4!/4⁴ ≈ **9 %**. La grille rend donc le plus souvent un doublon — au
 * 2026-08-06, sur les données réelles, `sun · sun · mint · lavender`. C'est
 * ASSUMÉ : dé-dupliquer au niveau de la grille romprait la parité carte ↔ page
 * fille, l'invariant que le § 6 de la doctrine protège (« la carte promet rose,
 * la page fille répond menthe », bug du 2026-08-05). La réponse est la DOSE —
 * trois teintes réellement visibles valent mieux que quatre teintes invisibles.
 *
 * Stretched link (parité ProductCard/CollectionChapter) : le `<Link>`
 * n'entoure que le titre — la boîte de focus reste à la mesure du texte — et
 * son `::after` z-10 couvre la carte entière, tirages compris. `SquiggleUnderline`
 * se dessine sur `group-hover` ET `group-focus-within` (WCAG 2.4.7, verrouillé
 * par `hover-focus-parity.regression.test.ts`), comme le redressement des
 * tirages.
 *
 * Les photos sont DÉCORATIVES (`alt=""`) : la carte s'annonce par son
 * `aria-labelledby`. Un `alt` par tirage produirait trois descriptions de
 * bijoux avant d'atteindre le nom de la collection. Le premier tirage est le
 * produit VITRINE (`ProductCollection.isFeatured`, déjà dans l'`orderBy` du
 * select SSOT `GET_COLLECTIONS_SELECT`) — le seul levier éditorial dont la
 * carte dispose, et il est enfin visible.
 */
export function CollectionsCard({ collection, priceRange }: CollectionsCardProps) {
	const prints = extractCollectionImages(collection.products).slice(0, LANDING_PRINT_COUNT);
	const count = collection._count.products;
	const titleId = `landing-collection-${collection.slug}`;

	return (
		<article
			aria-labelledby={titleId}
			data-accent={dataAccentForSlug(collection.slug)}
			className={cn(
				CARD_SHELL_CLASSES,
				CARD_SURFACE_HOVER,
				CARD_SURFACE_FOCUS,
				"motion-safe:can-hover:hover:-translate-y-1",
			)}
		>
			{prints.length > 0 ? (
				<div className={LANDING_PRINT_STRIP_CLASSES}>
					{prints.map((image, printIndex) => (
						<div
							// Par INDEX, pas par URL : la même photo peut servir deux produits
							// d'une même série (`extractCollectionImages` déduplique par
							// PRODUIT, pas par URL) — et la liste est statique, jamais réordonnée.
							key={printIndex}
							className={cn(
								LANDING_PRINT_FRAME_CLASSES,
								LANDING_PRINT_ROTATIONS[printIndex],
								printIndex > 0 && LANDING_PRINT_OVERLAP_CLASSES,
								printIndex === 2 && LANDING_PRINT_COMPACT_HIDDEN,
								// Redressement : hover gaté can-hover (sticky-hover iOS), focus
								// JAMAIS derrière can-hover (clavier sur tactile). L'ombre garde
								// sa transition sous reduced-motion — une ombre qui s'estompe
								// n'est pas un déplacement (WCAG 2.3.3) ; seul le mouvement est
								// gaté, sinon l'ombre SAUTAIT. `rotate` et non `transform` : TW v4
								// compile `rotate-0` vers la propriété autonome `rotate`, que
								// `transition: transform` n'anime pas.
								//
								// ⚠️ Le redressement est gaté `motion-safe:` sur les DEUX branches,
								// hover comme focus — depuis que la pose de repos, elle, ne l'est
								// plus (cf. `LANDING_PRINT_ROTATIONS`). Sans ça, un focus clavier
								// sous reduced-motion mettrait la pile à plat d'un seul coup, sans
								// transition : un saut, donc précisément ce que la préférence
								// demande d'éviter. Gater un MOUVEMENT sur `motion-safe:` est
								// permis ; c'est `can-hover:` devant un focus qui ne l'est pas.
								"transition-[box-shadow] duration-300 ease-out motion-safe:transition-[rotate,box-shadow]",
								"motion-safe:can-hover:group-hover:rotate-0 motion-safe:group-focus-within:rotate-0",
								"can-hover:group-hover:shadow-md group-focus-within:shadow-md",
							)}
						>
							<div className={LANDING_PRINT_MEDIA_CLASSES}>
								<Image
									src={image.url}
									alt=""
									fill
									sizes={LANDING_PRINT_SIZES}
									className="object-cover"
									// Section sous la ligne de flottaison : `lazy` (défaut), aucun
									// `preload` — le chemin critique appartient au hero.
									quality={IMAGE_QUALITY.THUMBNAIL}
									placeholder={image.blurDataUrl ? "blur" : "empty"}
									blurDataURL={image.blurDataUrl ?? undefined}
								/>
							</div>
						</div>
					))}
				</div>
			) : (
				// Collection dont aucun SKU actif ne porte de média IMAGE : une promesse
				// plutôt qu'un carré gris muet (même arbitrage que la carte du méga-menu).
				// La promesse porte déjà la couleur de la page fille — langage d'état vide
				// harmonisé avec le méga-menu (2026-08-06), délibérément PAS la note
				// manuscrite du carnet. Un seul cadre PLEINE LARGEUR, et non un tirage :
				// « Photos à venir » ne tient pas dans 56px, et une pile de cadres vides
				// mentirait sur le nombre de pièces.
				//
				// Le puits interne est en `--section-wash-strong` (18 %) depuis que le
				// CADRE est lui-même teinté à 10 % : les deux ne peuvent plus porter la
				// même valeur sans devenir un aplat uniforme. C'est le même rapport
				// cadre → fenêtre que la branche nominale, où la fenêtre est la photo.
				//
				// ⚠️ La hauteur suit celle d'un tirage, mais l'empreinte n'est PAS
				// identique : le `border-2` ajoute **4px** (mesuré à 390 comme à 1280 —
				// bordure hors flux sur un cadre sans hauteur explicite). Un commentaire
				// a affirmé l'égalité jusqu'au 2026-08-06 ; l'écart est assumé, et il est
				// désormais invisible en grille puisque les cartes d'une rangée s'étirent
				// à la même hauteur (cf. `CARD_SHELL_CLASSES`).
				<div className={LANDING_PRINT_STRIP_CLASSES}>
					<div
						className={cn(
							LANDING_PRINT_FRAME_CLASSES,
							"border-border w-full border-2 border-dashed shadow-none",
						)}
					>
						<div className="flex h-14 flex-col items-center justify-center gap-1.5 rounded-[3px] bg-(--section-wash-strong) sm:h-22 lg:h-18">
							<FlowerIcon aria-hidden="true" className="text-muted-foreground size-5 sm:size-6" />
							<span className="text-muted-foreground text-xs">Photos à venir</span>
						</div>
					</div>
				</div>
			)}

			{/* Légende — mêmes gouttières que les cartes du hero, pour que les deux
			    grilles de la page respirent pareil. `flex-1` pour que le `mt-auto` du
			    from-price ait de quoi pousser : c'est ce qui aligne les fourchettes en
			    bas de rangée quand un nom voisin passe à deux lignes. */}
			<div className="flex flex-1 flex-col gap-1.5 pt-2.5 pb-1 sm:pt-3">
				<span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
					{count > 0 ? COLLECTION_TEXTS.PRODUCT_COUNT(count) : COLLECTION_TEXTS.PRODUCT_COUNT_EMPTY}
				</span>

				<Link
					href={`/collections/${collection.slug}`}
					className="focus-ring block w-fit max-w-full after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
				>
					<span className="relative block">
						<span
							id={titleId}
							className="font-display text-foreground line-clamp-2 text-base sm:text-lg"
						>
							{collection.name}
						</span>
						{/* `w-full` : le défaut `w-20` ne couvrirait qu'une partie du nom —
						    même correctif que ProductCard et HeroAllCreationsCard. L'encre
						    suit la série : la carte porte son propre `data-accent`, donc
						    `--section-accent` se résout ici, pas sur une section ancêtre.
						    `drawn` : le trait est posé AU REPOS (audit landing 2026-08-06) —
						    la cover étant « 1ᵉʳ produit de la série », quatre séries voisines
						    peuvent rendre quatre photos très proches, et l'encre teintée
						    était le seul différenciateur… caché derrière le hover. Sur un
						    bijou (ProductCard) le squiggle reste une affordance de survol ;
						    ici c'est l'IDENTITÉ de la porte, elle ne se mérite pas. */}
						<SquiggleUnderline className="w-full" drawn stroke="var(--section-accent)" />
					</span>
				</Link>

				{/* From-price — même ligne que le chapitre. `formatEuro` NU, jamais
				    `{ compact: true }` (« 49,9 € », régression connue). Conditionnel :
				    des produits publiés sans SKU actif donnent un compteur sans
				    fourchette — même mismatch assumé que sur /collections.
				    `mt-auto` : la fourchette est le pied de la carte, elle s'aligne
				    d'une carte à l'autre même quand un nom voisin prend deux lignes. */}
				{priceRange && (
					<p className="text-foreground mt-auto text-sm font-medium tabular-nums">
						<span className="text-muted-foreground font-normal">
							{COLLECTION_TEXTS.PRICING.FROM_LABEL}{" "}
						</span>
						{formatEuro(priceRange.min)}
					</p>
				)}
			</div>
		</article>
	);
}

/**
 * Squelette de `CollectionsCard` — il CONSOMME la géométrie de la carte réelle,
 * il ne la recopie pas.
 *
 * C'est la règle que le carnet des séries a payée une fois (un squelette qui
 * réservait 112px pour ~202px de contenu, soit ~90px de saut par bande au swap
 * du `<Suspense>`) : les cinq constantes de tirage sont importées d'en haut de
 * ce fichier, pas re-déclarées. Changer une taille de tirage déplace donc les
 * deux côtés du même geste.
 *
 * Le reste suit la même méthode que `ProductCardSkeleton` : eyebrow
 * (`text-2xs` → h-3), titre sur UNE ligne réservée (`text-base` → h-6,
 * `sm:text-lg` → sm:h-7) et la ligne prix (`text-sm` × line-height 1.25rem →
 * h-5, méthode `CHAPTER_TEXT_RESERVES.price` ; le cas dominant est fourchette
 * présente).
 *
 * ⚠️ La réserve du titre couvre UNE ligne, et c'est un écart connu, pas un
 * oubli : `line-clamp-2` ne « absorbe » pas l'exception, il l'AUTORISE — un nom
 * sur deux lignes décale donc de 24 à 28px au swap du `<Suspense>`. On l'assume
 * parce que les noms de collection sont courts (le cas dominant est une ligne)
 * et surtout parce que la section est SOUS la ligne de flottaison au
 * chargement : seuls les éléments visibles qui se déplacent comptent au CLS.
 * Réserver deux lignes coûterait 24 à 28px de vide sur toutes les cartes du cas
 * dominant. L'alignement en rangée, lui, est réglé côté carte (`h-full` +
 * `mt-auto`), pas ici.
 *
 * Plus de paramètre `index` : il ne servait qu'à alterner le tilt de
 * l'enveloppe, que la pile a rendu inutile. Les rotations des tirages sont
 * fixes et identiques d'une carte à l'autre — l'irrégularité vient de la pile
 * elle-même, pas de la position dans la grille.
 */
export function CollectionsCardSkeleton() {
	return (
		<div aria-hidden="true" className={CARD_SHELL_CLASSES}>
			<div className={LANDING_PRINT_STRIP_CLASSES}>
				{Array.from({ length: LANDING_PRINT_COUNT }, (_, printIndex) => (
					<div
						key={printIndex}
						className={cn(
							// Le squelette n'a pas de `data-accent`, donc `--section-wash` y est
							// indéfini : le `background-color` est invalide, donc TRANSPARENT
							// (« dégradation propre » de `section-accents.css`) — et le cadre
							// laisse voir le `bg-card` de l'enveloppe, soit exactement le blanc
							// qu'il avait avant que le papier soit teinté. Rien à ré-imposer :
							// un `bg-card` d'override serait de toute façon retiré du rendu par
							// le tailwind-merge de `cn()`, qui verrait les deux comme un même
							// conflit de `background-color`.
							LANDING_PRINT_FRAME_CLASSES,
							LANDING_PRINT_ROTATIONS[printIndex],
							printIndex > 0 && LANDING_PRINT_OVERLAP_CLASSES,
							printIndex === 2 && LANDING_PRINT_COMPACT_HIDDEN,
						)}
					>
						<div
							className={cn(LANDING_PRINT_MEDIA_CLASSES, "bg-muted motion-safe:animate-pulse")}
						/>
					</div>
				))}
			</div>
			<div className="flex flex-1 flex-col gap-1.5 pt-2.5 pb-1 sm:pt-3">
				<div className="bg-muted h-3 w-20 rounded motion-safe:animate-pulse" />
				<div className="bg-muted h-6 w-28 rounded motion-safe:animate-pulse sm:h-7" />
				<div className="bg-muted mt-auto h-5 w-24 rounded motion-safe:animate-pulse" />
			</div>
		</div>
	);
}
