"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { addressSchema } from "@/shared/schemas/address-schema";
import { ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";

export async function updateAddress(
	addressId: string,
	_: ActionState | undefined,
	formData: FormData,
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
			firstName: safeFormGet(formData, "firstName"),
			lastName: safeFormGet(formData, "lastName"),
			address1: safeFormGet(formData, "address1"),
			address2: safeFormGet(formData, "address2") ?? null,
			postalCode: safeFormGet(formData, "postalCode"),
			city: safeFormGet(formData, "city"),
			country: safeFormGet(formData, "country") ?? "FR",
			phone: safeFormGet(formData, "phone"),
		};

		const validated = validateInput(addressSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Sanitize text fields
		validatedData.firstName = sanitizeText(validatedData.firstName);
		validatedData.lastName = sanitizeText(validatedData.lastName);
		validatedData.address1 = sanitizeText(validatedData.address1);
		if (validatedData.address2) {
			validatedData.address2 = sanitizeText(validatedData.address2);
		}
		validatedData.city = sanitizeText(validatedData.city);

		await prisma.address.updateMany({
			where: { id: addressId, userId: user.id },
			data: validatedData,
		});

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach((tag) => updateTag(tag));

		return success("Adresse modifiee avec succes");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification de l'adresse");
	}
}
