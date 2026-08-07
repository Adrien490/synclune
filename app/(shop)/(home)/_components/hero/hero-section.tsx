import { Suspense, type CSSProperties } from "react";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";

import { HeroGrid, HeroGridSkeleton } from "./hero-grid";
import { HeroHeading } from "./hero-heading";

const TITLE_ID = "hero-title";

const HEADING_ENTER: CSSProperties = {
	"--enter-y": "12px",
	"--enter-duration": `${Math.round(MOTION_CONFIG.duration.emphasis * 1000)}ms`,
	"--enter-ease": `cubic-bezier(${MOTION_CONFIG.easing.easeOut.join(",")})`,
} as CSSProperties;

/**
 * Le hero — premier écran de la boutique.
 *
 * ⚠️ Le dossier s'appelait `_components/etal/` et ses composants `Etal*` jusqu'au
 * 2026-08-06 : le vocabulaire « L'étal » reste celui de la DIRECTION de design,
 * partagé avec tout le storefront (« L'étal continue », « le carton d'étal »,
 * « L'étal de poche ») — seul le nommage du code a été neutralisé en `Hero*`.
 * Les citations d'artifacts ci-dessous gardent donc leur nom d'origine.
 *
 * @description
 * Direction « L'étal » (artifact hero du 2026-08-04, reco C, greffons A + D) :
 * le bloc titre est une CELLULE de la grille des créations, pas une bande posée
 * au-dessus. Sur un catalogue d'une douzaine de pièces uniques, la marque EST la
 * boutique : une bande de titre pleine hauteur y est le poste le plus cher du
 * premier écran.
 *
 * ⚠️ **La promesse ne tient qu'à partir de `lg`, et il faut le savoir avant de
 * raisonner sur ce fichier.** `col-span-2` sur une grille de 2 colonnes et
 * `col-span-3` sur une grille de 3 valent la LARGEUR ENTIÈRE : en dessous de
 * `lg`, la structure est bel et bien une bande de titre au-dessus d'une grille.
 * Mesuré au rendu réel le 2026-08-06 :
 *
 * | Largeur | Bloc titre               | 1ʳᵉ création |
 * | ------- | ------------------------ | ------------ |
 * | 390     | 358 × 315 px (plein)     | y **419**    |
 * | 768     | 720 × 309 px (plein)     | y **445**    |
 * | 1024+   | 468–532 px (½ largeur)   | y **120** ✓  |
 *
 * C'est ASSUMÉ (arbitrage utilisateur du 2026-08-06) : le compte de cellules ne
 * tombe juste aux trois largeurs qu'avec ces spans (cf. `HERO_PRODUCTS_COUNT`).
 * Ce qu'il ne faut pas faire, c'est répéter « la première chose sous la barre est
 * un bijou » sans le qualifier — l'affirmation a survécu à trois refontes en
 * étant fausse partout sauf sur les deux largeurs qu'on auditait.
 *
 * ⚠️ La SECONDE moitié de cette justification est tombée le 2026-08-07 : « un
 * titre à 2 colonnes sur 3 coûterait le décor compact à `md` » ne veut plus rien
 * dire, le décor compact n'existe plus. Un `md:col-span-2` mettrait donc une
 * carte dans la première rangée dès `md`, sans plus rien coûter au dessin —
 * c'est redevenu un arbitrage OUVERT, sur le seul compte de cellules. Il n'est
 * pas pris ici : les spans sont un choix utilisateur, pas une conséquence
 * mécanique du retrait.
 *
 * ## Ce que la structure garantit
 *
 * - **Le `<h1>` ne dépend d'aucun `await`.** Il est rendu hors de la frontière
 *   `Suspense` qui isole la grille : la lecture catalogue ne peut pas retarder
 *   l'élément qui porte le LCP **sur mobile**, et c'est pour lui que la display (Winky Sans) est
 *   préchargée (`shared/styles/fonts.ts`).
 *
 *   ⚠️ Le porteur du LCP DÉPEND DU VIEWPORT — ET DU JOUR DE LA MESURE. Le
 *   2026-08-05, le `h1` gagnait à 390 px (32 571 px² contre 28 501 pour la
 *   première photo). Le 2026-08-06, deux runs en dev ont rendu l'INVERSE :
 *   candidats HEADER → IMG, le h1 jamais en lice. La marge (~3 %) ne tient pas
 *   d'un jour à l'autre ni d'un environnement à l'autre — re-mesurer EN PROD
 *   avant tout arbitrage de préchargement. Précharger la display reste juste
 *   (elle sert toutes les routes, le h1 reste candidat) ; ce qui est faux,
 *   c'est d'affirmer une identité de porteur mobile. Au-delà de `lg`, la
 *   photo gagne — stable sur toutes les mesures.
 *
 *   Le porteur est désormais mesuré par `e2e/performance.spec.ts` (« le porteur du
 *   LCP est un candidat connu ») plutôt qu'affirmé ici.
 * - **Une seule grille.** Le `Suspense` et le fragment de `HeroGrid` ne
 *   produisent aucun nœud DOM : les cartes sont des enfants directs de la même
 *   grille que le bloc titre. C'est tout le concept — sans ça, on retombe sur
 *   une bande + une grille.
 * - **`align-items: start`, sans aucune exception.** Deux cartes d'une même
 *   rangée ne se réalignent pas sur la plus haute : un étal n'est pas justifié.
 *
 *   ⚠️ Il y avait ici un `lg:self-stretch` sur la cellule titre, pièce d'un
 *   « gréement » à trois (avec `lg:flex lg:h-full lg:flex-col` sur le wrapper de
 *   `HeroHeading` et `lg:mt-auto` sur le call site du décor) censé ancrer le
 *   décor dessiné en bas de colonne. **Les trois ont été retirés le 2026-08-06,
 *   après mesure : ensemble, ils ne déplaçaient plus rien** — 0 px sur la scène
 *   et 0 px sur la hauteur de grille, à 1024, 1280 ET 1440.
 *
 *   La question est CLOSE depuis le 2026-08-07 : le décor dessiné a quitté le
 *   bloc titre (le § en bas de `hero-heading.tsx` dit pourquoi — un dessin de
 *   bijoux à côté de photos de bijoux). Il n'y a plus rien à ancrer en bas de
 *   colonne, donc plus de gréement à réintroduire.
 *
 *   Ce que ce retrait rend, et qui était le coût du décor : la cellule titre
 *   dépassait la rangée de cartes (505,5 px contre 473,5 à 1280 ; 516 contre
 *   473,5 à 1440), donc c'est elle qui fixait la hauteur de la rangée 1 — 32 px
 *   (1280) à 42,5 px (1440) de papier nu sous les deux premières cartes. La
 *   cellule titre repasse sous la hauteur des cartes, ce sont les cartes qui
 *   fixent de nouveau la rangée, et le papier nu disparaît.
 * - **Aucune longueur dérivée de `--navbar-height`.** L'étal n'a pas de hauteur
 *   imposée, et compense la barre fixe avec `--navbar-height-static`.
 *
 *   ⚠️ La raison n'est plus celle qu'on croit, et c'est ce qui rend cet invariant
 *   fragile à relire : le MODE COMPACT DE LA NAVBAR N'EXISTE PLUS (retiré le
 *   2026-08-04, refonte « La devanture » — cf. `app/globals.css`, la note sous le
 *   palier `40rem`). `--navbar-height` ne retombe plus de 5rem à 4rem au premier
 *   pixel scrollé, donc les deux variables valent aujourd'hui exactement la même
 *   chose, et le défaut d'origine — un contenu qui remonte de 16 px dès qu'on
 *   scrolle — n'est plus atteignable par ce chemin.
 *
 *   La distinction reste, et ne doit pas être « nettoyée » : `--navbar-height` est
 *   la variable qui SUIT la barre, donc celle qui redeviendra dynamique le jour où
 *   la barre rebouge (elle l'a déjà été). S'y raccrocher, c'est reprendre le pari
 *   perdu une fois ; `--navbar-height-static` dit ce qu'on veut — la hauteur au
 *   repos. C'est cette intention que verrouille `hero-section-structure.test.tsx`,
 *   pas une valeur.
 * - **Pas de `<ul>`.** La grille mélange un bloc titre et des cartes ; en faire
 *   une liste demanderait soit un `display: contents` sur le `<ul>` (qui fait
 *   tomber la sémantique de liste sur plusieurs moteurs), soit d'annoncer le
 *   `<h1>` comme « élément 1 sur 6 ». Chaque `ProductCard` est déjà un
 *   `<article aria-labelledby>` annoncé individuellement.
 */
