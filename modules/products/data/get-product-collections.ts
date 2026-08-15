"use server";

import { z } from "zod";

import { logger } from "@/shared/lib/logger";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
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
	rawProductId: unknown,
): Promise<{ id: string; name: string }[]> {
	if (!(await isAdmin())) {
		return [];
	}

	// Endpoint RPC (cf. l'avertissement ci-dessus) : `productId: string` n'était
	// qu'une annotation. La valeur part à la fois dans un `where` Prisma et dans un
	// `cacheTag(...)` — une chaîne arbitraire y créerait des entrées de cache sans
	// borne. Admin-only, donc pas une faille, mais rien ne justifie de s'en remettre
	// au type ici plutôt qu'au parse.
	const parsed = z.cuid2().safeParse(rawProductId);
	if (!parsed.success) return [];
	const productId = parsed.data;

	// Repli HORS du scope de cache : le profil est `reference` (7 j stale /
	// 24 h revalidate), donc une liste vide de panne y restait affichée jusqu'au
	// lendemain — le formulaire admin montrait « aucune collection » et laissait
	// l'admin en détacher le produit sans le savoir.
	try {
		return await fetchProductCollections(productId);
	} catch (error) {
		logger.error("Failed to fetch product collections", error, {
			service: "getProductCollections",
		});
		return [];
	}
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

	// Repli HORS du scope de cache (cf. `getProductCollections`).
	try {
		return await fetchAllCollections();
	} catch (error) {
		logger.error("Failed to fetch all collections", error, { service: "getAllCollections" });
		return [];
	}
}

async function fetchProductCollections(productId: string): Promise<{ id: string; name: string }[]> {
	"use cache";
	cacheLife("reference");
	cacheTag(PRODUCTS_CACHE_TAGS.COLLECTIONS(productId), COLLECTIONS_CACHE_TAGS.LIST);

	// M-N implicite : on lit les collections du produit directement.
	const product = await prisma.product.findUnique({
		where: { id: productId },
		select: {
			collections: {
				select: { id: true, name: true },
			},
		},
	});

	return product?.collections ?? [];
}

async function fetchAllCollections(): Promise<{ id: string; name: string }[]> {
	"use cache";
	cacheLife("reference");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	return prisma.collection.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
}
