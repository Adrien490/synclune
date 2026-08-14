"use server";

import { prisma } from "@/shared/lib/prisma";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { toggleWishlistItemSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
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
 * Server Action pour toggle un article dans les favoris
 * Si présent → retire, si absent → ajoute
 *
 * La wishlist vit entièrement dans le cookie `wishlist` (retrait de la base
 * 2026-08-03) : la mutation est une réécriture du cookie, seule la validation
 * « produit PUBLIC » à l'ajout touche la DB. Pas d'invalidation de cache —
 * poser le cookie déclenche déjà le re-rendu avec la nouvelle valeur, et la
 * matérialisation produits est cachée sur les ARGUMENTS (nouvelle liste =
 * nouvelle clé).
 *
 * Pattern:
 * 1. Rate limiting (protection anti-spam)
 * 2. Validation des données (Zod)
 * 3. Lecture du cookie → retrait ou ajout (cap + produit PUBLIC)
 * 4. Réécriture du cookie (maxAge glissant)
 */
export async function toggleWishlistItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting (protection anti-spam) — before validation to prevent enumeration
		const rateCheck = await enforceRateLimitForCurrentUser(WISHLIST_LIMITS.TOGGLE);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Validation avec Zod
		const validated = validateInput(toggleWishlistItemSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const { productId } = validated.data;

		// 3. Le cookie est la SSOT — lecture validée (forme cuid2, dédup, cap)
		const ids = await readWishlistCookie();

		// Path "remove" : présent → retire
		if (ids.includes(productId)) {
			await writeWishlistCookie(ids.filter((id) => id !== productId));
			return success("Retiré de tes favoris", { action: "removed" as const });
		}

		// Path "add" : cap puis validation produit — un id n'entre dans le
		// cookie que s'il désigne un produit réellement PUBLIC (sinon n'importe
		// quel cuid2 forgé gonflerait la liste et le badge).
		if (ids.length >= WISHLIST_MAX_ITEMS) {
			return error(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		}

		const product = await prisma.product.findUnique({
			where: { id: productId, status: "PUBLIC", deletedAt: null },
			select: { id: true },
		});
		if (!product) {
			return error(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		// 4. Plus récent en premier — l'ordre du cookie est l'ordre d'affichage
		await writeWishlistCookie([productId, ...ids]);

		return success("Ajouté à tes favoris", { action: "added" as const });
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
