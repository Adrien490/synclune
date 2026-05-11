"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { setCartNotesSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour enregistrer des notes/instructions sur le panier
 *
 * Use case : demandes speciales (gravure, personnalisation, cadeau emballe separement)
 *
 * Rate limiting via CART_LIMITS.METADATA
 */
export async function setCartNotes(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.METADATA);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		if (!userId && !sessionId) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		const rawNotes = formData.get("notes");
		const validated = validateInput(setCartNotesSchema, {
			notes: typeof rawNotes === "string" ? rawNotes : "",
		});
		if ("error" in validated) return validated.error;
		const { notes } = validated.data;

		const cart = await prisma.cart.findFirst({
			where: {
				...(userId ? { userId } : { sessionId: sessionId! }),
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			select: { id: true },
		});

		if (!cart) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		const trimmed = notes.trim();
		await prisma.cart.update({
			where: { id: cart.id },
			data: {
				notes: trimmed === "" ? null : trimmed,
				updatedAt: new Date(),
			},
		});

		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		return success(trimmed === "" ? "Notes supprimées" : "Notes enregistrées", {
			notes: trimmed || null,
		});
	} catch (e) {
		return handleActionError(e, "Impossible d'enregistrer les notes");
	}
}
