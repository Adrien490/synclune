"use server";

import { getSession } from "@/shared/utils/get-session";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";
import { removeFromCartSchema } from "../schemas/cart.schemas";

/**
 * Server Action pour supprimer un article du panier
 * Compatible with useActionState de React 19
 *
 * Rate limiting configuré via CART_LIMITS.REMOVE
 */
export async function removeFromCart(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting (protection anti-spam)
		const session = await getSession();
		const userId = session?.user?.id;
		const sessionId = !userId ? await getCartSessionId() : null;
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(userId, sessionId || null, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, CART_LIMITS.REMOVE);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: rateLimit.error || "Trop de requêtes. Veuillez réessayer plus tard.",
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			};
		}

		// 2. Extraction des données du FormData
		const rawData = {
			cartItemId: formData.get("cartItemId") as string,
		};

		// 3. Validation avec Zod
		const result = removeFromCartSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = result.data;

		// 4. Récupérer l'item avec son panier
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: validatedData.cartItemId },
			include: {
				cart: true,
			},
		});

		if (!cartItem) {
			return { status: ActionStatus.ERROR, message: "Article introuvable dans le panier" };
		}

		// 5. Vérifier l'appartenance du panier

		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;

		if (!isOwner) {
			return { status: ActionStatus.ERROR, message: "Accès non autorisé" };
		}

		// 6. Supprimer l'item du panier
		await prisma.$transaction(async (tx) => {
			await tx.cartItem.delete({
				where: { id: validatedData.cartItemId },
			});

			await tx.cart.update({
				where: { id: cartItem.cartId },
				data: {
					updatedAt: new Date(),
				},
			});
		});

		// 7. Invalider le cache
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		// 8. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: "Article supprimé du panier",
		};
	} catch (e) {
		// Error handling
		// console.error("[REMOVE_FROM_CART] Error:", e);
		if (e instanceof Error) {
			// console.error("[REMOVE_FROM_CART] Error message:", e.message);
			// console.error("[REMOVE_FROM_CART] Error stack:", e.stack);
		}

		return {
			status: ActionStatus.ERROR,
			message: e instanceof Error ? e.message : "Une erreur est survenue lors de la suppression",
		};
	}
}
