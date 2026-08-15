"use server";

import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { addToWishlistSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import { readWishlistCookie, writeWishlistCookie } from "@/modules/wishlist/lib/wishlist-cookie";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";

/**
 * Server Action pour ajouter un article aux favoris
 * Compatible avec useActionState de React 19
 *
 * Idempotente : un produit déjà présent est un succès (« Déjà dans tes
 * favoris ») — c'est le chemin de l'undo toast après un retrait.
 *
 * La wishlist vit entièrement dans le cookie `wishlist` (retrait de la base
 * 2026-08-03) — voir `toggle-wishlist-item.ts` pour le rationale complet.
 */
export async function addToWishlist(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting (protection anti-spam) — before validation to prevent enumeration

		// 2. Validation avec Zod
		const validated = validateInput(addToWishlistSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const { productId } = validated.data;

		// 3. Le cookie est la SSOT — lecture validée (forme cuid2, dédup, cap)
		const ids = await readWishlistCookie();

		if (ids.includes(productId)) {
			return success("Déjà dans tes favoris");
		}

		if (ids.length >= WISHLIST_MAX_ITEMS) {
			return error(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		}

		// Un id n'entre dans le cookie que s'il désigne un produit PUBLIC
		const product = await prisma.product.findUnique({
			where: { id: productId, active: true },
			select: { id: true },
		});
		if (!product) {
			return error(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		// 4. Plus récent en premier — l'ordre du cookie est l'ordre d'affichage
		await writeWishlistCookie([productId, ...ids]);

		return success("Ajouté à tes favoris");
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
