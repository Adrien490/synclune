import { Suspense } from "react";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { BRAND } from "@/shared/constants/brand";
import {
	StorefrontHeading,
	StorefrontHeadingSkeleton,
} from "@/shared/components/storefront-heading";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { accentForSlug } from "./catalog-accents.constants";

async function CatalogCount({
	productsPromise,
	activeProductType,
}: {
	productsPromise: Promise<GetProductsReturn>;
	activeProductType?: { label: string };
}) {
	const { totalCount } = await productsPromise;

	if (totalCount === 0) return null;

	const noun = totalCount > 1 ? "pièces" : "pièce";

	// Le rappel de CE QUI est coché n'est plus une ligne de texte : ce sont les
	// étiquettes du bandeau (`ProductFilterBadges`, visibles à tous les
	// viewports depuis le 2026-08-06) — manipulables, pas seulement lisibles.
	const suffix = activeProductType
		? `${noun} dans cette famille.`
		: `${noun} en ligne en ce moment.`;

	return (
		<>
			<span className="text-foreground font-semibold tabular-nums">{totalCount}</span> {suffix}
		</>
	);
}

export type CatalogHeadingProps = {
	/** Titre de la page — terme recherché, libellé du type, ou « Les créations ». */
	title: string;
	/** Promesse du catalogue : le compte est streamé, le `h1` ne l'attend jamais. */
	productsPromise: Promise<GetProductsReturn>;
	/** Type filtré, sur une page catégorie. */
	activeProductType?: { slug: string; label: string; description?: string | null };
	/** Terme recherché : la copie d'atelier laisse alors la place au contexte de recherche. */
	searchTerm?: string;
};

/**
 * Bloc titre du catalogue — l'EN-TÊTE DE PAGE des deux routes `/produits`.
 *
 * @description
 * Monté par `ProductCatalog` entre le fil d'Ariane et la barre d'outils, hors
 * de `CATALOG_GRID` (re-tranché le 2026-08-05 : l'ancien montage « première
 * cellule de la grille » plaçait le `h1` après la barre de tri et le `h2`
 * « Filtres » du rail, et lui faisait partager sa rangée avec une carte à
 * `lg`). Même montage que `/collections` et `/favoris` : aucun `className`,
 * l'espacement vient du `space-y-5` du conteneur.
 *
 * Le markup vit dans `StorefrontHeading` (shared) depuis l'harmonisation du
 * storefront ; ce wrapper ne porte que ce qui est propre au CATALOGUE — les
 * trois copies possibles, le compte de pièces streamé, l'accent par famille.
 *
 * ## Ce que la composition garantit
 *
 * - **Le `h1` ne dépend d'AUCUN `await`.** Seul le compte est derrière la
 *   frontière `Suspense` fournie ici : la lecture catalogue ne peut pas retarder
 *   l'élément qui porte le LCP, et c'est pour lui que la display (Winky Sans) est préchargée.
 *
 * ## Budget vertical
 *
 * ≈ 150 px à 390 px de large (≈ 175 px avant le retrait du sur-titre, qui rendait
 * sa ligne de 19,5 px et le `mt-1.5` du rail), contre ~290 px sur la page
 * d'accueil : pas de chapô sous `sm`, pas de signature, un titre de deux mots.
 * C'est ce budget qui garde
 * deux pièces ENTIÈRES au-dessus de la bottom-nav sur un écran de 844 px. Si la
 * copie s'allonge, c'est elle qui cède — pas le budget.
 *
 * ⚠️ Copie au TUTOIEMENT et à la première personne. `docs/atelier-story.md`
 * vouvoie : c'est une réserve de copie, pas un texte prêt à poser.
 */