export function HeroSection({ productsPromise }: { productsPromise: Promise<GetProductsReturn> }) {
	// Pas de `data-accent` sur la section : il ne sert qu'à publier
	// `--section-accent` / `--section-glow` pour SectionHalo, HandDrawnAccent et
	// CursorGlow — l'étal n'en monte aucun. Un attribut d'accent sans
	// consommateur laisse croire qu'une cascade existe. À reposer le jour où
	// l'un d'eux revient.
	return (
		<section
			id="hero"
			aria-labelledby={TITLE_ID}
			className={`${CONTAINER_CLASS} pt-[calc(var(--navbar-height-static)+1.5rem)] pb-12 sm:pt-[calc(var(--navbar-height-static)+2rem)] lg:pt-[calc(var(--navbar-height-static)+2.5rem)] lg:pb-16`}
		>
			<div className="grid grid-cols-2 items-start gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
				{/* Pleine largeur sous `lg`, moitié de rangée à partir de `lg` — cf. le
				    tableau de mesures du § @description. Plus de `lg:self-stretch` : il
				    n'étirait plus rien (même §). */}
				<div className="enter-load col-span-2 md:col-span-3 lg:col-span-2" style={HEADING_ENTER}>
					<HeroHeading id={TITLE_ID} />
				</div>

				<Suspense fallback={<HeroGridSkeleton />}>
					<HeroGrid productsPromise={productsPromise} />
				</Suspense>
			</div>
		</section>
	);
}
