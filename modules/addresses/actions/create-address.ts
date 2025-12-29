"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { addressSchema } from "@/shared/schemas/address-schema";
import { handleActionError } from "@/shared/lib/actions";

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
		const result = addressSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = result.data;

		// 4. Vérifier si c'est la première adresse (définir par défaut)
		const addressCount = await prisma.address.count({
			where: { userId: user.id },
		});

		const isDefault = addressCount === 0;

		// 5. Créer l'adresse
		await prisma.address.create({
			data: {
				...validatedData,
				userId: user.id,
				isDefault,
			},
		});

		// 6. Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: isDefault
				? "Adresse ajoutée et définie comme adresse par défaut"
				: "Adresse ajoutée avec succès",
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la création de l'adresse");
	}
}
