"use server";

import { logger } from "@/shared/lib/logger";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { COLLECTIONS_CACHE_TAGS } from "@/modules/collections/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

/*
 * Données du formulaire produit admin (rattachement à des collections).
 *
 * ⚠️ Le `"use server"` ci-dessus est PORTANT, ne pas le retirer : le consommateur
 * `components/admin/manage-collections-dialog.tsx` est un composant CLIENT qui appelle
 * ces deux fonctions depuis un `useEffect`. Sans la directive, l'import tirerait Prisma
 * dans un chunk navigateur et casserait le build.
 *
 * Corollaire : les deux exports sont des endpoints RPC. Ils n'avaient AUCUNE garde,
 * alors que `getAllCollections` ne filtre pas le statut et rend donc les noms des
 * collections DRAFT et ARCHIVED. D'où le `isAdmin()` sur chacune — c'est la garde qui
 * remplace ici l'isolement qu'un fichier `data/` non exposé aurait offert.
 */

/**
 * Collections auxquelles un produit est rattaché. Admin uniquement.
 */
export async function getProductCollections(
	productId: string,
): Promise<{ id: string; name: string }[]> {
	if (!(await isAdmin())) {
		return [];
	}

	return fetchProductCollections(productId);
}

/**
 * Toutes les collections, TOUS STATUTS confondus. Admin uniquement.
 *
 * Le statut n'est volontairement pas filtré : le formulaire admin doit pouvoir
 * rattacher un produit à une collection encore en DRAFT.
 */
export async function getAllCollections(): Promise<{ id: string; name: string }[]> {
	if (!(await isAdmin())) {
		return [];
	}

	return fetchAllCollections();
}

async function fetchProductCollections(productId: string): Promise<{ id: string; name: string }[]> {
	"use cache";
	cacheLife("reference");
	cacheTag(PRODUCTS_CACHE_TAGS.COLLECTIONS(productId), COLLECTIONS_CACHE_TAGS.LIST);

	try {
		const productCollections = await prisma.productCollection.findMany({
			where: { productId },
			select: {
				collection: {
					select: { id: true, name: true },
				},
			},
		});

		return productCollections.map((pc) => ({
			id: pc.collection.id,
			name: pc.collection.name,
		}));
	} catch (error) {
		logger.error("Failed to fetch product collections", error, {
			service: "fetchProductCollections",
		});
		return [];
	}
}

async function fetchAllCollections(): Promise<{ id: string; name: string }[]> {
	"use cache";
	cacheLife("reference");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	try {
		const collections = await prisma.collection.findMany({
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		});

		return collections;
	} catch (error) {
		logger.error("Failed to fetch all collections", error, { service: "fetchAllCollections" });
		return [];
	}
}
