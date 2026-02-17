"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { addressSchema } from "@/shared/schemas/address-schema";
import { ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";

export async function updateAddress(
	addressId: string,
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;
		const { user } = auth;

		const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.MUTATE);
		if ("error" in rateCheck) return rateCheck.error;

		const existingAddress = await prisma.address.findFirst({
			where: { id: addressId, userId: user.id },
			select: { id: true },
		});

		if (!existingAddress) {
			return error(ADDRESS_ERROR_MESSAGES.NOT_FOUND);
		}

		const rawData = {
			firstName: formData.get("firstName") as string,
			lastName: formData.get("lastName") as string,
			address1: formData.get("address1") as string,
			address2: (formData.get("address2") as string) || null,
			postalCode: formData.get("postalCode") as string,
			city: formData.get("city") as string,
			country: (formData.get("country") as string) || "FR",
			phone: formData.get("phone") as string,
		};

		const validated = validateInput(addressSchema, rawData);
		if ("error" in validated) return validated.error;

		await prisma.address.update({
			where: { id: addressId },
			data: validated.data,
		});

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return success("Adresse modifiee avec succes");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification de l'adresse");
	}
}
