"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { addressSchema } from "@/shared/schemas/address-schema";
import {
	validateInput,
	handleActionError,
	success,
	safeFormGet,
	BusinessError,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";
import { ADDRESS_LIMIT_ERROR } from "../constants/address.constants";
import { saveAddressInTransaction } from "../services/save-address.service";

/**
 * Server Action pour créer une nouvelle adresse
 * Compatible avec useActionState de React 19
 */
export async function createAddress(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;
		const { user } = auth;

		const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.MUTATE);
		if ("error" in rateCheck) return rateCheck.error;

		const rawData = {
			firstName: safeFormGet(formData, "firstName"),
			lastName: safeFormGet(formData, "lastName"),
			address1: safeFormGet(formData, "address1"),
			address2: safeFormGet(formData, "address2") ?? null,
			postalCode: safeFormGet(formData, "postalCode"),
			city: safeFormGet(formData, "city"),
			country: safeFormGet(formData, "country"),
			phone: safeFormGet(formData, "phone"),
		};

		const validated = validateInput(addressSchema, rawData);
		if ("error" in validated) return validated.error;

		const result = await prisma.$transaction((tx) =>
			saveAddressInTransaction(tx, user.id, validated.data),
		);

		if (!result.saved) {
			throw new BusinessError(ADDRESS_LIMIT_ERROR);
		}

		getUserAddressesInvalidationTags(user.id).forEach((tag) => updateTag(tag));

		return success(
			result.isDefault
				? "Adresse ajoutée et définie comme adresse par défaut"
				: "Adresse ajoutée avec succès",
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la création de l'adresse");
	}
}
