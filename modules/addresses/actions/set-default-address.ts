"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";
import { BusinessError, validateInput, handleActionError, success } from "@/shared/lib/actions";
import { addressIdSchema } from "../schemas/user-addresses.schemas";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";

export async function setDefaultAddress(
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

		await prisma.$transaction(async (tx) => {
			const existingAddress = await tx.address.findFirst({
				where: { id: addressId, userId: user.id },
				select: { id: true },
			});

			if (!existingAddress) {
				throw new BusinessError(ADDRESS_ERROR_MESSAGES.NOT_FOUND);
			}

			await tx.address.updateMany({
				where: { userId: user.id },
				data: { isDefault: false },
			});
			await tx.address.update({
				where: { id: addressId },
				data: { isDefault: true },
			});
		});

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return success("Adresse par defaut modifiee");
	} catch (e) {
		return handleActionError(e, "Erreur lors du changement d'adresse par défaut");
	}
}
