"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { getStoreSettings } from "@/modules/store-settings/data/get-store-settings";
import { setFulfillmentModeSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour definir le mode de fulfillment du panier
 *
 * - SHIPPING : livraison domicile (defaut)
 * - CLICK_AND_COLLECT : retrait boutique (gated par StoreSettings.clickAndCollectEnabled)
 *
 * Rate limiting via CART_LIMITS.METADATA
 *
 * ⚠️ **Surface DORMANTE** (constat audit qualité métier 2026-07-26) : aucun
 * appelant côté UI à ce jour. Ce n'est PAS du code mort — le backend est complet
 * et cohérent (`Cart.fulfillmentType` + `StoreSettings.clickAndCollectEnabled`
 * existent en base, l'action est feature-gatée et couverte par
 * `__tests__/set-fulfillment-mode.test.ts`) : il attend son UI de sélection au
 * panier/checkout. Ne pas supprimer sur la seule constatation « unused ».
 *
 * Conséquence à connaître si l'UI est branchée : `order-creation.service.ts` pose
 * `shippingMethod: "STANDARD"` en dur et calcule TOUJOURS des frais de port via
 * `calculateShipping` — un panier CLICK_AND_COLLECT serait facturé la livraison.
 * Le branchement UI devra donc traiter le cas dans la création de commande.
 */
export async function setFulfillmentMode(
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

		const validated = validateInput(setFulfillmentModeSchema, {
			fulfillmentType: formData.get("fulfillmentType"),
		});
		if ("error" in validated) return validated.error;
		const { fulfillmentType } = validated.data;

		// Feature gate : CLICK_AND_COLLECT requiert que la logistique boutique soit opérationnelle.
		if (fulfillmentType === "CLICK_AND_COLLECT") {
			const settings = await getStoreSettings();
			if (!settings?.clickAndCollectEnabled) {
				return error("Le retrait en boutique n'est pas disponible pour le moment.");
			}
		}

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

		await prisma.cart.update({
			where: { id: cart.id },
			data: {
				fulfillmentType,
				updatedAt: new Date(),
			},
		});

		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		const label = fulfillmentType === "SHIPPING" ? "livraison à domicile" : "retrait en boutique";
		return success(`Mode ${label} enregistré`, { fulfillmentType });
	} catch (e) {
		return handleActionError(e, "Impossible de changer le mode de livraison");
	}
}
