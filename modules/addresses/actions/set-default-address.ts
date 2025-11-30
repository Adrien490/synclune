"use server";

import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { ADDRESS_ERROR_MESSAGES } from "../constants/address";

export async function setDefaultAddress(
	_prev: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const addressId = formData.get("addressId") as string;

	if (!addressId) {
		return {
			status: ActionStatus.ERROR,
			message: "ID d'adresse manquant",
		};
	}
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

		await prisma.$transaction([
			prisma.address.updateMany({
				where: { userId: user.id },
				data: { isDefault: false },
			}),
			prisma.address.update({
				where: { id: addressId },
				data: { isDefault: true },
			}),
		]);

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Adresse par défaut modifiée",
		};
	} catch (error) {
// console.error("Error setting default address:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error ? error.message : ADDRESS_ERROR_MESSAGES.SET_DEFAULT_FAILED,
		};
	}
}
