"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { setGuestContactInfoSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour capturer les infos contact d'un panier guest
 *
 * Debloque le cron `abandoned-cart-emails` pour les guests (sans compte).
 * Le champ marketingConsent est utilise pour consentement RGPD explicite.
 *
 * Pour les users connectes, on ignore le call (leur email est deja sur User).
 *
 * Rate limiting configure via CART_LIMITS.METADATA
 */
export async function setGuestContactInfo(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.METADATA, {
			createSessionIfMissing: true,
		});
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		// Users connectes: pas de capture guest necessaire
		if (userId) {
			return success("Infos de contact utilisateur utilisees", { usedUserAccount: true });
		}

		if (!sessionId) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		// Validation
		const rawData = {
			email: formData.get("email") ?? "",
			phone: formData.get("phone") ?? "",
			marketingConsent: formData.get("marketingConsent") === "true",
		};
		const validated = validateInput(setGuestContactInfoSchema, rawData);
		if ("error" in validated) return validated.error;
		const { email, phone, marketingConsent } = validated.data;

		// Recuperer ou creer le panier guest
		const cart = await prisma.cart.findFirst({
			where: { sessionId },
			select: { id: true },
		});

		if (!cart) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		await prisma.cart.update({
			where: { id: cart.id },
			data: {
				guestEmail: email,
				guestPhone: phone ?? null,
				marketingConsent,
				guestContactAt: new Date(),
				updatedAt: new Date(),
			},
		});

		const tags = getCartInvalidationTags(undefined, sessionId);
		tags.forEach((tag) => updateTag(tag));

		return success("Infos de contact enregistrées", { email, marketingConsent });
	} catch (e) {
		return handleActionError(e, "Impossible d'enregistrer les infos de contact");
	}
}
