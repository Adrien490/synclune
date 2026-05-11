"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	forbidden,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { setGiftOptionsSchema } from "../schemas/cart.schemas";

/**
 * Server Action pour configurer les options cadeau d'un item
 *
 * Bijoux artisanaux = panier premium -> gift wrapping + gift message
 * differencient l'offre et justifient un supplement futur.
 *
 * Rate limiting via CART_LIMITS.METADATA
 */
export async function setGiftOptions(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.METADATA);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		const rawData = {
			cartItemId: safeFormGet(formData, "cartItemId"),
			giftWrap: formData.get("giftWrap") === "true",
			giftMessage: formData.get("giftMessage") ?? "",
		};
		const validated = validateInput(setGiftOptionsSchema, rawData);
		if ("error" in validated) return validated.error;
		const { cartItemId, giftWrap, giftMessage } = validated.data;

		// Ownership check (incluant validation du cart parent non expiré)
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: cartItemId },
			select: {
				id: true,
				cartId: true,
				cart: { select: { userId: true, sessionId: true, expiresAt: true } },
			},
		});

		if (!cartItem) {
			return forbidden();
		}

		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;
		if (!isOwner) {
			return forbidden();
		}

		// Reject if parent cart is expired (consistent with other cart reads)
		if (cartItem.cart.expiresAt && cartItem.cart.expiresAt <= new Date()) {
			return forbidden();
		}

		await prisma.$transaction(async (tx) => {
			await tx.cartItem.update({
				where: { id: cartItemId },
				data: {
					giftWrap,
					giftMessage: giftMessage ?? null,
				},
			});
			await tx.cart.update({
				where: { id: cartItem.cartId },
				data: { updatedAt: new Date() },
			});
		});

		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		return success(giftWrap ? "Options cadeau enregistrées" : "Options cadeau retirées", {
			giftWrap,
			giftMessage: giftMessage ?? null,
		});
	} catch (e) {
		return handleActionError(e, "Impossible d'enregistrer les options cadeau");
	}
}
