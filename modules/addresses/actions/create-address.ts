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
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";
import { MAX_ADDRESSES_PER_USER, ADDRESS_LIMIT_ERROR } from "../constants/address.constants";

class LimitExceededError extends Error {}

/**
 * Server Action pour créer une nouvelle adresse
 * Compatible avec useActionState de React 19
 */
export async function createAddress(
	_: ActionState | undefined,
	formData: FormData,
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
			firstName: safeFormGet(formData, "firstName"),
			lastName: safeFormGet(formData, "lastName"),
			address1: safeFormGet(formData, "address1"),
			address2: safeFormGet(formData, "address2") ?? null,
			postalCode: safeFormGet(formData, "postalCode"),
			city: safeFormGet(formData, "city"),
			country: safeFormGet(formData, "country") ?? "FR",
			phone: safeFormGet(formData, "phone"),
		};

		// 3. Validation avec Zod
		const validated = validateInput(addressSchema, rawData);
		if ("error" in validated) return validated.error;

		// 4. Sanitize text fields
		const sanitizedData = {
			...validated.data,
			firstName: sanitizeText(validated.data.firstName),
			lastName: sanitizeText(validated.data.lastName),
			address1: sanitizeText(validated.data.address1),
			address2: validated.data.address2 ? sanitizeText(validated.data.address2) : null,
			city: sanitizeText(validated.data.city),
		};

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
					...sanitizedData,
					userId: user.id,
					isDefault: isFirst,
				},
			});

			return { isDefault: isFirst };
		});

		// 6. Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach((tag) => updateTag(tag));

		return success(
			isDefault
				? "Adresse ajoutée et définie comme adresse par défaut"
				: "Adresse ajoutée avec succès",
		);
	} catch (e) {
		if (e instanceof LimitExceededError) {
			return error(ADDRESS_LIMIT_ERROR);
		}
		return handleActionError(e, "Erreur lors de la création de l'adresse");
	}
}
