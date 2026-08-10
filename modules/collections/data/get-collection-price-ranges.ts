import { PublicationStatus } from "@/app/generated/prisma/enums";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";

/**
 * Fourchette de prix TTC d'une collection, en centimes.
 *
 * `offerCount` = nombre de SKUs actifs ayant contribué à la fourchette. Il est
 * porté ici, et pas dérivé du compteur de produits de la carte, parce que les
 * deux ensembles DIFFÈRENT : `_count.products` compte les produits `PUBLIC` sans
 * aucune condition sur leurs SKUs, alors que la fourchette ne retient que ceux
 * qui ont au moins un SKU `isActive`. L'`AggregateOffer` publiait donc un
 * `offerCount` plus large que le `lowPrice`/`highPrice` qui l'accompagne (audit
 * CollectionCard 2026-08-05) — et au sens de schema.org, une offre est un SKU
 * achetable, pas un produit.
 */
export type CollectionPriceRange = { min: number; max: number; offerCount: number };

/**
 * Fourchette de prix par collection — calculée sur TOUS les produits publiés et
 * TOUS leurs SKUs actifs.
 *
 * ## Pourquoi une requête à part
 *
 * `GET_COLLECTIONS_SELECT` charge `products: { take: 4 }` (les 4 vignettes du
 * bento) et, dans chaque produit, `skus: { take: 1 }` trié `(position asc, id asc)`.
 * Dériver « À partir de X € » de ce payload — ce que faisait `extractPriceRange`
 * — donnait donc le minimum de **4 produits au plus, sur leur SKU par défaut**.
 * Une collection de vingt bijoux dont le moins cher n'était ni vedette ni récent
 * affichait un prix d'entrée SUPÉRIEUR au vrai, sur le signal de scan le plus
 * déterminant de la carte ; le même chiffre partait dans l'`AggregateOffer`
 * JSON-LD, avec un `offerCount` exact à côté (audit CollectionCard 2026-08-04).
 *
 * Élargir le `take` ne corrigeait rien : il faut l'ensemble des produits, et le
 * SKU le moins cher de chacun. Prisma ne sait pas agréger une relation imbriquée
 * dans un `select`, d'où cette seconde passe — pattern « wrapper » de CLAUDE.md :
 * la clé de cache, ce sont les arguments, ici une liste d'ids de catalogue pur.
 *
 * ## Cache
 *
 * Profil `catalog` (5 min revalidate) et non `reference` comme la liste des
 * collections : un prix est plus volatil qu'un nom de collection. Le tag
 * `PRODUCTS_CACHE_TAGS.LIST` est ce qui rend l'entrée auto-invalidante — il est
 * posé par `getProductInvalidationTags` ET par `getSkuInvalidationTags`, donc
 * toute mutation de prix la balaie.
 *
 * @param collectionIds - ids des collections affichées (l'ordre est indifférent,
 *   mais il fait partie de la clé de cache : appeler avec une liste stable).
 */
export async function getCollectionPriceRanges(
	collectionIds: string[],
): Promise<Record<string, CollectionPriceRange>> {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST, COLLECTIONS_CACHE_TAGS.LIST);

	if (collectionIds.length === 0) return {};

	const rows = await prisma.productCollection.findMany({
		where: {
			collectionId: { in: collectionIds },
			product: { status: PublicationStatus.PUBLIC, deletedAt: null },
		},
		select: {
			collectionId: true,
			product: {
				select: {
					skus: {
						where: { isActive: true },
						select: { priceInclTax: true },
					},
				},
			},
		},
	});

	const ranges: Record<string, CollectionPriceRange> = {};

	for (const row of rows) {
		for (const { priceInclTax } of row.product.skus) {
			const current = ranges[row.collectionId];

			if (!current) {
				ranges[row.collectionId] = { min: priceInclTax, max: priceInclTax, offerCount: 1 };
				continue;
			}

			if (priceInclTax < current.min) current.min = priceInclTax;
			if (priceInclTax > current.max) current.max = priceInclTax;
			current.offerCount += 1;
		}
	}

	return ranges;
}
