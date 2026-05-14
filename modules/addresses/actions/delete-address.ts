"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { addressIdSchema } from "../schemas/user-addresses.schemas";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";

export async function deleteAddress(
	_prev: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;
		const { user } = auth;

		const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.MUTATE);
		if ("error" in rateCheck) return rateCheck.error;

		const validation = validateInput(addressIdSchema, {
			addressId: formData.get("addressId"),
		});

		if ("error" in validation) {
			return validation.error;
		}

		const { addressId } = validation.data;

		const existingAddress = await prisma.address.findFirst({
			where: { id: addressId, userId: user.id },
			select: { id: true, isDefault: true },
		});

		if (!existingAddress) {
			return error(ADDRESS_ERROR_MESSAGES.NOT_FOUND);
		}

		// Hard-delete RGPD-safe : Order dénormalise les addresses (shippingFirstName,
		// shippingAddress1, billing*…) en VARCHAR snapshot. La rétention 10 ans
		// (Art. L123-22) est portée par Order.deletedAt, pas par Address.
		await prisma.$transaction(async (tx) => {
			// Pré-sélectionner l'éventuelle adresse à promouvoir (avant DELETE).
			const otherAddress = existingAddress.isDefault
				? await tx.address.findFirst({
						where: { userId: user.id, id: { not: addressId } },
						orderBy: { createdAt: "desc" },
						select: { id: true },
					})
				: null;

			// 1. DELETE d'abord pour libérer le slot (userId, isDefault=true) :
			// le partial unique index `Address_userId_isDefault_unique` est IMMEDIATE,
			// promouvoir une autre adresse avant le DELETE violerait la contrainte.
			await tx.address.delete({
				where: { id: addressId },
			});

			// 2. Promouvoir la nouvelle adresse par défaut si applicable.
			if (otherAddress) {
				await tx.address.update({
					where: { id: otherAddress.id },
					data: { isDefault: true },
				});
			}
		});

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach((tag) => updateTag(tag));

		return success("Adresse supprimée avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de l'adresse");
	}
}
