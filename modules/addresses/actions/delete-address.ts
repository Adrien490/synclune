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
	formData: FormData
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

		// Utiliser une transaction pour garantir l'intégrité
		await prisma.$transaction(async (tx) => {
			// Si adresse par défaut, assigner le défaut à une autre adresse si elle existe
			if (existingAddress.isDefault) {
				const otherAddress = await tx.address.findFirst({
					where: { userId: user.id, id: { not: addressId } },
					orderBy: { createdAt: "desc" },
				});

				// Si une autre adresse existe, la définir comme nouvelle adresse par défaut
				if (otherAddress) {
					await tx.address.update({
						where: { id: otherAddress.id },
						data: { isDefault: true },
					});
				}
				// Sinon, l'utilisateur n'aura plus d'adresse par défaut (acceptable)
			}

			await tx.address.delete({
				where: { id: addressId },
			});
		});

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return success("Adresse supprimee avec succes");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de l'adresse");
	}
}
