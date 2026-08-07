import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

import { buildCatalogJsonLd } from "../_utils/catalog";

export type CatalogJsonLdOptions = {
	name: string;
	description: string;
	url: string;
	breadcrumbs: Array<{ name: string; url?: string }>;
};

type CatalogJsonLdProps = {
	/**
	 * Promesse du catalogue — la MÊME que celle passée à `ProductCatalog`, donc
	 * aucune requête supplémentaire.
	 */
	productsPromise: Promise<GetProductsReturn>;
	/**
	 * Libellés du nœud `CollectionPage`. Promesse parce que sur la route
	 * catégorie ils dérivent de `params` + du type en base — la page ne doit
	 * awaiter ni l'un ni l'autre.
	 */
	optionsPromise: Promise<CatalogJsonLdOptions>;
};

/**
 * Le balisage structuré des deux pages catalogue, **streamé**.
 *
 * @description
 * L'`ItemList` a besoin des produits ; jusqu'ici les deux `page.tsx` awaitaient
 * `productsPromise` pour le construire, AVANT de rendre quoi que ce soit. Sous
 * `cacheComponents`, ce `await` au niveau supérieur rendait la page entièrement
 * dynamique : plus rien ne pouvait être streamé avant la fin de la requête
 * catalogue (réveil Neon compris), et la frontière `Suspense` de la grille était
 * court-circuitée. À la navigation, l'utilisatrice voyait le `loading.tsx` —
 * un squelette PLEINE PAGE — pendant toute cette durée.
 *
 * Déplacer l'`await` ici le met derrière la frontière `Suspense` du shell : le
 * reste de la page part immédiatement, le script arrive dans la même réponse
 * streamée (Googlebot lit la réponse complète, l'indexation n'y perd rien).
 *
 * ⚠️ **Un seul `<script type="application/ld+json">` par URL.** La
 * `BreadcrumbList` et l'`ItemList` restent imbriquées dans le même
 * `CollectionPage` produit par `buildCatalogJsonLd` — les séparer en deux
 * scripts ré-ouvrirait le défaut que verrouille
 * `catalogue-single-breadcrumb.regression.test.ts`.
 */
export async function CatalogJsonLd({ productsPromise, optionsPromise }: CatalogJsonLdProps) {
	const [{ products }, options] = await Promise.all([productsPromise, optionsPromise]);

	const jsonLd = buildCatalogJsonLd({ ...options, products });

	// SAFE: sérialisé par `safeJsonLd` (pas de HTML utilisateur).
	// react-doctor-disable-next-line react/no-danger
	return (
		<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
	);
}