export function CatalogHeading({
	title,
	productsPromise,
	activeProductType,
	searchTerm,
}: CatalogHeadingProps) {
	/**
	 * Touches et chapô se rendent à TOUS les viewports ≥ `sm` — la compaction
	 * desktop (`lg:hidden`) a été RETIRÉE le 2026-08-05 (décision user, audit
	 * /produits direction B) : ne pas la réintroduire.
	 *
	 * Le `h1` et le compte ne bougent jamais : le `h1` doit rester VISIBLE partout
	 * (régression `catalogue-mobile-h1`), et le compte est le seul retour parlé du
	 * rail quand on coche un critère. ⚠️ Le sur-titre « L'atelier de Léane ·
	 * {ville} », lui, a été RETIRÉ du bloc partagé le 2026-08-06 : le fil d'Ariane
	 * au-dessus situait déjà la page, et le chapô ci-dessous redit l'atelier et la
	 * ville. Il ne survit que sur la page d'accueil.
	 */
	return (
		<StorefrontHeading
			title={title}
			// Sur une page de type, le rail se réduit à un seul segment — la couleur
			// de la famille — pour que la catégorie ait une identité sans champ en base.
			accent={activeProductType ? accentForSlug(activeProductType.slug) : "rail"}
			// Trois copies possibles, une seule rendue. Le chapô est masqué sous `sm`
			// (par le `<p>` hôte, plus par un span interne — lot 0 de l'audit
			// 2026-08-05 : le span laissait la marge du paragraphe en mobile) :
			// c'est le budget vertical mobile qui le coupe, et `display: none` le
			// retire aussi de l'arbre d'accessibilité — donc pas de lecture en
			// double. La description de type (base) suit le même régime.
			description={
				searchTerm
					? "Voici ce que j'ai trouvé dans l'atelier."
					: (activeProductType?.description ??
						`Je peins et j'assemble chaque pièce à la main, dans mon atelier à ${BRAND.contact.location.city}. Aucune n'est identique à une autre.`)
			}
			// Miroir OBLIGATOIRE dans `CatalogHeadingSkeleton` (parité CLS).
			descriptionClassName="hidden sm:block"
			countSlot={
				// `as="span"` : un `<div>` ici est un descendant illégal du `<p>`, refermé
				// par le parser — erreur d'hydratation React.
				<Suspense
					fallback={<Skeleton as="span" className="inline-block h-4 w-44 rounded align-[-2px]" />}
				>
					<CatalogCount productsPromise={productsPromise} activeProductType={activeProductType} />
				</Suspense>
			}
			// Au rail desktop, cocher un critère recompose la grille SANS changer de
			// page : cette ligne est le retour parlé de l'opération (« 9 pièces »).
			// Sans elle, le rail applique en silence pour un lecteur d'écran — le
			// panneau mobile, lui, a sa propre région vivante.
			countLive
			// Les cartes portent des `h3` : ce libellé comble le saut de niveau.
			listLabel="Liste des créations"
		/>
	);
}

/**
 * Miroir du bloc titre pour `ProductCatalogSkeleton`.
 *
 * Le `h1` réel n'attend rien, donc ce miroir n'est utilisé que par le
 * `loading.tsx` de la route — où la donnée du titre n'est pas encore là.
 * `accent="mono"` sur `/produits/[productTypeSlug]` : la page réelle rend une
 * touche unique (`accentForSlug`), et le `loading.tsx` n'en connaît pas la
 * couleur — la réservation neutre évite le flash quatre-couleurs → une.
 */
export function CatalogHeadingSkeleton({ accent = "rail" }: { accent?: "rail" | "mono" }) {
	// Touches et chapô réservés à tous les viewports ≥ `sm`, comme le bloc réel
	// (la compaction desktop a été retirée — audit /produits 2026-08-05, dir. B).
	//
	// `descriptionLines` : la racine (`accent="rail"`) rend TOUJOURS une copie
	// statique longue (109 c. → deux lignes dans le max-w-[42ch]) ; la page de
	// type (`accent="mono"`) rend la description de la BASE, courte (une ligne),
	// le repli long ne servant qu'aux types sans description — variance assumée,
	// un loading.tsx ne connaît pas plus la copie que la couleur.
	return <StorefrontHeadingSkeleton accent={accent} descriptionLines={accent === "rail" ? 2 : 1} />;
}
