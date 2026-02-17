"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { addressSchema } from "@/shared/schemas/address-schema";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";

const MAX_ADDRESSES_PER_USER = 10;
const ADDRESS_LIMIT_ERROR = `Vous ne pouvez pas enregistrer plus de ${MAX_ADDRESSES_PER_USER} adresses`;

class LimitExceededError extends Error {}

/**
 * Server Action pour créer une nouvelle adresse
 * Compatible avec useActionState de React 19
 */
export async function createAddress(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification de l'authentification
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;
		const { user } = auth;

		// 1b. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.MUTATE);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Extraction des données du FormData
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

		// 3. Validation avec Zod
		const validated = validateInput(addressSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Sanitize text fields
		validatedData.firstName = sanitizeText(validatedData.firstName);
		validatedData.lastName = sanitizeText(validatedData.lastName);
		validatedData.address1 = sanitizeText(validatedData.address1);
		if (validatedData.address2) {
			validatedData.address2 = sanitizeText(validatedData.address2);
		}
		validatedData.city = sanitizeText(validatedData.city);

		// 5. Count + create in transaction to prevent race conditions
		const { isDefault } = await prisma.$transaction(async (tx) => {
			const addressCount = await tx.address.count({
				where: { userId: user.id },
			});

			if (addressCount >= MAX_ADDRESSES_PER_USER) {
				throw new LimitExceededError();
			}

			const isFirst = addressCount === 0;

			await tx.address.create({
				data: {
					...validatedData,
					userId: user.id,
					isDefault: isFirst,
				},
			});

			return { isDefault: isFirst };
		});

		// 6. Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return success(
			isDefault
				? "Adresse ajoutee et definie comme adresse par defaut"
				: "Adresse ajoutee avec succes"
		);
	} catch (e) {
		if (e instanceof LimitExceededError) {
			return error(ADDRESS_LIMIT_ERROR);
		}
		return handleActionError(e, "Erreur lors de la création de l'adresse");
	}
}
