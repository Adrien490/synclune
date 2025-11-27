"use server";

import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { updateTags } from "@/shared/lib/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { addressSchema } from "@/shared/schemas/address-schema";
import { ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address";

export async function updateAddress(
	addressId: string,
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const user = await getCurrentUser();

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: ADDRESS_ERROR_MESSAGES.NOT_AUTHENTICATED,
			};
		}

		const existingAddress = await prisma.address.findFirst({
			where: { id: addressId, userId: user.id },
			select: { id: true },
		});

		if (!existingAddress) {
			return {
				status: ActionStatus.ERROR,
				message: ADDRESS_ERROR_MESSAGES.NOT_FOUND,
			};
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

		const result = addressSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		await prisma.address.update({
			where: { id: addressId },
			data: result.data,
		});

		// Revalidation du cache avec tags
		updateTags(getUserAddressesInvalidationTags(user.id));

		return {
			status: ActionStatus.SUCCESS,
			message: "Adresse modifiée avec succès",
		};
	} catch (error) {
// console.error("Error updating address:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error ? error.message : ADDRESS_ERROR_MESSAGES.UPDATE_FAILED,
		};
	}
}
