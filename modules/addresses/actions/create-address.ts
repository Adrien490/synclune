"use server";

import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { addressSchema } from "@/shared/schemas/address-schema";
import { ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";

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
		const user = await getCurrentUser();

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: ADDRESS_ERROR_MESSAGES.NOT_AUTHENTICATED,
			};
		}

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
	} catch (error) {
// console.error("Error creating address:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: ADDRESS_ERROR_MESSAGES.CREATE_FAILED,
		};
	}
}
